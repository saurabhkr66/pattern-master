"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BE } from "@/lib/theme";
import type { MockMistakePaper } from "@/app/(app)/mistakes/page";

function toPreview(text: string, max = 180): string {
  const cleaned = text
    .replace(/\$\$[\s\S]*?\$\$/g, "[math]")
    .replace(/\$[^$\n]+?\$/g, "[math]")
    .replace(/\\\[[\s\S]*?\\\]/g, "[math]")
    .replace(/\\\([\s\S]*?\\\)/g, "[math]")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max) + "…" : cleaned;
}

export default function MistakesTabs({
  practice,
  mockPapers,
}: {
  practice: ReactNode;
  mockPapers: MockMistakePaper[];
}) {
  const [tab, setTab] = useState<"practice" | "mocks">("practice");

  const totalMockWrong = mockPapers.reduce((s, p) => s + p.wrong.length, 0);

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

      {tab === "practice" ? practice : <MocksPanel papers={mockPapers} />}
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

            {isOpen && (
              <div style={{ borderTop: `1px solid ${BE.line}` }}>
                {p.wrong.map((w, i) => (
                  <Link
                    key={`${w.questionId}-${i}`}
                    href={`/test?sessionId=${p.sessionId}`}
                    style={{
                      display: "block",
                      padding: "12px 18px",
                      borderBottom: i === p.wrong.length - 1 ? "none" : `1px solid ${BE.line}`,
                      textDecoration: "none",
                      color: "inherit",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: BE.mono,
                          color: BE.textMute,
                          minWidth: 24,
                        }}
                      >
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
                    <div
                      style={{
                        fontSize: 13,
                        color: BE.textDim,
                        fontFamily: BE.serif,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {toPreview(w.questionText) || "No question text"}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        fontFamily: BE.mono,
                        display: "flex",
                        gap: 16,
                      }}
                    >
                      <span style={{ color: BE.bad }}>
                        Your: {w.userAnswer ?? "—"}
                      </span>
                      <span style={{ color: BE.good }}>
                        Correct: {w.correctAnswer}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
