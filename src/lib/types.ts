export type ChallengeStatus = "upcoming" | "active" | "ended";

export type Participant = {
  id: string;
  displayName: string;
  isActive: boolean;
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  exerciseType: "pushups";
  weekNumber: number;
  startAt: string;
  endAt: string;
};

export type WorkoutSet = {
  id: string;
  sessionId: string;
  setOrder: number;
  reps: number;
};

export type Session = {
  id: string;
  challengeId: string;
  participantId: string;
  submittedAt: string;
  createdAt: string;
  sets: WorkoutSet[];
};

export type ChallengeBundle = {
  challenge: Challenge;
  participants: Participant[];
  sessions: Session[];
};

export type TotalLeaderboardEntry = {
  participantId: string;
  displayName: string;
  totalReps: number;
  bestSet: number;
  sessionCount: number;
  totalSetCount: number;
  averageRepsPerSet: number;
  reachedTotalAt: string | null;
};

export type BestSetEntry = {
  participantId: string;
  displayName: string;
  reps: number;
  submittedAt: string | null;
};

export type SessionFeedItem = {
  id: string;
  participantName: string;
  totalReps: number;
  setCount: number;
  submittedAt: string;
};
