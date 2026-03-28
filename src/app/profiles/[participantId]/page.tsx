import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileShell } from "@/components/profile-shell";
import { getParticipantProfileBundle } from "@/lib/profile-repository";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  params: Promise<{
    participantId: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { participantId } = await params;
  const bundle = await getParticipantProfileBundle(participantId);

  if (!bundle) {
    return {
      title: "Profile Not Found",
    };
  }

  return {
    title: `${bundle.participant.displayName} | Workout Profile`,
    description: `Lifetime workout stats and challenge history for ${bundle.participant.displayName}.`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { participantId } = await params;
  const bundle = await getParticipantProfileBundle(participantId);

  if (!bundle) {
    notFound();
  }

  return (
    <ProfileShell
      bundle={bundle}
      selectedParticipantId={participantId}
    />
  );
}
