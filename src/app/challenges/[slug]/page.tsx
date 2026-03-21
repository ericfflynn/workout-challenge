import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeShell } from "@/components/challenge-shell";
import { getChallengeBundleBySlug } from "@/lib/challenge-repository";

export const dynamic = "force-dynamic";

type ChallengePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ChallengePageProps): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getChallengeBundleBySlug(slug);

  if (!bundle) {
    return {
      title: "Challenge Not Found",
    };
  }

  return {
    title: `${bundle.challenge.title} | Workout Challenge`,
    description: bundle.challenge.description,
  };
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { slug } = await params;
  const bundle = await getChallengeBundleBySlug(slug);

  if (!bundle) {
    notFound();
  }

  return <ChallengeShell bundle={bundle} />;
}
