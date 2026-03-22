import { redirect } from "next/navigation";
import { getActiveChallengeBundle } from "@/lib/challenge-repository";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const bundle = await getActiveChallengeBundle();

  if (!bundle) {
    return <EmptyHomeState configured={isSupabaseConfigured()} />;
  }

  redirect(`/challenges/${bundle.challenge.slug}`);
}

function EmptyHomeState({ configured }: { configured: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Workout Challenge
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-5xl leading-none text-[var(--accent-deep)] sm:text-7xl">
          No data loaded
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          {configured
            ? "There is nothing to show yet. Add this week's challenge and refresh when you're ready."
            : "There is nothing to show yet. Connect the app data source and refresh when you're ready."}
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
          Once a challenge is created, the app will load it automatically.
        </div>
      </section>
    </main>
  );
}
