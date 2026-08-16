"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BE } from "@/lib/theme";
import MathInline from "@/components/ui/MathInline";
import type {
  MockMistakePaper,
  DppMistakePaper,
  WrongQuestion,
} from "@/app/(app)/mistakes/page";

export default function MistakesTabs({
  practice,
  mockPapers,
  dppPapers,
}: {
  practice: ReactNode;
  mockPapers: MockMistakePaper[];
  dppPapers: DppMistakePaper[];
}) {
  const [tab, setTab] = useState<"practice" | "mocks" | "dpp">("practice");

  const totalMockWrong = mockPapers.reduce((s, p) => s + p.wrong.length, 0);
  const totalDppWrong = dppPapers.reduce((s, p) => s + p.wrong.length, 0);

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: `1px solid ${BE.line}`,
          marginBottom: 24,
        }}
      >
        {[
          { key: "practice" as const, label: "Practice", count: null as number | null },
          { key: "mocks" as const, label: "Mocks", count: totalMockWrong },
          { key: "dpp" as const, label: "DPP", count: totalDppWrong },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? BE.accent : "transparent"}`,
                color: active ? BE.text : BE.textMute,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                marginBottom: -1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: BE.mono,
                    padding: "1px 6px",
                    borderRadius: 8,
                    background: active ? BE.accentSoft : "rgba(255,255,255,0.06)",
                    color: active ? BE.accent : BE.textMute,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "practice" ? practice : tab === "mocks" ? (
        <MocksPanel papers={mockPapers} />
      ) : (
        <DppPanel papers={dppPapers} />
      )}
    </div>
  );
}

/** The wrong-question list inside an expanded paper. Shared by both panels —
 *  they differ only in where a row links to, so `href` is the one parameter.
 *
 *  A FUNCTION rather than a string because DPP rows resolve per question: each
 *  one deep-links into practice at the question it is about. Mocks have no
 *  equivalent per-question destination and pass a constant. */
function WrongRows({
  wrong,
  href,
}: {
  wrong: WrongQuestion[];
  href: (w: WrongQuestion) => string;
}) {
  return (
    <div style={{ borderTop: `1px solid ${BE.line}` }}>
      {wrong.map((w, i) => (
        <Link
          key={`${w.questionId}-${i}`}
          href={href(w)}
          style={{
            display: "block",
            padding: "12px 18px",
            borderBottom: i === wrong.length - 1 ? "none" : `1px solid ${BE.line}`,
            textDecoration: "none",
            color: "inherit",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontFamily: BE.mono, color: BE.textMute, minWidth: 24 }}>
              Q{i + 1}
            </span>
            {(w.subject || w.topic) && (
              <span style={{ fontSize: 10, color: BE.accent, fontWeight: 600 }}>
                {w.subject ?? ""}
                {w.subject && w.topic ? " · " : ""}
                {w.topic ?? ""}
              </span>
            )}
          </div>
          {/* MathInline, not MathRenderer: its output is phrasing content, so it
              is legal inside this <a> and it does not emit the <div>/<p> that
              would break the line clamp below. It also downgrades display math
              to inline, which matters here — a "$$…$$" in a question would
              otherwise render as a block and blow out the row.

              Truncation is left entirely to the CSS clamp. The old plain-text
              preview cut the string at 180 chars, which would slice through a
              LaTeX expression and leave an unparseable fragment. */}
          <div
            style={{
              fontSize: 13,
              color: BE.textDim,
              fontFamily: BE.serif,
              // Looser than the 1.5 this used as plain text: a fraction or an
              // exponent is taller than a text line, and `overflow: hidden` on
              // the clamp would shear the top off it.
              lineHeight: 1.7,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {w.questionText.trim() ? (
              <MathInline content={w.questionText} />
            ) : (
              "No question text"
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, fontFamily: BE.mono, display: "flex", gap: 16 }}>
            <span style={{ color: BE.bad }}>Your: {w.userAnswer ?? "—"}</span>
            <span style={{ color: BE.good }}>Correct: {w.correctAnswer}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DppPanel({ papers }: { papers: DppMistakePaper[] }) {
  const [expanded, setExpanded] = useState<string | null>(papers[0]?.runId ?? null);

  if (papers.length === 0) {
    return (
      <div
        style={{
          border: `1px solid ${BE.line}`,
          borderRadius: 14,
          padding: "48px 24px",
          textAlign: "center",
          background: BE.surface,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: BE.text, marginBottom: 4 }}>
          No DPP mistakes yet
        </div>
        <div style={{ fontSize: 13, color: BE.textDim, marginBottom: 16 }}>
          Take a daily practice sheet — wrong questions from your latest attempt at each
          one show up here.
        </div>
        <Link
          href="/dpp"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            borderRadius: 10,
            background: BE.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Browse DPPs →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {papers.map((p) => {
        const isOpen = expanded === p.runId;
        // The run's own analysis page, which is where every answer and
        // explanation already lives. Falls back to the sheet when a run somehow
        // has no share code.
        const analysisHref = p.shareCode ? `/dpp/r/${p.shareCode}` : `/dpp/${p.dppId}`;

        // Practice, opened AT a specific question. Landing on question 1 of a
        // 20-question sheet to re-do the one you got wrong is most of the work
        // for none of the point, so every practice link here carries `?q=`.
        const practiceHref = (questionId: string) =>
          `/dpp/${p.dppId}/practice?q=${encodeURIComponent(questionId)}`;

        // A row goes to its own question when practice is open; otherwise to the
        // analysis, which is the only place left that shows the answer.
        const rowHref = (w: WrongQuestion) =>
          p.practiceAvailable ? practiceHref(w.questionId) : analysisHref;
        return (
          <div
            key={p.runId}
            style={{
              border: `1px solid ${BE.line}`,
              borderRadius: 14,
              background: BE.surface,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : p.runId)}
              style={{
                width: "100%",
                padding: "16px 18px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: BE.badSoft,
                  color: BE.bad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: BE.mono,
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {p.wrong.length}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: BE.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 11, color: BE.textMute, marginTop: 2 }}>
                  {p.subject} · {p.topicName} · taken{" "}
                  {format(new Date(p.takenAt), "d MMM yyyy")} · {p.wrong.length} wrong
                </div>
              </div>

              {/* Re-working the sheet untimed is the natural fix for a DPP
                  mistake, and it is already unlocked for anyone in this list —
                  practice mode's gate is exactly "has submitted a run". */}
              {/* Starts at the FIRST question they got wrong, not at question 1
                  — this button exists to fix these mistakes, and the sheet's
                  opening questions are usually not among them. */}
              {p.practiceAvailable && p.wrong.length > 0 && (
                <Link
                  href={practiceHref(p.wrong[0].questionId)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 12,
                    color: BE.accent,
                    fontWeight: 600,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${BE.line}`,
                    flexShrink: 0,
                  }}
                  className="max-sm:hidden"
                >
                  Practise →
                </Link>
              )}
              <Link
                href={analysisHref}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: 12,
                  color: BE.accent,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${BE.line}`,
                  flexShrink: 0,
                }}
              >
                Open analysis →
              </Link>
              <span
                style={{
                  color: BE.textMute,
                  fontSize: 16,
                  transition: "transform 0.15s",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  flexShrink: 0,
                }}
              >
                ›
              </span>
            </button>

            {isOpen && <WrongRows wrong={p.wrong} href={rowHref} />}
          </div>
        );
      })}
    </div>
  );
}

function MocksPanel({ papers }: { papers: MockMistakePaper[] }) {
  const [expanded, setExpanded] = useState<string | null>(papers[0]?.sessionId ?? null);

  if (papers.length === 0) {
    return (
      <div
        style={{
          border: `1px solid ${BE.line}`,
          borderRadius: 14,
          padding: "48px 24px",
          textAlign: "center",
          background: BE.surface,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: BE.text, marginBottom: 4 }}>
          No mock mistakes yet
        </div>
        <div style={{ fontSize: 13, color: BE.textDim, marginBottom: 16 }}>
          Take a mock test — wrong questions from your most recent attempt will show up here.
        </div>
        <Link
          href="/test"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            borderRadius: 10,
            background: BE.accent,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Take a Mock →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {papers.map((p) => {
        const isOpen = expanded === p.sessionId;
        return (
          <div
            key={p.sessionId}
            style={{
              border: `1px solid ${BE.line}`,
              borderRadius: 14,
              background: BE.surface,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : p.sessionId)}
              style={{
                width: "100%",
                padding: "16px 18px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: BE.badSoft,
                  color: BE.bad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: BE.mono,
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {p.wrong.length}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: BE.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 11, color: BE.textMute, marginTop: 2 }}>
                  {p.examType} · taken {format(new Date(p.takenAt), "d MMM yyyy")} ·{" "}
                  {p.wrong.length} wrong
                </div>
              </div>
              <Link
                href={`/test?sessionId=${p.sessionId}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: 12,
                  color: BE.accent,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${BE.line}`,
                  flexShrink: 0,
                }}
              >
                Open analysis →
              </Link>
              <span
                style={{
                  color: BE.textMute,
                  fontSize: 16,
                  transition: "transform 0.15s",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  flexShrink: 0,
                }}
              >
                ›
              </span>
            </button>

            {/* Constant: a mock's review surface is the session as a whole,
                with no per-question entry point to deep-link to. */}
            {isOpen && <WrongRows wrong={p.wrong} href={() => `/test?sessionId=${p.sessionId}`} />}
          </div>
        );
      })}
    </div>
  );
}
