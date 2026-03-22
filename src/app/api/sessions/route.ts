import { NextResponse, type NextRequest } from "next/server";
import {
  consumeSubmissionQuota,
  getRequestIp,
} from "@/lib/rate-limit";
import {
  normalizeParticipantDisplayName,
  validateSessionSubmissionInput,
} from "@/lib/session-submission";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Participant, Session } from "@/lib/types";

type SubmitSessionRpcRow = {
  session_id: string;
  submitted_at: string;
  created_at: string;
};

type ParticipantRow = {
  id: string;
  display_name: string;
  is_active: boolean;
};

type GetOrCreateParticipantRpcRow = {
  participant_id: string;
  display_name: string;
  is_active: boolean;
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const ip = getRequestIp(request);
  const quota = consumeSubmissionQuota(`session-submit:${ip}`);

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Too many submissions from this connection. Try again shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(quota.retryAfterSeconds),
        },
      },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validation = validateSessionSubmissionInput(payload);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { challengeId, sets } = validation.data;
  const participantResult =
    typeof validation.data.participantId === "string"
      ? await getExistingParticipant(supabase, validation.data.participantId)
      : await getOrCreateParticipant(
          supabase,
          validation.data.newParticipantName,
        );

  if (!participantResult.ok) {
    return NextResponse.json({ error: participantResult.message }, { status: 400 });
  }

  const participant = participantResult.participant;
  const { data, error } = await supabase.rpc("submit_session", {
    p_challenge_id: challengeId,
    p_participant_id: participant.id,
    p_sets: sets,
  });

  if (error) {
    const status =
      error.message.includes("challenge") ||
      error.message.includes("participant") ||
      error.message.includes("set")
        ? 400
        : 500;

    return NextResponse.json({ error: error.message }, { status });
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | SubmitSessionRpcRow
    | null;

  if (!row) {
    return NextResponse.json(
      { error: "The session was not created." },
      { status: 500 },
    );
  }

  const session: Session = {
    id: row.session_id,
    challengeId,
    participantId: participant.id,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    sets: sets.map((reps, index) => ({
      id: `${row.session_id}-set-${index + 1}`,
      sessionId: row.session_id,
      setOrder: index + 1,
      reps,
    })),
  };

  return NextResponse.json({ participant, session }, { status: 201 });
}

async function getExistingParticipant(
  supabase: ReturnType<typeof getSupabaseClient>,
  participantId: string,
) {
  const { data, error } = await supabase
    .from("participants")
    .select("id, display_name, is_active")
    .eq("id", participantId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      message: "The participant could not be loaded.",
    };
  }

  const participant = data as ParticipantRow | null;

  if (!participant || !participant.is_active) {
    return {
      ok: false as const,
      message: "Choose an active participant before submitting a session.",
    };
  }

  return {
    ok: true as const,
    participant: mapParticipantRow(participant),
  };
}

async function getOrCreateParticipant(
  supabase: ReturnType<typeof getSupabaseClient>,
  displayName: string,
) {
  const normalizedDisplayName = normalizeParticipantDisplayName(displayName);
  const { data, error } = await supabase.rpc("get_or_create_participant", {
    p_display_name: normalizedDisplayName,
  });

  if (error) {
    return {
      ok: false as const,
      message: error.message,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | GetOrCreateParticipantRpcRow
    | null;

  if (!row) {
    return {
      ok: false as const,
      message: "The participant could not be created.",
    };
  }

  return {
    ok: true as const,
    participant: {
      id: row.participant_id,
      displayName: row.display_name,
      isActive: row.is_active,
    } satisfies Participant,
  };
}

function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    displayName: row.display_name,
    isActive: row.is_active,
  };
}
