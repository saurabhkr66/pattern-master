"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PracticeButton from "@/components/patterns/PracticeButton";
import { BE } from "@/lib/theme";
import type { DppPracticeQuestion } from "@/lib/dppPractice";

// Practice mode: the DPP worked untimed, one question at a time, answer revealed
// after each submit. Nothing is scored, stored or shareable — that is what makes
// it different from the Test mode next to it in the picker, and why there is no
// DppRun row here (a reveal-as-you-go score is not comparable to a timed one, so
// ranking it against test runs would be dishonest).
//
// Wraps PracticeButton, which is reused rather than reimplemented. Two of its
// props exist for this host:
//   urlSync={false}  — its default effect rewrites the URL to /practice?q=…,
//                      which would eject the student mid-sheet.
//   onComplete       — without it, an empty queue falls through to
//                      /api/generate-question and appends an AI question that
//                      is not part of the DPP.

export default function DppPracticeClient({
  dppId,
  patternId,
  title,
  topicName,
  questions,
  startQuestionId = null,
}: {
  dppId: string;
  patternId: string;
  title: string;
  topicName: string;
  questions: DppPracticeQuestion[];
  /** Open this question first (its DppQuestion id), then carry on through the
   *  rest of the sheet. Set by `?q=` — the mistake room links each wrong answer
   *  to the exact question rather than dropping the student at question 1. */
  startQuestionId?: string | null;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  // "Practise again" restarts the WHOLE sheet, even when this visit was a deep
  // link — having finished the tail of the sheet, replaying just that tail again
  // is not what the button offers.
  const [fromTop, setFromTop] = useState(false);

  // An id that matches nothing (question deleted or edited out of the sheet since
  // the run) falls back to the start rather than rendering an empty sheet.
  const startIdx = useMemo(() => {
    if (fromTop || !startQuestionId) return 0;
    const i = questions.findIndex((q) => q.id === startQuestionId);
    return i >= 0 ? i : 0;
  }, [questions, startQuestionId, fromTop]);

  // Memoised so the identity is stable across re-renders. PracticeButton's
  // initial-question effect watches these two props, and while its id guard
  // already prevents a mid-sheet reset, a fresh array every render makes that
  // effect run on every keystroke-driven state change for no reason.
  const first = useMemo(() => questions[startIdx], [questions, startIdx]);
  const rest = useMemo(() => questions.slice(startIdx + 1), [questions, startIdx]);

  const backToDpp = () => router.push(`/dpp/${dppId}`);

  if (done) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px 64px", color: BE.text }}>
        <div
          style={{
            border: `1px solid ${BE.line}`,
            borderRadius: 16,
            padding: "28px 22px",
            textAlign: "center",
            background: BE.surface,
          }}
        >
          <div style={{ fontSize: 34, lineHeight: 1 }}>✅</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "14px 0 6px" }}>Sheet complete</h1>
          {/* Counts what they actually worked, not the sheet size — a deep link
              from the mistake room starts partway in, and claiming they did
              "all 20" when they did the last 3 would be plainly wrong. */}
          <p style={{ fontSize: 13.5, color: BE.textDim, margin: 0 }}>
            You worked through {startIdx === 0 ? "all " : ""}
            {questions.length - startIdx} question
            {questions.length - startIdx === 1 ? "" : "s"} of {title}.
          </p>
          <p style={{ fontSize: 12.5, color: BE.textMute, marginTop: 10 }}>
            Practice runs aren&apos;t scored. Retake it as a timed test to set a fresh
            score you can challenge a friend with.
          </p>

          <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
            <Link
              href={`/dpp/${dppId}`}
              style={{
                padding: "13px 16px",
                borderRadius: 12,
                background: BE.accent,
                color: "#1a1205",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Retake as a timed test →
            </Link>
            <button
              onClick={() => {
                setFromTop(true);
                setDone(false);
              }}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${BE.line}`,
                background: "transparent",
                color: BE.textDim,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {startIdx === 0 ? "Practise again" : "Practise the whole sheet"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 12px 64px", color: BE.text }}>
      <div style={{ marginBottom: 14 }}>
        <Link href={`/dpp/${dppId}`} style={{ color: BE.textDim, fontSize: 13, textDecoration: "none" }}>
          ← {title}
        </Link>
        <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 4 }}>
          Practice · untimed · not scored
        </div>
      </div>

      {/* "Practise again" works without a `key`: the `done` branch above returns
          early, so PracticeButton unmounts and its question/history/timer state
          is destroyed. Coming back mounts it fresh at question 1. */}
      <PracticeButton
        patternId={patternId}
        topicName={topicName}
        initialQuestion={first}
        initialQueue={rest}
        urlSync={false}
        onComplete={() => setDone(true)}
        onExit={backToDpp}
      />
    </div>
  );
}
