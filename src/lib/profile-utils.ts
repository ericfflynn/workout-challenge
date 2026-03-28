import { getSessionTotal } from "@/lib/challenge-utils";
import type {
  ChallengeSummary,
  HomePageBundle,
  Participant,
  ParticipantProfileBundle,
  ProfileSession,
  Session,
} from "@/lib/types";

export type LifetimeStats = {
  totalReps: number;
  totalSets: number;
  totalSessions: number;
  bestSet: number;
  averageRepsPerSet: number;
  challengeCount: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
};

export type ChallengeHistoryEntry = {
  challengeId: string;
  slug: string;
  title: string;
  weekNumber: number;
  startAt: string;
  endAt: string;
  totalReps: number;
  totalSets: number;
  totalSessions: number;
  bestSet: number;
  lastSubmittedAt: string | null;
};

export type ProfileDirectoryEntry = {
  participant: Participant;
  totalReps: number;
  bestSet: number;
  totalSessions: number;
  totalSets: number;
  averageRepsPerSet: number;
};

export type DailyRepsEntry = {
  dateKey: string;
  label: string;
  reps: number;
};

export function buildLifetimeStats(sessions: ProfileSession[]): LifetimeStats {
  const sortedSessions = [...sessions].sort(
    (left, right) =>
      new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime(),
  );
  const totalReps = sortedSessions.reduce(
    (sum, session) => sum + getSessionTotal(session),
    0,
  );
  const totalSets = sortedSessions.reduce(
    (sum, session) => sum + session.sets.length,
    0,
  );
  const bestSet = sortedSessions.reduce((best, session) => {
    const sessionBest = session.sets.reduce(
      (currentBest, set) => Math.max(currentBest, set.reps),
      0,
    );

    return Math.max(best, sessionBest);
  }, 0);
  const challengeCount = new Set(sortedSessions.map((session) => session.challengeId)).size;

  return {
    totalReps,
    totalSets,
    totalSessions: sortedSessions.length,
    bestSet,
    averageRepsPerSet: totalSets > 0 ? Math.round((totalReps / totalSets) * 10) / 10 : 0,
    challengeCount,
    firstSessionAt: sortedSessions[0]?.submittedAt ?? null,
    lastSessionAt: sortedSessions[sortedSessions.length - 1]?.submittedAt ?? null,
  };
}

export function buildChallengeHistory(
  sessions: ProfileSession[],
): ChallengeHistoryEntry[] {
  const historyByChallenge = new Map<string, ChallengeHistoryEntry>();

  sessions.forEach((session) => {
    const existing = historyByChallenge.get(session.challengeId);
    const sessionTotal = getSessionTotal(session);
    const sessionBest = session.sets.reduce(
      (best, set) => Math.max(best, set.reps),
      0,
    );

    if (!existing) {
      historyByChallenge.set(session.challengeId, {
        challengeId: session.challengeId,
        slug: session.challenge.slug,
        title: session.challenge.title,
        weekNumber: session.challenge.weekNumber,
        startAt: session.challenge.startAt,
        endAt: session.challenge.endAt,
        totalReps: sessionTotal,
        totalSets: session.sets.length,
        totalSessions: 1,
        bestSet: sessionBest,
        lastSubmittedAt: session.submittedAt,
      });
      return;
    }

    existing.totalReps += sessionTotal;
    existing.totalSets += session.sets.length;
    existing.totalSessions += 1;
    existing.bestSet = Math.max(existing.bestSet, sessionBest);

    if (
      !existing.lastSubmittedAt ||
      new Date(session.submittedAt).getTime() > new Date(existing.lastSubmittedAt).getTime()
    ) {
      existing.lastSubmittedAt = session.submittedAt;
    }
  });

  return [...historyByChallenge.values()].sort(
    (left, right) =>
      new Date(right.startAt).getTime() - new Date(left.startAt).getTime(),
  );
}

export function buildRecentProfileSessions(sessions: ProfileSession[], limit = 8) {
  return [...sessions]
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
    )
    .slice(0, limit)
    .map((session) => ({
      id: session.id,
      challengeId: session.challengeId,
      challengeSlug: session.challenge.slug,
      challengeTitle: session.challenge.title,
      weekNumber: session.challenge.weekNumber,
      submittedAt: session.submittedAt,
      totalReps: getSessionTotal(session),
      setCount: session.sets.length,
      bestSet: session.sets.reduce((best, set) => Math.max(best, set.reps), 0),
    }));
}

export function buildProfileDirectory(
  participants: Participant[],
  sessions: Session[],
): ProfileDirectoryEntry[] {
  const byParticipant = new Map<string, ProfileDirectoryEntry>();

  participants.forEach((participant) => {
    byParticipant.set(participant.id, {
      participant,
      totalReps: 0,
      bestSet: 0,
      totalSessions: 0,
      totalSets: 0,
      averageRepsPerSet: 0,
    });
  });

  sessions.forEach((session) => {
    const entry = byParticipant.get(session.participantId);

    if (!entry) {
      return;
    }

    const sessionTotal = getSessionTotal(session);
    const sessionBest = session.sets.reduce((best, set) => Math.max(best, set.reps), 0);

    entry.totalReps += sessionTotal;
    entry.totalSessions += 1;
    entry.totalSets += session.sets.length;
    entry.bestSet = Math.max(entry.bestSet, sessionBest);
  });

  return [...byParticipant.values()]
    .map((entry) => ({
      ...entry,
      averageRepsPerSet:
        entry.totalSets > 0
          ? Math.round((entry.totalReps / entry.totalSets) * 10) / 10
          : 0,
    }))
    .sort((left, right) => {
      if (left.totalReps !== right.totalReps) {
        return right.totalReps - left.totalReps;
      }

      if (left.bestSet !== right.bestSet) {
        return right.bestSet - left.bestSet;
      }

      return left.participant.displayName.localeCompare(right.participant.displayName);
    });
}

export function buildParticipantProfileFromHomeBundle(
  bundle: HomePageBundle,
  participantId: string,
): ParticipantProfileBundle | null {
  const participant = bundle.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    return null;
  }

  const challengeMap = new Map<string, ChallengeSummary>(
    bundle.challenges.map((challenge) => [challenge.id, challenge]),
  );
  const sessions = bundle.sessions
    .filter((session) => session.participantId === participantId)
    .map((session) => {
      const challenge = challengeMap.get(session.challengeId);

      if (!challenge) {
        return null;
      }

      return {
        ...session,
        challenge,
      } satisfies ProfileSession;
    })
    .filter((session): session is ProfileSession => session !== null)
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
    );

  return {
    participant,
    participants: bundle.participants,
    sessions,
  };
}

export function buildDailyRepsSeries(
  sessions: ProfileSession[],
  days = 7,
): DailyRepsEntry[] {
  const today = new Date();
  const repsByDay = new Map<string, number>();

  sessions.forEach((session) => {
    const dayKey = formatDayKey(new Date(session.submittedAt));
    repsByDay.set(dayKey, (repsByDay.get(dayKey) ?? 0) + getSessionTotal(session));
  });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const dateKey = formatDayKey(date);

    return {
      dateKey,
      label: formatDayLabel(date),
      reps: repsByDay.get(dateKey) ?? 0,
    };
  });
}

function formatDayKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(date);
}
