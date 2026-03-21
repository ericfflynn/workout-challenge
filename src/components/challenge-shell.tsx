"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildBestSetLeaderboard,
  buildSessionFeed,
  buildTotalLeaderboard,
  formatChallengeWindow,
  formatDateTime,
  getChallengeStatus,
  getCountdownLabel,
  getSessionTotal,
} from "@/lib/challenge-utils";
import type {
  BestSetEntry,
  ChallengeBundle,
  Session,
  TotalLeaderboardEntry,
} from "@/lib/types";
import {
  MAX_REPS_PER_SET,
  MAX_SETS_PER_SESSION,
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

function buildDraftSet(id: string, reps = ""): SetDraft {
  return { id, reps };
}

function statusLabel(status: ReturnType<typeof getChallengeStatus>) {
  if (status === "active") {
    return "Live now";
  }

  if (status === "upcoming") {
    return "Opens soon";
  }

  return "Locked";
}

export function ChallengeShell({ bundle }: ChallengeShellProps) {
  const draftCountRef = useRef(3);
  const router = useRouter();
  const [participantId, setParticipantId] = useState(
    bundle.participants.find((participant) => participant.isActive)?.id ?? "",
  );
  const [setDrafts, setSetDrafts] = useState<SetDraft[]>([
    buildDraftSet("draft-1", "20"),
    buildDraftSet("draft-2", "20"),
  ]);
  const [sessions, setSessions] = useState<Session[]>(bundle.sessions);
  const [flash, setFlash] = useState<FlashMessage>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const challengeStatus = getChallengeStatus(bundle.challenge);
  const challengeWindow = formatChallengeWindow(bundle.challenge);
  const countdownLabel = getCountdownLabel(bundle.challenge);
  const activeParticipants = bundle.participants.filter(
    (participant) => participant.isActive,
  );
  const totalLeaderboard = buildTotalLeaderboard(bundle.participants, sessions);
  const bestSetLeaderboard = buildBestSetLeaderboard(bundle.participants, sessions);
  const recentSessions = buildSessionFeed(bundle.participants, sessions).slice(0, 6);
  const totalRepsLogged = sessions.reduce(
    (sum, session) => sum + getSessionTotal(session),
    0,
  );
  const previewReps = setDrafts.reduce((sum, draft) => {
    const reps = Number.parseInt(draft.reps, 10);
    return Number.isFinite(reps) && reps > 0 ? sum + reps : sum;
  }, 0);
  const previewSetCount = setDrafts.filter((draft) => {
    const reps = Number.parseInt(draft.reps, 10);
    return Number.isFinite(reps) && reps > 0;
  }).length;
  const canSubmit = challengeStatus === "active" && activeParticipants.length > 0;

  function addSetDraft() {
    const nextId = `draft-${draftCountRef.current}`;
    draftCountRef.current += 1;
    setSetDrafts((current) => [...current, buildDraftSet(nextId)]);
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
    setSetDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, reps } : draft)),
    );
  }

  function resetDrafts() {
    draftCountRef.current = 3;
    setSetDrafts([buildDraftSet("draft-1", "20"), buildDraftSet("draft-2", "20")]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (challengeStatus !== "active") {
      setFlash({
        tone: "error",
        text: "This challenge is not accepting submissions right now.",
      });
      return;
    }

    if (!participantId) {
      setFlash({
        tone: "error",
        text: "Pick a participant before submitting a session.",
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
          participantId,
          sets: parsedSets,
        }),
      });
      const payload = (await response.json()) as
        | { error?: string; session?: Session }
        | undefined;

      if (!response.ok || !payload?.session) {
        setFlash({
          tone: "error",
          text: payload?.error ?? "The session could not be saved.",
        });
        return;
      }

      const participantName =
        bundle.participants.find((participant) => participant.id === participantId)
          ?.displayName ?? "Participant";

      setSessions((current) => [...current, payload.session!]);
      resetDrafts();
      setFlash({
        tone: "success",
        text: `${participantName} logged ${getSessionTotal(payload.session)} pushups across ${payload.session.sets.length} sets.`,
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
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,_rgba(240,86,43,0.26),_transparent_58%)] lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--line-strong)] bg-[var(--panel-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {bundle.challenge.exerciseType}
              </span>
              <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                {statusLabel(challengeStatus)}
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-[family-name:var(--font-heading)] text-5xl leading-none tracking-[0.02em] text-[var(--accent-deep)] sm:text-7xl">
                {bundle.challenge.title}
              </p>
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                Batch-submit each workout session, stack total reps for the week,
                and chase the biggest single set.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Window" value={challengeWindow} />
              <StatTile label="Clock" value={countdownLabel} />
              <StatTile label="Field" value={`${activeParticipants.length} athletes`} />
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickLink href="#submit">Log session</QuickLink>
              <QuickLink href="#totals">Total reps</QuickLink>
              <QuickLink href="#best-set">Best set</QuickLink>
            </div>
          </div>

          <div className="grid gap-3 self-start sm:grid-cols-3 lg:grid-cols-1">
            <PulseCard
              eyebrow="Challenge pulse"
              value={`${totalRepsLogged}`}
              subcopy="Total pushups logged so far"
            />
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
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <Panel
          eyebrow="Log session"
          id="submit"
          title="Simple batch entry"
          description="Pick a name, enter each set from the workout, and submit the whole session at once."
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Participant
              </span>
              <select
                className="rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)]"
                disabled={activeParticipants.length === 0 || isSubmitting}
                onChange={(event) => setParticipantId(event.target.value)}
                value={participantId}
              >
                {activeParticipants.length > 0 ? (
                  activeParticipants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.displayName}
                    </option>
                  ))
                ) : (
                  <option value="">No participants yet</option>
                )}
              </select>
            </label>

            {activeParticipants.length === 0 ? (
              <EmptyBlock text="No active participants have been created yet. Add participants in Supabase before accepting submissions." />
            ) : null}

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Sets
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    One box equals one set in this session.
                  </p>
                </div>
                <button
                  className="rounded-full border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
                  disabled={isSubmitting || setDrafts.length >= MAX_SETS_PER_SESSION}
                  onClick={addSetDraft}
                  type="button"
                >
                  Add set
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {setDrafts.map((draft, index) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"
                    key={draft.id}
                  >
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[var(--muted)]">
                        Set {index + 1}
                      </span>
                      <input
                        className="rounded-2xl border border-[var(--line-strong)] bg-white px-4 py-3.5 text-lg font-semibold outline-none transition focus:border-[var(--accent)]"
                        disabled={isSubmitting}
                        inputMode="numeric"
                        min={1}
                        max={MAX_REPS_PER_SET}
                        onChange={(event) => updateSetDraft(draft.id, event.target.value)}
                        placeholder="20"
                        type="number"
                        value={draft.reps}
                      />
                    </label>
                    <button
                      className="self-end rounded-2xl border border-[var(--line)] px-4 py-3.5 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isSubmitting || setDrafts.length === 1}
                      onClick={() => removeSetDraft(draft.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 sm:grid-cols-3">
              <SummaryStat label="Sets ready" value={`${previewSetCount}`} />
              <SummaryStat label="Projected reps" value={`${previewReps}`} />
              <SummaryStat label="Challenge status" value={statusLabel(challengeStatus)} />
            </div>

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
                {isSubmitting ? "Saving..." : "Submit session"}
              </button>
              <button
                className="w-full rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] sm:w-auto"
                disabled={isSubmitting}
                onClick={resetDrafts}
                type="button"
              >
                Reset sets
              </button>
            </div>

            <p className="text-sm text-[var(--muted)]">
              Sessions save immediately once submitted. Basic server-side validation and rate limiting are enabled.
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
    <div className="rounded-[1.35rem] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
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
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <p className="mt-2 font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">{subcopy}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] bg-white/75 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
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
            className="rounded-[1.35rem] border border-[var(--line)] bg-white/80 px-4 py-4"
            key={entry.participantId}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
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
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SummaryStat label="Best set" value={`${entry.bestSet}`} />
              <SummaryStat label="Sessions" value={`${entry.sessionCount}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <DesktopGridTable
          columnsClass="grid-cols-[0.72fr_1.5fr_1fr_1fr_1fr]"
          headings={["Rank", "Athlete", "Total", "Best set", "Sessions"]}
          rows={entries.map((entry, index) => [
            `#${index + 1}`,
            entry.displayName,
            `${entry.totalReps}`,
            `${entry.bestSet}`,
            `${entry.sessionCount}`,
          ])}
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
        {entries.map((entry, index) => (
          <div
            className="rounded-[1.35rem] border border-[var(--line)] bg-white/80 px-4 py-4"
            key={entry.participantId}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
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
                  reps
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <DesktopGridTable
          columnsClass="grid-cols-[0.72fr_1.5fr_1fr_1.15fr]"
          headings={["Rank", "Athlete", "Reps", "When"]}
          rows={entries.map((entry, index) => [
            `#${index + 1}`,
            entry.displayName,
            `${entry.reps}`,
            entry.submittedAt ? formatDateTime(entry.submittedAt) : "No sets yet",
          ])}
        />
      </div>
    </>
  );
}

function DesktopGridTable({
  columnsClass,
  headings,
  rows,
}: {
  columnsClass: string;
  headings: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-white/75">
      <div className="min-w-[34rem]">
        <div
          className={`grid gap-3 border-b border-[var(--line)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)] sm:px-5 ${columnsClass}`}
        >
          {headings.map((heading) => (
            <div key={heading}>{heading}</div>
          ))}
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rows.map((row, rowIndex) => (
            <div
              className={`grid gap-3 px-4 py-4 sm:px-5 ${columnsClass}`}
              key={`${row[1]}-${rowIndex}`}
            >
              {row.map((cell, cellIndex) => (
                <div
                  className={`text-sm ${
                    cellIndex === 0
                      ? "font-semibold text-[var(--muted)]"
                      : cellIndex === 1
                        ? "font-semibold text-[var(--foreground)]"
                        : "text-[var(--foreground)]"
                  }`}
                  key={`${cell}-${cellIndex}`}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
