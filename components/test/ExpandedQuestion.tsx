"use client";

import { CheckCircle2, XCircle, Brain } from "lucide-react";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import type { ResultData } from "./testAnalysisHelpers";

interface Props {
  q: ResultData["questions"][number];
  status: string;
  statusColor: string;
}

export default function ExpandedQuestion({ q, status }: Props) {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const correctLetters = new Set(
    (q.correct_answer || "").split(/[;,]/).map(l => l.trim().toUpperCase()).filter(Boolean)
  );
  const userLetters = new Set(
    (q.user_answer || "").split(/[;,]/).map(l => l.trim().toUpperCase()).filter(Boolean)
  );

  return (
    <div style={{ padding: "0 24px 24px", borderTop: `1px solid ${BE.line}`, background: "rgba(0,0,0,0.18)" }}>
      <div className="rounded-xl border mt-5 p-6 space-y-6" style={{ borderColor: BE.line, background: "var(--surface, #111)" }}>

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
