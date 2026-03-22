"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildBestSetLeaderboard,
  buildSessionFeed,
  buildTotalLeaderboard,
  formatChallengeEnd,
  formatDateTime,
  getChallengeStatus,
  getCountdownDaysAndHours,
  getSessionTotal,
} from "@/lib/challenge-utils";
import type {
  BestSetEntry,
  ChallengeBundle,
  Participant,
  Session,
  TotalLeaderboardEntry,
} from "@/lib/types";
import {
  MAX_PARTICIPANT_NAME_LENGTH,
  MAX_REPS_PER_SET,
  MAX_SETS_PER_SESSION,
  normalizeParticipantDisplayName,
} from "@/lib/session-submission";

type ChallengeShellProps = {
  bundle: ChallengeBundle;
};

type SetDraft = {
  id: string;
  reps: string;
};

type FlashMessage = {
  tone: "success" | "error";
  text: string;
} | null;

const NEW_PARTICIPANT_VALUE = "__new__";

function buildDraftSet(id: string, reps = ""): SetDraft {
  return { id, reps };
}

function sanitizeRepsInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
}

function sortParticipantsByName(participants: Participant[]) {
  return [...participants].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}

function formatChallengeOptionDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function getStatusLabel(status: "upcoming" | "active" | "ended") {
  if (status === "upcoming") {
    return "Upcoming";
  }

  if (status === "ended") {
    return "Final";
  }

  return "Live";
}

function getStatusClasses(status: "upcoming" | "active" | "ended") {
  if (status === "upcoming") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  if (status === "ended") {
    return "border-slate-200 bg-slate-100 text-slate-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

export function ChallengeShell({ bundle }: ChallengeShellProps) {
  const draftCountRef = useRef(3);
  const lastTouchActionRef = useRef(0);
  const router = useRouter();
  const [isClientReady, setIsClientReady] = useState(false);
  const [participants, setParticipants] = useState(() =>
    sortParticipantsByName(bundle.participants),
  );
  const [participantSelection, setParticipantSelection] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [setDrafts, setSetDrafts] = useState<SetDraft[]>([buildDraftSet("draft-1", "")]);
  const [sessions, setSessions] = useState<Session[]>(bundle.sessions);
  const [flash, setFlash] = useState<FlashMessage>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    setIsClientReady(true);
    setCurrentTime(new Date());
  }, []);

  useEffect(() => {
    setParticipants(sortParticipantsByName(bundle.participants));
    setSessions(bundle.sessions);
    setFlash(null);
    setIsSubmitting(false);
    setParticipantSelection("");
    setNewParticipantName("");
    setSetDrafts([buildDraftSet("draft-1", "")]);
    draftCountRef.current = 2;
  }, [bundle.challenge.id, bundle.participants, bundle.sessions]);

  if (!isClientReady) {
    return <ChallengeShellSkeleton />;
  }

  const challengeStatus = getChallengeStatus(bundle.challenge, currentTime);
  const challengeStartsAt = formatDateTime(bundle.challenge.startAt);
  const challengeEndsAt = formatChallengeEnd(bundle.challenge);
  const countdownLabel = getCountdownDaysAndHours(bundle.challenge, currentTime);
  const activeParticipants = participants.filter(
    (participant) => participant.isActive,
  );
  const totalLeaderboard = buildTotalLeaderboard(participants, sessions);
  const bestSetLeaderboard = buildBestSetLeaderboard(participants, sessions);
  const recentSessions = buildSessionFeed(participants, sessions).slice(0, 5);
  const previewReps = setDrafts.reduce((sum, draft) => {
    const reps = Number.parseInt(draft.reps, 10);
    return Number.isFinite(reps) && reps > 0 ? sum + reps : sum;
  }, 0);
  const previewSetCount = setDrafts.filter((draft) => {
    const reps = Number.parseInt(draft.reps, 10);
    return Number.isFinite(reps) && reps > 0;
  }).length;
  const canSubmit = challengeStatus === "active";
  const isCreatingParticipant = participantSelection === NEW_PARTICIPANT_VALUE;
  const submissionStatusMessage =
    challengeStatus === "upcoming"
      ? `This challenge has not started yet. Session logging opens ${challengeStartsAt}.`
      : challengeStatus === "ended"
        ? `This challenge has ended. Session logging closed ${challengeEndsAt}.`
        : null;

  function addSetDraft() {
    const nextId = `draft-${draftCountRef.current}`;
    draftCountRef.current += 1;
    setSetDrafts((current) => [...current, buildDraftSet(nextId)]);
  }

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function handleAddSetAction() {
    setFlash(null);
    blurActiveElement();
    addSetDraft();
  }

  function handleAddSetTouchStart(event: React.TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isSubmitting || setDrafts.length >= MAX_SETS_PER_SESSION) {
      return;
    }

    lastTouchActionRef.current = Date.now();
    handleAddSetAction();
  }

  function removeSetDraft(id: string) {
    setSetDrafts((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((draft) => draft.id !== id);
    });
  }

  function updateSetDraft(id: string, reps: string) {
    const nextReps = sanitizeRepsInput(reps);
    setSetDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, reps: nextReps } : draft)),
    );
  }

  function resetDrafts() {
    draftCountRef.current = 2;
    setParticipantSelection("");
    setNewParticipantName("");
    setSetDrafts([buildDraftSet("draft-1", "")]);
  }

  function updateParticipantSelection(value: string) {
    setParticipantSelection(value);

    if (value !== NEW_PARTICIPANT_VALUE) {
      setNewParticipantName("");
    }
  }

  function updateNewParticipantName(value: string) {
    setNewParticipantName(value.slice(0, MAX_PARTICIPANT_NAME_LENGTH));
  }

  function handleChallengeSelection(nextSlug: string) {
    if (!nextSlug || nextSlug === bundle.challenge.slug) {
      return;
    }

    startTransition(() => {
      router.push(`/challenges/${nextSlug}`);
    });
  }

  function handleResetAction() {
    setFlash(null);
    blurActiveElement();
    resetDrafts();
  }

  function handleResetTouchStart(event: React.TouchEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isSubmitting) {
      return;
    }

    lastTouchActionRef.current = Date.now();
    handleResetAction();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (challengeStatus !== "active") {
      setFlash({
        tone: "error",
        text:
          challengeStatus === "upcoming"
            ? `This challenge has not started yet. Session logging opens ${challengeStartsAt}.`
            : `This challenge has ended. Session logging closed ${challengeEndsAt}.`,
      });
      return;
    }

    if (!participantSelection) {
      setFlash({
        tone: "error",
        text: "Pick an existing participant or choose New participant.",
      });
      return;
    }

    const normalizedNewParticipantName = normalizeParticipantDisplayName(
      newParticipantName,
    );

    if (isCreatingParticipant && !normalizedNewParticipantName) {
      setFlash({
        tone: "error",
        text: "Enter a participant name before submitting a session.",
      });
      return;
    }

    if (setDrafts.length > MAX_SETS_PER_SESSION) {
      setFlash({
        tone: "error",
        text: `You can log at most ${MAX_SETS_PER_SESSION} sets in one session.`,
      });
      return;
    }

    const parsedSets = setDrafts
      .map((draft) => Number.parseInt(draft.reps, 10))
      .filter((reps) => Number.isFinite(reps));

    if (
      parsedSets.length !== setDrafts.length ||
      parsedSets.some((reps) => reps <= 0 || reps > MAX_REPS_PER_SET)
    ) {
      setFlash({
        tone: "error",
        text: `Each set must be a whole number between 1 and ${MAX_REPS_PER_SET}.`,
      });
      return;
    }

    setIsSubmitting(true);
    setFlash(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: bundle.challenge.id,
          participantId:
            participantSelection === NEW_PARTICIPANT_VALUE
              ? undefined
              : participantSelection,
          newParticipantName:
            participantSelection === NEW_PARTICIPANT_VALUE
              ? normalizedNewParticipantName
              : undefined,
          sets: parsedSets,
        }),
      });
      const payload = (await response.json()) as
        | { error?: string; participant?: Participant; session?: Session }
        | undefined;

      if (!response.ok || !payload?.session || !payload.participant) {
        setFlash({
          tone: "error",
          text: payload?.error ?? "The session could not be saved.",
        });
        return;
      }

      setParticipants((current) => {
        const hasParticipant = current.some(
          (participant) => participant.id === payload.participant!.id,
        );

        if (hasParticipant) {
          return current;
        }

        return sortParticipantsByName([...current, payload.participant!]);
      });

      setSessions((current) => [...current, payload.session!]);
      resetDrafts();
      setFlash({
        tone: "success",
        text: `${payload.participant.displayName} logged ${getSessionTotal(payload.session)} pushups across ${payload.session.sets.length} sets.`,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFlash({
        tone: "error",
        text: "The session could not be saved. Check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] px-5 py-5 shadow-[var(--shadow)] backdrop-blur sm:px-7 sm:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,_rgba(240,86,43,0.26),_transparent_58%)] lg:block"
        />
        <div className="relative space-y-5">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getStatusClasses(challengeStatus)}`}
                  >
                    {getStatusLabel(challengeStatus)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    Week {bundle.challenge.weekNumber}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="font-[family-name:var(--font-heading)] text-4xl leading-none tracking-[0.02em] text-[var(--accent-deep)] sm:text-6xl">
                    {bundle.challenge.title}
                  </p>
                  <p className="max-w-2xl text-sm leading-5 text-[var(--muted)] sm:text-base">
                    {challengeStatus === "ended"
                      ? "Viewing the final standings for this completed challenge."
                      : "Log sessions and climb the leaderboard."}
                  </p>
                </div>
              </div>

              <label className="grid gap-2 lg:min-w-[18rem]">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Challenge
                </span>
                <select
                  className="rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
                  onChange={(event) => handleChallengeSelection(event.target.value)}
                  value={bundle.challenge.slug}
                >
                  {bundle.challenges.map((challenge) => (
                    <option key={challenge.id} value={challenge.slug}>
                      {`Week ${challenge.weekNumber} • ${formatChallengeOptionDate(challenge.startAt)}-${formatChallengeOptionDate(challenge.endAt)}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <StatTile
                label="Starts"
                value={challengeStartsAt}
              />
              <StatTile
                label="Ends"
                value={`${challengeEndsAt} • ${countdownLabel}`}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <PulseCard
              eyebrow="Current leader"
              value={totalLeaderboard[0]?.displayName ?? "TBD"}
              subcopy={
                totalLeaderboard[0]
                  ? `${totalLeaderboard[0].totalReps} total reps`
                  : "No sessions yet"
              }
            />
            <PulseCard
              eyebrow="Best single set"
              value={bestSetLeaderboard[0]?.displayName ?? "TBD"}
              subcopy={
                bestSetLeaderboard[0]?.reps
                  ? `${bestSetLeaderboard[0].reps} reps`
                  : "No sets yet"
              }
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <QuickLink href="#submit">Log session</QuickLink>
            <QuickLink href="#totals">Total reps</QuickLink>
            <QuickLink href="#best-set">Best set</QuickLink>
            <QuickLink href="#recent">Recent</QuickLink>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <Panel
          eyebrow="Log session"
          id="submit"
          title="Log a session"
          description="Pick a name, enter each set from the workout, and submit the whole session at once."
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Participant
              </span>
              <select
                className="rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)]"
                disabled={isSubmitting}
                onChange={(event) => updateParticipantSelection(event.target.value)}
                value={participantSelection}
              >
                <option value="">Select participant</option>
                {activeParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
                <option value={NEW_PARTICIPANT_VALUE}>New participant</option>
              </select>
            </label>

            {isCreatingParticipant ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  New participant name
                </span>
                <input
                  className="rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)]"
                  disabled={isSubmitting}
                  maxLength={MAX_PARTICIPANT_NAME_LENGTH}
                  onChange={(event) => updateNewParticipantName(event.target.value)}
                  placeholder="Enter name"
                  type="text"
                  value={newParticipantName}
                />
              </label>
            ) : null}

            {activeParticipants.length === 0 ? (
              <EmptyBlock text="No active participants exist yet. Choose New participant to create the first one while submitting." />
            ) : null}

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Sets
                </p>
                <p className="text-sm text-[var(--muted)]">Add each set below.</p>
              </div>

              <div className="mt-3 grid gap-2">
                {setDrafts.map((draft, index) => (
                  <div
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                    key={draft.id}
                  >
                    <span className="text-sm font-medium text-[var(--muted)]">
                      Set {index + 1}
                    </span>
                    <input
                      className="w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 py-2.5 text-base font-semibold outline-none transition focus:border-[var(--accent)]"
                      disabled={isSubmitting}
                      enterKeyHint="next"
                      inputMode="numeric"
                      maxLength={3}
                      onChange={(event) => updateSetDraft(draft.id, event.target.value)}
                      onInput={(event) =>
                        updateSetDraft(
                          draft.id,
                          (event.currentTarget as HTMLInputElement).value,
                        )
                      }
                      pattern="[0-9]*"
                      placeholder="Reps"
                      type="text"
                      value={draft.reps}
                    />
                    <button
                      className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isSubmitting || setDrafts.length === 1}
                      onClick={() => removeSetDraft(draft.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  className="relative z-10 w-full touch-manipulation rounded-xl border border-dashed border-[var(--line-strong)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isSubmitting || setDrafts.length >= MAX_SETS_PER_SESSION}
                  onClick={(event) => {
                    event.preventDefault();

                    if (Date.now() - lastTouchActionRef.current < 500) {
                      return;
                    }

                    if (isSubmitting || setDrafts.length >= MAX_SETS_PER_SESSION) {
                      return;
                    }

                    handleAddSetAction();
                  }}
                  onTouchStart={handleAddSetTouchStart}
                  type="button"
                >
                  Add set
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3">
              <InlineSummaryStat label="Sets" value={`${previewSetCount}`} />
              <InlineSummaryStat label="Total reps" value={`${previewReps}`} />
            </div>

            {submissionStatusMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {submissionStatusMessage}
              </div>
            ) : null}

            {flash ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  flash.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {flash.text}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="w-full rounded-full bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                disabled={!canSubmit || isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Saving..."
                  : challengeStatus === "upcoming"
                    ? "Challenge not started"
                    : challengeStatus === "ended"
                      ? "Challenge ended"
                      : "Submit session"}
              </button>
              <button
                className="w-full touch-manipulation rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] sm:w-auto"
                disabled={isSubmitting}
                onClick={(event) => {
                  event.preventDefault();

                  if (Date.now() - lastTouchActionRef.current < 500) {
                    return;
                  }

                  if (isSubmitting) {
                    return;
                  }

                  handleResetAction();
                }}
                onTouchStart={handleResetTouchStart}
                type="button"
              >
                Reset sets
              </button>
            </div>

            <p className="text-sm text-[var(--muted)]">
              Sessions save immediately once submitted. If the name is not listed yet, choose New participant and the app will create it during submission.
            </p>
          </form>
        </Panel>

        <Panel
          eyebrow="Leaderboard"
          id="totals"
          title="Total volume"
          description="This is the main race. Every valid set in the challenge window counts toward total reps."
        >
          <TotalLeaderboard entries={totalLeaderboard} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Panel
          eyebrow="Secondary race"
          id="best-set"
          title="Best single set"
          description="A single monster set earns its own leaderboard, separate from weekly volume."
        >
          <BestSetLeaderboard entries={bestSetLeaderboard} />
        </Panel>

        <Panel
          eyebrow="Recent activity"
          id="recent"
          title="Latest sessions"
          description="Recent batch submissions in this prototype feed."
        >
          {recentSessions.length > 0 ? (
            <div className="grid gap-3">
              {recentSessions.map((session) => (
                <div
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-4 py-4"
                  key={session.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--foreground)]">
                        {session.participantName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatDateTime(session.submittedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--accent-deep)]">
                        {session.totalReps}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        reps
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                      {session.setCount} sets
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock text="No sessions have been submitted for this challenge yet." />
          )}
        </Panel>
      </div>
    </main>
  );
}

function Panel({
  eyebrow,
  id,
  title,
  description,
  children,
}: {
  eyebrow: string;
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="scroll-mt-6 rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] backdrop-blur sm:p-6"
      id={id}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <div className="mt-2 space-y-1">
        <h2 className="font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--foreground)] sm:text-5xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
          {description}
        </p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="rounded-full border border-[var(--line-strong)] bg-[var(--panel-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
      href={href}
    >
      {children}
    </a>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-5 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function PulseCard({
  eyebrow,
  value,
  subcopy,
}: {
  eyebrow: string;
  value: string;
  subcopy: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <p className="mt-1.5 font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--foreground)] sm:text-5xl">
        {value}
      </p>
      <p className="mt-1.5 text-sm leading-5 text-[var(--muted)]">{subcopy}</p>
    </div>
  );
}

function InlineSummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="text-lg font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-[var(--line-strong)] bg-white/65 px-4 py-5 text-sm leading-6 text-[var(--muted)]">
      {text}
    </div>
  );
}

function ChallengeShellSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] px-5 py-5 shadow-[var(--shadow)] backdrop-blur sm:px-7 sm:py-7">
        <div className="space-y-4">
          <div className="h-12 w-52 rounded-full bg-white/60 sm:h-16" />
          <div className="h-5 w-40 rounded-full bg-white/55" />
          <div className="h-16 rounded-[1.15rem] bg-white/55" />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="h-28 rounded-[1.15rem] bg-white/55" />
            <div className="h-28 rounded-[1.15rem] bg-white/55" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <Panel
          eyebrow="Log session"
          id="submit"
          title="Log a session"
          description="Pick a name, enter each set from the workout, and submit the whole session at once."
        >
          <ClientFormSkeleton />
        </Panel>
        <Panel
          eyebrow="Leaderboard"
          id="totals"
          title="Total volume"
          description="This is the main race. Every valid set in the challenge window counts toward total reps."
        >
          <div className="h-56 rounded-[1.5rem] border border-[var(--line)] bg-white/65" />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <Panel
          eyebrow="Secondary race"
          id="best-set"
          title="Best single set"
          description="A single monster set earns its own leaderboard, separate from weekly volume."
        >
          <div className="h-40 rounded-[1.5rem] border border-[var(--line)] bg-white/65" />
        </Panel>
        <Panel
          eyebrow="Recent activity"
          id="recent"
          title="Latest sessions"
          description="Recent batch submissions in this prototype feed."
        >
          <div className="h-48 rounded-[1.5rem] border border-[var(--line)] bg-white/65" />
        </Panel>
      </div>
    </main>
  );
}

function ClientFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        <div className="h-4 w-24 rounded-full bg-white/55" />
        <div className="h-14 rounded-2xl bg-white/65" />
      </div>
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
        <div className="space-y-1">
          <div className="h-4 w-14 rounded-full bg-white/55" />
          <div className="h-4 w-32 rounded-full bg-white/45" />
        </div>
        <div className="mt-3 grid gap-2">
          <div className="h-12 rounded-xl bg-white/65" />
        </div>
        <div className="mt-3 h-11 rounded-xl bg-white/65" />
      </div>
      <div className="h-12 rounded-[1.25rem] border border-[var(--line)] bg-[var(--panel-strong)]" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="h-12 w-full rounded-full bg-[var(--accent-soft)] sm:w-40" />
        <div className="h-12 w-full rounded-full bg-white/65 sm:w-32" />
      </div>
    </div>
  );
}

function TotalLeaderboard({ entries }: { entries: TotalLeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyBlock text="No leaderboard data yet. Once participants start logging sessions, totals will appear here." />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.map((entry, index) => (
          <div
            className={`rounded-[1.35rem] border px-4 py-4 ${
              index === 0
                ? "border-[var(--accent)] bg-[linear-gradient(135deg,rgba(255,216,191,0.75),rgba(255,247,237,0.95))] shadow-[0_12px_30px_rgba(191,47,24,0.12)]"
                : "border-[var(--line)] bg-white/80"
            }`}
            key={entry.participantId}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.15em] ${
                    index === 0 ? "text-[var(--accent-deep)]" : "text-[var(--muted)]"
                  }`}
                >
                  Rank #{index + 1}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {entry.displayName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--accent-deep)]">
                  {entry.totalReps}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  total reps
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
              <span>{entry.totalSetCount} sets</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <BasicLeaderboardTable
          columns={["Rank", "Participant", "Total reps", "Top set", "Total sets", "Reps/set"]}
          rows={entries.map((entry, index) => ({
            id: entry.participantId,
            isLeader: index === 0,
            cells: [
              `#${index + 1}`,
              entry.displayName,
              `${entry.totalReps}`,
              `${entry.bestSet}`,
              `${entry.totalSetCount}`,
              formatAverageReps(entry.averageRepsPerSet),
            ],
          }))}
        />
      </div>
    </>
  );
}

function BestSetLeaderboard({ entries }: { entries: BestSetEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyBlock text="No sets have been logged yet. The best single set leaderboard will appear after the first submission." />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {entries.slice(0, 3).map((entry, index) => (
          <div
            className={`rounded-[1.35rem] border px-4 py-4 ${
              index === 0
                ? "border-[var(--accent)] bg-[linear-gradient(135deg,rgba(255,216,191,0.75),rgba(255,247,237,0.95))] shadow-[0_12px_30px_rgba(191,47,24,0.12)]"
                : "border-[var(--line)] bg-white/80"
            }`}
            key={entry.participantId}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.15em] ${
                    index === 0 ? "text-[var(--accent-deep)]" : "text-[var(--muted)]"
                  }`}
                >
                  Rank #{index + 1}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {entry.displayName}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {entry.submittedAt ? formatDateTime(entry.submittedAt) : "No sets yet"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--accent-deep)]">
                  {entry.reps}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  best set
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <BasicLeaderboardTable
          columns={["Rank", "Participant", "Best set", "When"]}
          rows={entries.slice(0, 3).map((entry, index) => ({
            id: entry.participantId,
            isLeader: index === 0,
            cells: [
              `#${index + 1}`,
              entry.displayName,
              `${entry.reps}`,
              entry.submittedAt ? formatDateTime(entry.submittedAt) : "No sets yet",
            ],
          }))}
        />
      </div>
    </>
  );
}

function BasicLeaderboardTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{
    id: string;
    isLeader?: boolean;
    cells: string[];
  }>;
}) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-white/75">
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--line)]">
            {columns.map((heading) => (
              <th
                className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] sm:px-5"
                key={heading}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={`border-b border-[var(--line)] last:border-b-0 ${
                row.isLeader
                  ? "bg-[linear-gradient(90deg,rgba(255,216,191,0.55),rgba(255,247,237,0.92))]"
                  : ""
              }`}
              key={row.id}
            >
              {row.cells.map((cell, cellIndex) => (
                <td
                  className={`px-4 py-3 text-sm sm:px-5 ${
                    cellIndex === 0
                      ? row.isLeader
                        ? "font-semibold text-[var(--accent-deep)]"
                        : "font-semibold text-[var(--muted)]"
                      : cellIndex === 1
                        ? "font-semibold text-[var(--foreground)]"
                        : "text-[var(--foreground)]"
                  }`}
                  key={`${row.id}-${cellIndex}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatAverageReps(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(1);
}
