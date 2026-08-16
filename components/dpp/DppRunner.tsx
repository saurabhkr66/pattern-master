"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TestEngine, { type SubmitAnswer, type TestQuestion } from "@/components/test/TestEngine";
import type { ExamConfig } from "@/lib/examConfigs";
import { clearLocalDraft } from "@/lib/localDraft";
import { BE } from "@/lib/theme";

// Test-mode DPP runner.
//
// TestEngine with draftId={runId} and saveEndpoint={null} — a LOCAL-ONLY draft.
// Snapshots go to IndexedDB but never to a server, so a refresh mid-test brings
// the answers back without DPP needing a draft store of its own. Paired with the
// resume logic in lib/dppRun.ts (which hands the same run row back rather than
// minting a second one) and `expiresAt` below, a reload is now fully
// recoverable: same run, same answers, same clock.
//
// submitJitterMs={0} because the default 0–20s random delay exists to spread a
// whole batch of students hitting submit at once; a solo runner has no herd, and
// the delay just reads as a frozen screen.
//
// The engine never sees an answer key — TestQuestion has no correct_answer field
// and the paper's Prisma select never fetches one. Scoring happens on the server.

export default function DppRunner({
  runId,
  questions,
  config,
  title,
  userName,
  expiresAt,
}: {
  runId: string;
  questions: TestQuestion[];
  config: ExamConfig;
  title: string;
  userName?: string;
  /** started_at + duration, ISO. The engine counts down to this instead of from
   *  the full duration, so a resumed run cannot hand out a fresh clock — which
   *  would otherwise disagree with the server's own elapsed-time derivation. */
  expiresAt: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(answers: SubmitAnswer[], timeTakenSecs: number) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dpp/run/${runId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answers.map((a) => ({
            questionId: a.questionId,
            userAnswer: a.userAnswer,
            timeSpentSecs: a.timeSpentSecs,
          })),
          // Sent for completeness only — the server derives the authoritative
          // elapsed time from started_at and ignores this.
          timeTakenSecs,
        }),
      });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(j.error ?? `Submit failed (${res.status})`);
        return;
      }

      // Graded — the local draft has no further job. Left behind it would sit in
      // IndexedDB forever (draftId is the runId, so it can never be reused).
      void clearLocalDraft(runId);

      if (j.needsAuth) {
        // Graded, but this run was taken anonymously — the score is saved and
        // ready, gated behind sign-up. /dpp/claim/[runId] shows it.
        router.replace(`/dpp/claim/${j.runId}`);
        return;
      }
      if (!j.runCode) {
        // Graded, but no share code came back (a rare collision path). The run
        // is saved; send them to the DPP list rather than a dead URL.
        router.replace("/dpp");
        return;
      }
      router.replace(`/dpp/r/${j.runCode}`);
    } catch {
      setSubmitError("Network error — your answers were not submitted. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {submitError && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: BE.badSoft,
            border: `1px solid ${BE.bad}`,
            color: BE.bad,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            maxWidth: "90vw",
          }}
        >
          {submitError}
        </div>
      )}
      <TestEngine
        questions={questions}
        config={config}
        mockTestId={null}
        mockTestTitle={title}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
        draftId={runId}
        saveEndpoint={null}
        serverExpiresAt={expiresAt}
        // No server draft to seed from — the engine recovers the IndexedDB copy
        // on mount instead (it is always the newer of the two here, since a
        // local-only draft is never marked synced).
        initialState={null}
        submitJitterMs={0}
        userName={userName}
      />
    </>
  );
}
