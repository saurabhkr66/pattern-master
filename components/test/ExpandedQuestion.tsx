"use client";

import { CheckCircle2, XCircle, Brain, Hourglass, Camera } from "lucide-react";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import type { ResultData } from "./testAnalysisHelpers";

interface Props {
  q: ResultData["questions"][number];
  status: string;
  statusColor: string;
  compact?: boolean;
  // Signed GET URLs for subjective answer photos, keyed by R2 object key.
  // Provided fresh per page render (URLs expire; keys are what's stored).
  imageUrlMap?: Record<string, string>;
}

export default function ExpandedQuestion({ q, status, compact, imageUrlMap }: Props) {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const correctLetters = new Set(
    (q.correct_answer || "").split(/[;,]/).map(l => l.trim().toUpperCase()).filter(Boolean)
  );
  const userLetters = new Set(
    (q.user_answer || "").split(/[;,]/).map(l => l.trim().toUpperCase()).filter(Boolean)
  );

  return (
    <div style={{ padding: compact ? "0" : "0 24px 24px", borderTop: `1px solid ${BE.line}`, background: "rgba(0,0,0,0.18)" }}>
      <div className={`rounded-xl border space-y-6 ${compact ? "mt-0 p-3 rounded-none border-x-0 border-b-0" : "mt-5 p-6"}`} style={{ borderColor: BE.line, background: "var(--surface, #111)" }}>

        <div style={{ fontSize: 15, lineHeight: 1.7, color: BE.text }}>
          <MathRenderer content={q.question_text} />
        </div>

        {q.options && q.question_type !== "NAT" && (
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const letter = optionLetters[oi];
              const isCorrect = correctLetters.has(letter);
              const isUser = userLetters.has(letter);
              const isWrongUser = isUser && !isCorrect;

              let bg = "rgba(255,255,255,0.03)";
              let border = BE.line;
              let letterBg = "rgba(255,255,255,0.05)";
              let letterColor = BE.textMute;
              let textColor = BE.textDim;

              if (isCorrect) {
                bg = BE.good + "14";
                border = BE.good + "55";
                letterBg = BE.good;
                letterColor = "#fff";
                textColor = BE.text;
              } else if (isWrongUser) {
                bg = BE.bad + "14";
                border = BE.bad + "55";
                letterBg = BE.bad;
                letterColor = "#fff";
                textColor = BE.text;
              }

              return (
                <div key={oi} className="flex items-start gap-3 p-3 rounded-lg border" style={{ background: bg, borderColor: border }}>
                  <div className="flex items-center justify-center rounded-md text-xs font-bold shrink-0 mt-0.5" style={{ width: 26, height: 26, background: letterBg, color: letterColor, fontFamily: BE.mono }}>
                    {letter}
                  </div>
                  <div style={{ fontSize: 14, color: textColor, paddingTop: 2 }}>
                    <MathRenderer content={typeof opt === "string" ? opt.replace(/^[A-F]\.\s*/, "") : String(opt)} />
                  </div>
                  {isCorrect && <CheckCircle2 size={15} className="shrink-0 ml-auto mt-1" style={{ color: BE.good }} />}
                  {isWrongUser && !isCorrect && <XCircle size={15} className="shrink-0 ml-auto mt-1" style={{ color: BE.bad }} />}
                </div>
              );
            })}
          </div>
        )}

        {q.question_type === "SUBJECTIVE" && q.subjective && (
          <div className="space-y-4">
            {/* The student's photographed answer */}
            {q.subjective.imageKeys.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2" style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <Camera size={13} /> Answer photos
                </div>
                <div className="flex flex-wrap gap-3">
                  {q.subjective.imageKeys.map((k, i) =>
                    imageUrlMap?.[k] ? (
                      <a key={k} href={imageUrlMap[k]} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrlMap[k]}
                          alt={`Answer page ${i + 1}`}
                          className="rounded-lg border object-cover"
                          style={{ width: 140, height: 190, borderColor: BE.line }}
                        />
                      </a>
                    ) : (
                      <div
                        key={k}
                        className="flex items-center justify-center rounded-lg border text-xs"
                        style={{ width: 140, height: 190, borderColor: BE.line, color: BE.textMute }}
                      >
                        Page {i + 1}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Grading state */}
            {q.subjective.pending ? (
              <div className="flex items-center gap-2.5 p-4 rounded-xl border" style={{ borderColor: BE.warn + "55", background: BE.warn + "10" }}>
                <Hourglass size={15} style={{ color: BE.warn }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: BE.warn }}>Pending teacher review</div>
                  <div style={{ fontSize: 12, color: BE.textDim }}>
                    Marks for this answer will be added once it is reviewed.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border" style={{ borderColor: BE.line, background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase" }}>
                    Marks awarded
                  </span>
                  <span style={{ fontSize: 10, color: BE.textMute }}>
                    {q.subjective.gradedBy ? "Graded by teacher" : "AI graded"}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: BE.mono, color: (q.subjective.marks ?? 0) > 0 ? BE.good : BE.bad }}>
                  {q.subjective.marks ?? 0} / {q.marks}
                </div>
                {q.subjective.feedback && (
                  <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: BE.textDim }}>
                    {q.subjective.feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {q.question_type === "NAT" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border" style={{ borderColor: status === "correct" ? BE.good + "55" : BE.bad + "55", background: status === "correct" ? BE.good + "10" : BE.bad + "10" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", marginBottom: 6 }}>Your Answer</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: BE.text, fontFamily: BE.mono }}>{q.user_answer ?? "—"}</div>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: BE.good + "55", background: BE.good + "10" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", marginBottom: 6 }}>Correct Answer</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: BE.good, fontFamily: BE.mono }}>{q.correct_answer}</div>
            </div>
          </div>
        )}

        {q.explanation && (
          <div className="p-5 rounded-xl border-l-4" style={{ background: BE.accentSoft, borderColor: BE.accent }}>
            <div className="flex items-center gap-2 mb-2" style={{ fontSize: 11, fontWeight: 700, color: BE.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <Brain size={13} /> Solution
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.65, color: BE.textDim }}>
              <MathRenderer content={q.explanation} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
