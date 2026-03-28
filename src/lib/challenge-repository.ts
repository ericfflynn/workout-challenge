import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Challenge,
  ChallengeBundle,
  ChallengeSummary,
  HomePageBundle,
  Session,
} from "@/lib/types";

type ChallengeRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  exercise_type: "pushups";
  week_number: number;
  start_at: string;
  end_at: string;
};

type ParticipantRow = {
  id: string;
  display_name: string;
  is_active: boolean;
};

type SetRow = {
  id: string;
  session_id: string;
  set_order: number;
  reps: number;
};

type SessionRow = {
  id: string;
  challenge_id: string;
  participant_id: string;
  submitted_at: string;
  created_at: string;
  sets: SetRow[] | null;
};

export async function getActiveChallengeBundle(): Promise<ChallengeBundle | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const latestChallenge = await getActiveOrLatestChallengeRow(supabase);

  if (!latestChallenge) {
    return null;
  }

  return getChallengeBundleFromRow(latestChallenge);
}

export async function getHomePageBundle(): Promise<HomePageBundle | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const [challengeRow, collections] = await Promise.all([
    getActiveOrLatestChallengeRow(supabase),
    getSharedCollections(supabase, undefined),
  ]);

  return {
    challenge: challengeRow ? mapChallengeRow(challengeRow) : null,
    challenges: collections.challenges,
    participants: collections.participants,
    sessions: collections.sessions,
  };
}

export async function getChallengeBundleBySlug(
  slug: string,
): Promise<ChallengeBundle | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("id, slug, title, description, exercise_type, week_number, start_at, end_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load challenge "${slug}": ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return getChallengeBundleFromRow(data);
}

async function getChallengeBundleFromRow(
  challengeRow: ChallengeRow,
): Promise<ChallengeBundle> {
  const supabase = getSupabaseClient();
  const collections = await getSharedCollections(supabase, challengeRow.id);

  return {
    challenge: mapChallengeRow(challengeRow),
    challenges: collections.challenges,
    participants: collections.participants,
    sessions: collections.sessions,
  };
}

async function getActiveOrLatestChallengeRow(
  supabase: ReturnType<typeof getSupabaseClient>,
): Promise<ChallengeRow | null> {
  const now = new Date().toISOString();
  const { data: activeChallenge, error } = await supabase
    .from("challenges")
    .select("id, slug, title, description, exercise_type, week_number, start_at, end_at")
    .lte("start_at", now)
    .gte("end_at", now)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load the active challenge: ${error.message}`);
  }

  if (activeChallenge) {
    return activeChallenge as ChallengeRow;
  }

  const { data: latestChallenge, error: latestChallengeError } = await supabase
    .from("challenges")
    .select("id, slug, title, description, exercise_type, week_number, start_at, end_at")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestChallengeError) {
    throw new Error(
      `Failed to load the latest challenge: ${latestChallengeError.message}`,
    );
  }

  return (latestChallenge as ChallengeRow | null) ?? null;
}

async function getSharedCollections(
  supabase: ReturnType<typeof getSupabaseClient>,
  challengeId?: string,
) {
  const sessionsQuery = supabase
    .from("sessions")
    .select(
      "id, challenge_id, participant_id, submitted_at, created_at, sets(id, session_id, set_order, reps)",
    )
    .order("submitted_at", { ascending: true });

  if (challengeId) {
    sessionsQuery.eq("challenge_id", challengeId);
  }

  const [
    { data: challengeRows, error: challengesError },
    { data: participantRows, error: participantsError },
    { data: sessionRows, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("challenges")
      .select("id, slug, title, description, exercise_type, week_number, start_at, end_at")
      .order("start_at", { ascending: false }),
    supabase
      .from("participants")
      .select("id, display_name, is_active")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
    sessionsQuery,
  ]);

  if (challengesError) {
    throw new Error(`Failed to load challenge history: ${challengesError.message}`);
  }

  if (participantsError) {
    throw new Error(`Failed to load participants: ${participantsError.message}`);
  }

  if (sessionsError) {
    throw new Error(`Failed to load sessions: ${sessionsError.message}`);
  }

  return {
    challenges: ((challengeRows ?? []) as ChallengeRow[]).map(mapChallengeSummaryRow),
    participants: ((participantRows ?? []) as ParticipantRow[]).map((participant) => ({
      id: participant.id,
      displayName: participant.display_name,
      isActive: participant.is_active,
    })),
    sessions: ((sessionRows ?? []) as SessionRow[]).map(mapSessionRow),
  };
}

function mapChallengeRow(challenge: ChallengeRow): Challenge {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description ?? "",
    exerciseType: challenge.exercise_type,
    weekNumber: challenge.week_number,
    startAt: challenge.start_at,
    endAt: challenge.end_at,
  };
}

function mapChallengeSummaryRow(challenge: ChallengeRow): ChallengeSummary {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    weekNumber: challenge.week_number,
    startAt: challenge.start_at,
    endAt: challenge.end_at,
  };
}

function mapSessionRow(session: SessionRow): Session {
  return {
    id: session.id,
    challengeId: session.challenge_id,
    participantId: session.participant_id,
    submittedAt: session.submitted_at,
    createdAt: session.created_at,
    sets: [...(session.sets ?? [])]
      .sort((left, right) => left.set_order - right.set_order)
      .map((set) => ({
        id: set.id,
        sessionId: set.session_id,
        setOrder: set.set_order,
        reps: set.reps,
      })),
  };
}
