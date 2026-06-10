"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TestEngine, { type SubmitAnswer } from "@/components/test/TestEngine";
import type { TestQuestion, DraftState } from "@/components/test/testEngineTypes";
import { isTabSwitchSuppressed } from "@/components/test/tabSwitchSuppress";
import type { ExamConfig } from "@/lib/examConfigs";

// Wraps the existing consumer TestEngine for coaching tests. We reuse the
// engine's autosave + crash-flush machinery, but point it at the coaching
// save route (attempt-scoped, Redis-backed) and seed it with any draft restored
// on the server. Submission posts to the coaching submit endpoint (scoring +
// billing happen server-side there) and retries on transient failure so a
// timer-fired auto-submit can't silently lose an attempt.
export default function StudentTestRunner({
  slug,
  testId,
  attemptId,
  questions,
  config,
  serverExpiresAt,
  studentName,
  initialState,
}: {
  slug: string;
  testId: string;
  attemptId: string;
  questions: TestQuestion[];
  config: ExamConfig;
  serverExpiresAt: string;
  studentName: string;
  initialState: DraftState | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tab-switch detection: count each time the page is hidden (tab change,
  // minimise, app switch). Fire-and-forget; the admin sees the count in results.
  // Suppressed while the native camera is open (photographing a subjective
  // answer hides the page too — that's not cheating).
  useEffect(() => {
    function onHidden() {
      if (isTabSwitchSuppressed()) return;
      if (document.visibilityState === "hidden") {
        navigator.sendBeacon?.(
          `/api/student/test/${testId}/tab-switch`,
          new Blob([JSON.stringify({ attemptId })], { type: "application/json" })
        );
      }
    }
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [testId, attemptId]);

  async function onSubmit(answers: SubmitAnswer[], timeTakenSecs: number) {
    setSubmitting(true);
    setSubmitError(null);

    const body = JSON.stringify({
      attemptId,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        timeSpentSecs: a.timeSpentSecs ?? 0,
      })),
      timeTakenSecs,
    });

    // The submit endpoint is idempotent (re-submitting a graded attempt is a
    // no-op), so retrying is safe — even if an earlier try actually landed but
    // its response was lost. This matters most for the timer-fired auto-submit,
    // which otherwise gets exactly one shot: a single transient blip there would
    // lose the whole attempt. Backoff: 1s, 2s, 4s, 8s (capped).
    const MAX_ATTEMPTS = 5;
    let delay = 1000;
    let lastError = "Failed to submit";
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        const res = await fetch(`/api/student/test/${testId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          router.replace(`/c/${slug}/result/${attemptId}`);
          return;
        }
        // Deadline passed (server refused a late submit). The student's answers
        // were autosaved to Redis; the result page finalizes from them on view.
        // Send them there rather than dead-ending on an error.
        if (res.status === 403) {
          router.replace(`/c/${slug}/result/${attemptId}`);
          return;
        }
        // 4xx (except rate-limit/timeout) is a permanent client error — don't
        // hammer the server, surface it immediately.
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          setSubmitError(data.error ?? "Failed to submit");
          setSubmitting(false);
          return;
        }
        lastError = data.error ?? "Server error — retrying…";
      } catch {
        lastError = "Network error — retrying…";
      }
      if (i < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 8000);
      }
    }
    setSubmitError(`${lastError.replace(/ — retrying…$/, "")} — please try again`);
    setSubmitting(false);
  }

  return (
    <TestEngine
      questions={questions}
      config={config}
      mockTestId={null}
      mockTestTitle={config.label}
      onSubmit={onSubmit}
      submitting={submitting}
      submitError={submitError}
      draftId={attemptId}
      saveEndpoint={`/api/student/test/${testId}/save`}
      autosaveIntervalMs={120_000}
      subjectiveUpload={{ endpoint: `/api/student/test/${testId}/upload-answer`, attemptId }}
      serverExpiresAt={serverExpiresAt}
      initialState={initialState}
      userName={studentName}
    />
  );
}
