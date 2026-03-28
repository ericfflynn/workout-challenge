import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import type { HomePageBundle } from "@/lib/types";

type HomeShellProps = {
  bundle: HomePageBundle;
};

export function HomeShell({ bundle }: HomeShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6">
      <AppHeader
        challengeSlug={bundle.challenge?.slug ?? null}
        participants={bundle.participants}
        selectedParticipantId=""
      />

      <section className="rounded-[1.8rem] border border-[var(--line)] bg-[var(--panel)] px-6 py-8 shadow-[var(--shadow)] backdrop-blur sm:px-8 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Profile
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-5xl leading-none text-[var(--accent-deep)] sm:text-6xl">
          Please select a profile
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          Use the picker above to open a participant dashboard.
        </p>

        <div className="mt-6 grid gap-3 sm:hidden">
          {bundle.participants.map((participant) => (
            <Link
              className="rounded-[1.15rem] border border-[var(--line)] bg-white px-4 py-3 text-base font-semibold text-[var(--foreground)]"
              href={`/profiles/${participant.id}`}
              key={participant.id}
            >
              {participant.displayName}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
