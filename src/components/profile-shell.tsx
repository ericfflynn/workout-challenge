"use client";

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { DailyRepsChart } from "@/components/daily-reps-chart";
import { formatDateTime } from "@/lib/challenge-utils";
import {
  buildChallengeHistory,
  buildDailyRepsSeries,
  buildLifetimeStats,
  buildRecentProfileSessions,
} from "@/lib/profile-utils";
import type { ParticipantProfileBundle } from "@/lib/types";

type ProfileShellProps = {
  bundle: ParticipantProfileBundle;
  selectedParticipantId: string;
};

export function ProfileShell({ bundle, selectedParticipantId }: ProfileShellProps) {
  const lifetimeStats = buildLifetimeStats(bundle.sessions);
  const challengeHistory = buildChallengeHistory(bundle.sessions);
  const dailyReps = buildDailyRepsSeries(bundle.sessions, 7);
  const recentSessions = buildRecentProfileSessions(bundle.sessions);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6">
      <AppHeader
        challengeSlug={challengeHistory[0]?.slug ?? null}
        participants={bundle.participants}
        selectedParticipantId={selectedParticipantId}
      />

      <section className="relative overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--panel)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top,_rgba(240,86,43,0.18),_transparent_58%)] lg:block"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Lifetime profile
            </span>
            <p className="font-[family-name:var(--font-heading)] text-3xl leading-none tracking-[0.02em] text-[var(--accent-deep)] sm:text-4xl">
              {bundle.participant.displayName}
            </p>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Lifetime totals across every challenge this participant has logged so far.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[22rem]">
            <MiniStat label="Reps" value={`${lifetimeStats.totalReps}`} />
            <MiniStat label="Best" value={`${lifetimeStats.bestSet}`} />
            <MiniStat label="Sessions" value={`${lifetimeStats.totalSessions}`} />
          </div>
        </div>

        <div className="relative mt-4 sm:hidden">
          <Link
            className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--accent-deep)]"
            href="/"
          >
            Choose another profile
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <Panel
          eyebrow="Momentum"
          title="Reps by day"
          description="Last 7 days of pushup volume for this profile."
        >
          <DailyRepsChart entries={dailyReps} />
        </Panel>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <Panel
          eyebrow="Challenge history"
          title="Performance by challenge"
          description="Each challenge stays separate, but this page makes the cumulative arc visible."
        >
          {challengeHistory.length > 0 ? (
            <div className="grid gap-3">
              {challengeHistory.map((entry) => (
                <Link
                  className="rounded-[1.35rem] border border-[var(--line)] bg-white/80 px-4 py-4 transition hover:border-[var(--accent)] hover:shadow-[0_12px_30px_rgba(191,47,24,0.10)]"
                  href={`/challenges/${entry.slug}`}
                  key={entry.challengeId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
                        Week {entry.weekNumber}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                        {entry.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {formatDateTime(entry.startAt)} to {formatDateTime(entry.endAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-heading)] text-4xl leading-none text-[var(--accent-deep)]">
                        {entry.totalReps}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        reps
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                    <span>{entry.totalSessions} sessions</span>
                    <span>{entry.totalSets} sets</span>
                    <span>{entry.bestSet} best set</span>
                    <span>
                      Last:{" "}
                      {entry.lastSubmittedAt
                        ? formatDateTime(entry.lastSubmittedAt)
                        : "No sessions"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock text="This participant has not logged any challenge sessions yet." />
          )}
        </Panel>
        <div className="space-y-6">
          <Panel
            eyebrow="Recent activity"
            title="Latest sessions"
            description="Most recent workouts across every challenge this participant has entered."
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
                        <Link
                          className="text-base font-semibold text-[var(--foreground)] transition hover:text-[var(--accent-deep)]"
                          href={`/challenges/${session.challengeSlug}`}
                        >
                          {session.challengeTitle}
                        </Link>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          Week {session.weekNumber} • {formatDateTime(session.submittedAt)}
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
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                      <span>{session.setCount} sets</span>
                      <span>{session.bestSet} best set</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyBlock text="No sessions have been logged by this participant yet." />
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] backdrop-blur sm:p-6">
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--line)] bg-white/70 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl leading-none text-[var(--foreground)]">
        {value}
      </p>
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
