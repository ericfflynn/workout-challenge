import type { DailyRepsEntry } from "@/lib/profile-utils";

type DailyRepsChartProps = {
  entries: DailyRepsEntry[];
};

export function DailyRepsChart({ entries }: DailyRepsChartProps) {
  const maxReps = Math.max(...entries.map((entry) => entry.reps), 0);
  const totalReps = entries.reduce((sum, entry) => sum + entry.reps, 0);
  const activeDays = entries.filter((entry) => entry.reps > 0).length;
  const bestDay = entries.reduce((best, entry) => Math.max(best, entry.reps), 0);

  if (maxReps === 0) {
    return (
      <EmptyBlock text="No recent reps yet. Once sessions are logged, this chart will start filling in." />
    );
  }

  return (
    <div className="rounded-[1.6rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,242,0.88))] p-4 sm:p-5">
      <div className="grid gap-2 sm:grid-cols-3">
        <SummaryTile label="Last 7 days" value={`${totalReps}`} />
        <SummaryTile label="Best day" value={`${bestDay}`} />
        <SummaryTile label="Active days" value={`${activeDays}`} />
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-[var(--line)] bg-white/80 px-3 py-4 sm:px-4">
        <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          <span>Daily reps</span>
          <span>Last 7 days</span>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-4 border-t border-dashed border-[var(--line)]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--line)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-9 border-t border-dashed border-[var(--line)]" />

          <div className="flex h-48 items-end gap-2 sm:gap-3">
        {entries.map((entry) => {
          const height = Math.max((entry.reps / maxReps) * 100, entry.reps > 0 ? 14 : 4);
          const isPeak = entry.reps === bestDay && bestDay > 0;

          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={entry.dateKey}>
              <div
                className={`text-[11px] font-semibold ${
                  entry.reps > 0 ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {entry.reps > 0 ? entry.reps : ""}
              </div>
              <div className="flex h-32 w-full items-end rounded-[1rem] bg-[var(--panel-strong)]/70 px-1.5 pb-1.5">
                <div
                  className={`w-full rounded-full ${
                    entry.reps > 0
                      ? isPeak
                        ? "bg-[linear-gradient(180deg,var(--accent),var(--accent-deep))] shadow-[0_10px_20px_rgba(191,47,24,0.18)]"
                        : "bg-[linear-gradient(180deg,rgba(240,86,43,0.92),rgba(191,47,24,0.9))]"
                      : "bg-[var(--line)]"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {entry.label}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--line)] bg-white/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-3xl leading-none text-[var(--foreground)]">
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
