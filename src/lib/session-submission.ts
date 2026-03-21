export const MAX_SETS_PER_SESSION = 20;
export const MAX_REPS_PER_SET = 250;

export type SessionSubmissionInput = {
  challengeId: string;
  participantId: string;
  sets: number[];
};

type ValidationResult =
  | {
      ok: true;
      data: SessionSubmissionInput;
    }
  | {
      ok: false;
      message: string;
    };

export function validateSessionSubmissionInput(
  payload: unknown,
): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      message: "Submission payload is missing.",
    };
  }

  const candidate = payload as Partial<SessionSubmissionInput>;

  if (!candidate.challengeId || typeof candidate.challengeId !== "string") {
    return {
      ok: false,
      message: "A challenge is required.",
    };
  }

  if (!candidate.participantId || typeof candidate.participantId !== "string") {
    return {
      ok: false,
      message: "A participant is required.",
    };
  }

  if (!Array.isArray(candidate.sets) || candidate.sets.length === 0) {
    return {
      ok: false,
      message: "At least one set is required.",
    };
  }

  if (candidate.sets.length > MAX_SETS_PER_SESSION) {
    return {
      ok: false,
      message: `A session can contain at most ${MAX_SETS_PER_SESSION} sets.`,
    };
  }

  const parsedSets = candidate.sets.map((value) =>
    typeof value === "number" ? value : Number.parseInt(String(value), 10),
  );

  if (
    parsedSets.some(
      (reps) =>
        !Number.isInteger(reps) || reps <= 0 || reps > MAX_REPS_PER_SET,
    )
  ) {
    return {
      ok: false,
      message: `Each set must be a whole number between 1 and ${MAX_REPS_PER_SET}.`,
    };
  }

  return {
    ok: true,
    data: {
      challengeId: candidate.challengeId,
      participantId: candidate.participantId,
      sets: parsedSets,
    },
  };
}
