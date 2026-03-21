import { NextResponse, type NextRequest } from "next/server";
import {
  consumeSubmissionQuota,
  getRequestIp,
} from "@/lib/rate-limit";
import {
  validateSessionSubmissionInput,
} from "@/lib/session-submission";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Session } from "@/lib/types";

type SubmitSessionRpcRow = {
  session_id: string;
  submitted_at: string;
  created_at: string;
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
  const { challengeId, participantId, sets } = validation.data;
  const { data, error } = await supabase.rpc("submit_session", {
    p_challenge_id: challengeId,
    p_participant_id: participantId,
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
    participantId,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    sets: sets.map((reps, index) => ({
      id: `${row.session_id}-set-${index + 1}`,
      sessionId: row.session_id,
      setOrder: index + 1,
      reps,
    })),
  };

  return NextResponse.json({ session }, { status: 201 });
}
