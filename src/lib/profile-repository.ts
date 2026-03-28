import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { ChallengeSummary, ParticipantProfileBundle, ProfileSession } from "@/lib/types";

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

type ChallengeSummaryRow = {
  id: string;
  slug: string;
  title: string;
  week_number: number;
  start_at: string;
  end_at: string;
};

type SessionWithChallengeRow = {
  id: string;
  challenge_id: string;
  participant_id: string;
  submitted_at: string;
  created_at: string;
  sets: SetRow[] | null;
  challenge: ChallengeSummaryRow | ChallengeSummaryRow[] | null;
};

export async function getParticipantProfileBundle(
  participantId: string,
): Promise<ParticipantProfileBundle | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const [
    { data: participantRow, error: participantError },
    { data: participantRows, error: participantsError },
    { data: sessionRows, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("participants")
      .select("id, display_name, is_active")
      .eq("id", participantId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("participants")
      .select("id, display_name, is_active")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
    supabase
      .from("sessions")
      .select(
        "id, challenge_id, participant_id, submitted_at, created_at, sets(id, session_id, set_order, reps), challenge:challenges(id, slug, title, week_number, start_at, end_at)",
      )
      .eq("participant_id", participantId)
      .order("submitted_at", { ascending: false }),
  ]);

  if (participantError) {
    throw new Error(`Failed to load participant profile: ${participantError.message}`);
  }

  if (participantsError) {
    throw new Error(`Failed to load participants: ${participantsError.message}`);
  }

  if (sessionsError) {
    throw new Error(`Failed to load participant sessions: ${sessionsError.message}`);
  }

  const participant = participantRow as ParticipantRow | null;

  if (!participant) {
    return null;
  }

  return {
    participant: {
      id: participant.id,
      displayName: participant.display_name,
      isActive: participant.is_active,
    },
    participants: ((participantRows ?? []) as ParticipantRow[]).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      isActive: row.is_active,
    })),
    sessions: ((sessionRows ?? []) as SessionWithChallengeRow[]).map(mapProfileSessionRow),
  };
}

function mapChallengeSummaryRow(challenge: ChallengeSummaryRow): ChallengeSummary {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    weekNumber: challenge.week_number,
    startAt: challenge.start_at,
    endAt: challenge.end_at,
  };
}

function mapProfileSessionRow(session: SessionWithChallengeRow): ProfileSession {
  const challengeRow = Array.isArray(session.challenge)
    ? session.challenge[0] ?? null
    : session.challenge;

  if (!challengeRow) {
    throw new Error(`Missing challenge data for session "${session.id}".`);
  }

  return {
    id: session.id,
    challengeId: session.challenge_id,
    participantId: session.participant_id,
    submittedAt: session.submitted_at,
    createdAt: session.created_at,
    challenge: mapChallengeSummaryRow(challengeRow),
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
