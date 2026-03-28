"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Participant } from "@/lib/types";

type AppHeaderProps = {
  participants: Participant[];
  selectedParticipantId?: string;
  challengeSlug?: string | null;
};

export function AppHeader({
  participants,
  selectedParticipantId,
  challengeSlug,
}: AppHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedSelectedParticipantId =
    participants.find((participant) => participant.id === selectedParticipantId)?.id ?? "";
  const isChallengeRoute = pathname.startsWith("/challenges/");
  const profileHref = normalizedSelectedParticipantId
    ? `/profiles/${normalizedSelectedParticipantId}`
    : "/";
  const challengeHref = challengeSlug
    ? buildChallengeHref(
        `/challenges/${challengeSlug}`,
        normalizedSelectedParticipantId,
        searchParams,
      )
    : profileHref;

  function handleProfileChange(nextParticipantId: string) {
    const nextHref = isChallengeRoute
      ? buildChallengeHref(pathname, nextParticipantId, searchParams)
      : nextParticipantId
        ? `/profiles/${nextParticipantId}`
        : "/";

    window.location.assign(nextHref);
  }

  return (
    <>
      <header className="mb-6 space-y-3 sm:mb-8">
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,250,244,0.96)] p-3 shadow-[0_18px_38px_rgba(77,32,12,0.10)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <label
                className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block"
                htmlFor="profile-picker"
              >
                Profile
              </label>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Jump between people without leaving the current flow.
              </p>
            </div>

            <div className="hidden sm:block sm:w-[19rem]">
              <select
                className="w-full rounded-[1.15rem] border border-[var(--line)] bg-white/92 px-4 py-3 text-sm font-semibold text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-white disabled:cursor-wait disabled:opacity-70"
                defaultValue={normalizedSelectedParticipantId}
                id="profile-picker"
                key={normalizedSelectedParticipantId || "none"}
                onChange={(event) => handleProfileChange(event.target.value)}
              >
                <option value="">Choose a profile</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <nav className="mt-3 hidden grid-cols-2 rounded-[1.1rem] bg-[rgba(255,255,255,0.62)] p-1 sm:grid">
            <NavLink
              href={profileHref}
              isActive={pathname === "/" || pathname.startsWith("/profiles/")}
              label="Profile"
            />
            <NavLink
              href={challengeHref}
              isActive={pathname.startsWith("/challenges/")}
              label="Challenge"
            />
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-2 rounded-[1.35rem] border border-[var(--line)] bg-[rgba(255,250,244,0.98)] p-1.5 shadow-[0_18px_40px_rgba(34,22,18,0.16)] sm:hidden">
        <NavLink
          href={profileHref}
          isActive={pathname === "/" || pathname.startsWith("/profiles/")}
          label="Profile"
          mobile
        />
        <NavLink
          href={challengeHref}
          isActive={pathname.startsWith("/challenges/")}
          label="Challenge"
          mobile
        />
      </nav>
    </>
  );
}

function buildChallengeHref(
  path: string,
  participantId: string,
  searchParams: ReturnType<typeof useSearchParams>,
) {
  const params = new URLSearchParams(searchParams.toString());

  if (participantId) {
    params.set("participantId", participantId);
  } else {
    params.delete("participantId");
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function NavLink({
  href,
  isActive,
  label,
  mobile = false,
}: {
  href: string;
  isActive: boolean;
  label: string;
  mobile?: boolean;
}) {
  return (
    <Link
      className={`flex min-w-0 items-center justify-center gap-2 rounded-[0.95rem] px-3 py-2.5 font-semibold transition ${
        mobile ? "flex-col text-[11px]" : "text-sm"
      } ${
        isActive
          ? "bg-white text-[var(--accent-deep)] shadow-[0_8px_18px_rgba(77,32,12,0.08)]"
          : "text-[var(--muted)] hover:bg-white/80 hover:text-[var(--foreground)]"
      }`}
      href={href}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">
        {label === "Profile" ? <ProfileIcon /> : <ChallengeIcon />}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function ChallengeIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M5 2.5h6M4.5 5h7m-8 3.5h9M4.5 13h7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm4.5 5a4.5 4.5 0 0 0-9 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}
