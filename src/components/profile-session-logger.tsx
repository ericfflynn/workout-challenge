"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getChallengeStatus, getSessionTotal, formatDateTime } from "@/lib/challenge-utils";
import type { Challenge, Participant, Session } from "@/lib/types";
import {
  MAX_REPS_PER_SET,
  MAX_SETS_PER_SESSION,
} from "@/lib/session-submission";

type ProfileSessionLoggerProps = {
  challenge: Challenge | null;
  participant: Participant;
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

function sanitizeRepsInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
}

export function ProfileSessionLogger({
  challenge,
  participant,
}: ProfileSessionLoggerProps) {
  const draftCountRef = useRef(2);
  const lastTouchActionRef = useRef(0);
  const router = useRouter();
  const [setDrafts, setSetDrafts] = useState<SetDraft[]>([buildDraftSet("draft-1", "")]);
  const [flash, setFlash] = useState<FlashMessage>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  const challengeStatus = challenge ? getChallengeStatus(challenge, currentTime) : "ended";
  const previewReps = setDrafts.reduce((sum, draft) => {
    const reps = Number.parseInt(draft.reps, 10);
    return Number.isFinite(reps) && reps > 0 ? sum + reps : sum;
  }, 0);
  const previewSetCount = setDrafts.filter((draft) => {
    const reps = Number.parseInt(draft.reps, 10);
    return Number.isFinite(reps) && reps > 0;
  }).length;
  const canSubmit = challengeStatus === "active" && Boolean(challenge);

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
    setSetDrafts([buildDraftSet("draft-1", "")]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challenge || challengeStatus !== "active") {
      setFlash({
        tone: "error",
        text: challenge
          ? `This challenge is not accepting submissions right now. Logging will reopen when an active challenge exists.`
          : "There is no active challenge to count this session toward yet.",
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
          challengeId: challenge.id,
          participantId: participant.id,
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
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          Logging as
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
          {participant.displayName}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {challenge
            ? challengeStatus === "active"
              ? `This pushup session will count toward ${challenge.title} right away.`
              : `The latest challenge is ${challenge.title}. Logging is disabled until a challenge is live.`
            : "No challenge is available yet. Once one is active, sessions logged here can flow into it."}
        </p>
      </div>

      {challenge ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailCard label="Challenge" value={`Week ${challenge.weekNumber}`} />
          <DetailCard label="Window" value={formatDateTime(challenge.endAt)} />
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Sets
          </p>
          <p className="text-sm text-[var(--muted)]">
            Add each pushup set from this workout.
          </p>
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
            : challengeStatus !== "active"
              ? "No active challenge"
              : "Log pushup session"}
        </button>
        <button
          className="w-full rounded-full border border-[var(--line-strong)] px-5 py-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] sm:w-auto"
          disabled={isSubmitting}
          onClick={(event) => {
            event.preventDefault();
            resetDrafts();
          }}
          type="button"
        >
          Reset
        </button>
      </div>
    </form>
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

function DetailCard({ label, value }: { label: string; value: string }) {
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
