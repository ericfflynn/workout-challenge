import type {
  BestSetEntry,
  Challenge,
  ChallengeStatus,
  Participant,
  Session,
  SessionFeedItem,
  TotalLeaderboardEntry,
} from "@/lib/types";

export function getChallengeStatus(
  challenge: Challenge,
  now = new Date(),
): ChallengeStatus {
  const startsAt = new Date(challenge.startAt);
  const endsAt = new Date(challenge.endAt);

  if (now < startsAt) {
    return "upcoming";
  }

  if (now > endsAt) {
    return "ended";
  }

  return "active";
}

export function getSessionTotal(session: Session) {
  return session.sets.reduce((sum, set) => sum + set.reps, 0);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatChallengeWindow(challenge: Challenge) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
  });

  return `${formatter.format(new Date(challenge.startAt))} to ${formatter.format(
    new Date(challenge.endAt),
  )}`;
}

export function getCountdownLabel(challenge: Challenge, now = new Date()) {
  const status = getChallengeStatus(challenge, now);
  const target =
    status === "upcoming"
      ? new Date(challenge.startAt).getTime()
      : new Date(challenge.endAt).getTime();

  const remainingMs = Math.max(target - now.getTime(), 0);
  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (status === "ended") {
    return "Challenge closed";
  }

  const parts = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }

  parts.push(`${minutes}m`);

  return status === "upcoming"
    ? `Starts in ${parts.join(" ")}`
    : `${parts.join(" ")} left`;
}

export function buildTotalLeaderboard(
  participants: Participant[],
  sessions: Session[],
): TotalLeaderboardEntry[] {
  return participants
    .filter((participant) => participant.isActive)
    .map((participant) => {
      const participantSessions = sessions
        .filter((session) => session.participantId === participant.id)
        .sort(
          (left, right) =>
            new Date(left.submittedAt).getTime() -
            new Date(right.submittedAt).getTime(),
        );

      const totalReps = participantSessions.reduce(
        (sum, session) => sum + getSessionTotal(session),
        0,
      );

      const bestSet = participantSessions.reduce((best, session) => {
        const sessionBest = session.sets.reduce(
          (sessionMax, set) => Math.max(sessionMax, set.reps),
          0,
        );

        return Math.max(best, sessionBest);
      }, 0);

      return {
        participantId: participant.id,
        displayName: participant.displayName,
        totalReps,
        bestSet,
        sessionCount: participantSessions.length,
        reachedTotalAt: participantSessions.at(-1)?.submittedAt ?? null,
      };
    })
    .filter((entry) => entry.sessionCount > 0)
    .sort((left, right) => {
      if (left.totalReps !== right.totalReps) {
        return right.totalReps - left.totalReps;
      }

      if (!left.reachedTotalAt || !right.reachedTotalAt) {
        return 0;
      }

      return (
        new Date(left.reachedTotalAt).getTime() -
        new Date(right.reachedTotalAt).getTime()
      );
    });
}

export function buildBestSetLeaderboard(
  participants: Participant[],
  sessions: Session[],
): BestSetEntry[] {
  return participants
    .filter((participant) => participant.isActive)
    .map((participant) => {
      let bestReps = 0;
      let bestSubmittedAt: string | null = null;

      sessions
        .filter((session) => session.participantId === participant.id)
        .forEach((session) => {
          session.sets.forEach((set) => {
            if (set.reps > bestReps) {
              bestReps = set.reps;
              bestSubmittedAt = session.submittedAt;
            }
          });
        });

      return {
        participantId: participant.id,
        displayName: participant.displayName,
        reps: bestReps,
        submittedAt: bestSubmittedAt,
      };
    })
    .filter((entry) => entry.reps > 0)
    .sort((left, right) => {
      if (left.reps !== right.reps) {
        return right.reps - left.reps;
      }

      if (!left.submittedAt || !right.submittedAt) {
        return 0;
      }

      return (
        new Date(left.submittedAt).getTime() -
        new Date(right.submittedAt).getTime()
      );
    });
}

export function buildSessionFeed(
  participants: Participant[],
  sessions: Session[],
): SessionFeedItem[] {
  const participantMap = new Map(
    participants.map((participant) => [participant.id, participant.displayName]),
  );

  return [...sessions]
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() -
        new Date(left.submittedAt).getTime(),
    )
    .map((session) => ({
      id: session.id,
      participantName: participantMap.get(session.participantId) ?? "Unknown",
      totalReps: getSessionTotal(session),
      setCount: session.sets.length,
      submittedAt: session.submittedAt,
    }));
}
