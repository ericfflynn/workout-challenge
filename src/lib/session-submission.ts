export const MAX_SETS_PER_SESSION = 20;
export const MAX_REPS_PER_SET = 250;
export const MAX_PARTICIPANT_NAME_LENGTH = 60;

type SessionSubmissionBase = {
  challengeId: string;
  sets: number[];
};

type ExistingParticipantSessionSubmissionInput = SessionSubmissionBase & {
  participantId: string;
  newParticipantName?: undefined;
};

type NewParticipantSessionSubmissionInput = SessionSubmissionBase & {
  participantId?: undefined;
  newParticipantName: string;
};

export type SessionSubmissionInput =
  | ExistingParticipantSessionSubmissionInput
  | NewParticipantSessionSubmissionInput;

type ValidationResult =
  | {
      ok: true;
      data: SessionSubmissionInput;
    }
  | {
      ok: false;
      message: string;
    };

export function normalizeParticipantDisplayName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

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
  const hasParticipantId =
    typeof candidate.participantId === "string" && candidate.participantId.length > 0;
  const hasNewParticipantName =
    typeof candidate.newParticipantName === "string" &&
    candidate.newParticipantName.length > 0;

  if (!candidate.challengeId || typeof candidate.challengeId !== "string") {
    return {
      ok: false,
      message: "A challenge is required.",
    };
  }

  if (hasParticipantId === hasNewParticipantName) {
    return {
      ok: false,
      message: "Choose an existing participant or enter a new participant name.",
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

  if (hasParticipantId) {
    return {
      ok: true,
      data: {
        challengeId: candidate.challengeId,
        participantId: candidate.participantId!,
        sets: parsedSets,
      },
    };
  }

  const normalizedParticipantName = normalizeParticipantDisplayName(
    candidate.newParticipantName!,
  );

  if (!normalizedParticipantName) {
    return {
      ok: false,
      message: "Enter a participant name.",
    };
  }

  if (normalizedParticipantName.length > MAX_PARTICIPANT_NAME_LENGTH) {
    return {
      ok: false,
      message: `Participant names must be ${MAX_PARTICIPANT_NAME_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    data: {
      challengeId: candidate.challengeId,
      sets: parsedSets,
      newParticipantName: normalizedParticipantName,
    },
  };
}
