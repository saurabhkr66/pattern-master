"use client";

import { useState, useMemo } from "react";
import { Clock } from "lucide-react";
import { BE } from "@/lib/theme";
import ExpandedQuestion from "./ExpandedQuestion";
import { shortAns, fmtTime, plainPreview, COL_STYLE, type ResultData } from "./testAnalysisHelpers";

type Filter = "all" | "correct" | "incorrect" | "skipped" | "slow";

interface Props {
  questions: ResultData["questions"];
}

export default function QuestionBreakdownTable({ questions }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => { if (q.subject) set.add(q.subject); });
    return Array.from(set).sort();
  }, [questions]);

  const subjectQs = useMemo(() =>
    activeSubject === "All" ? questions : questions.filter(q => q.subject === activeSubject),
    [questions, activeSubject]
  );

  const filteredQs = useMemo(() => subjectQs.filter(q => {
    if (filter === "correct")   return q.is_correct === true;
    if (filter === "incorrect") return q.is_correct === false && q.user_answer !== null;
    if (filter === "skipped")   return q.user_answer === null;
    if (filter === "slow")      return q.timeSpentSecs > 180;
    return true;
  }), [subjectQs, filter]);

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "all",       label: "All",     count: subjectQs.length },
    { key: "correct",   label: "Correct", count: subjectQs.filter(q => q.is_correct === true).length },
    { key: "incorrect", label: "Wrong",   count: subjectQs.filter(q => q.is_correct === false && q.user_answer !== null).length },
    { key: "skipped",   label: "Skipped", count: subjectQs.filter(q => q.user_answer === null).length },
    { key: "slow",      label: "Slow",    count: subjectQs.filter(q => q.timeSpentSecs > 180).length },
  ];

  return (
    <section className="be-card overflow-hidden border" style={{ borderColor: BE.line }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: BE.line, background: "rgba(255,255,255,0.02)" }}>
        <div style={{ fontFamily: BE.serif, fontSize: 15, fontWeight: 700, color: BE.text }}>
          QUESTION-WISE BREAKDOWN <span style={{ color: BE.textMute, fontWeight: 400 }}>· {filteredQs.length}</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1 border" style={{ borderColor: BE.line, background: "rgba(0,0,0,0.15)" }}>
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
              style={{
                background: filter === tab.key ? BE.surface : "transparent",
                color: filter === tab.key ? BE.text : BE.textMute,
              }}
            >
              {tab.label}
              {tab.key !== "all" && (
                <span className="ml-1.5" style={{ color: filter === tab.key ? BE.accent : BE.textMute, fontFamily: BE.mono }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Subject filter */}
      {subjects.length > 1 && (
        <div
          className="flex items-center gap-2 px-6 py-3 border-b flex-wrap"
          style={{ borderColor: BE.line, background: "rgba(0,0,0,0.08)" }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
            Subject
          </span>
          {["All", ...subjects].map(s => {
            const count = s === "All"
              ? questions.length
              : questions.filter(q => q.subject === s).length;
            const active = s === activeSubject;
            return (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                style={{
                  padding: "4px 10px 4px 11px",
                  borderRadius: 999,
                  border: `1px solid ${active ? BE.accent : BE.line}`,
                  background: active ? BE.accentSoft : "transparent",
                  color: active ? BE.accent : BE.textDim,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {s}
                <span style={{ fontSize: 10, fontFamily: BE.mono, opacity: 0.75 }}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 760 }}>

          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: COL_STYLE,
            gap: "1rem",
            padding: "10px 24px",
            borderBottom: `1px solid ${BE.line}`,
            background: "rgba(0,0,0,0.12)",
            fontSize: 10,
            fontWeight: 700,
            color: BE.textMute,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            <div>Q#</div>
            <div>SECTION</div>
            <div>QUESTION</div>
            <div>RESULT</div>
            <div>YOUR → ANS</div>
            <div>TIME</div>
            <div>MARKS</div>
            <div>TOPIC</div>
          </div>

          {/* Rows */}
          {filteredQs.length === 0 && (
            <div className="py-16 text-center" style={{ color: BE.textMute, fontSize: 13 }}>No questions match this filter.</div>
          )}
          {filteredQs.map((q, i) => {
            const status = q.user_answer === null ? "skipped" : q.is_correct ? "correct" : "incorrect";
            const statusColor = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : BE.textMute;
            const isExpanded = expandedQId === q.id;
            const userShort = shortAns(q.user_answer, q.question_type);
            const corrShort = shortAns(q.correct_answer, q.question_type);
            const preview = plainPreview(q.question_text);
            const marksVal = status === "correct"
              ? `+${q.marks}`
              : status === "incorrect" && q.question_type === "MCQ"
              ? `-${(q.marks / 3).toFixed(2).replace(/\.00$/, "")}`
              : "0";
            const marksColor = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : BE.textMute;

            return (
              <div
                key={q.id}
                style={{ borderBottom: `1px solid ${BE.line}`, background: isExpanded ? "rgba(255,255,255,0.025)" : "transparent" }}
              >
                <div
                  onClick={() => setExpandedQId(isExpanded ? null : q.id)}
                  className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                  style={{
                    display: "grid",
                    gridTemplateColumns: COL_STYLE,
                    gap: "1rem",
                    padding: "14px 24px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: BE.textMute, fontFamily: BE.mono, fontWeight: 600, fontSize: 12 }}>#{i + 1}</div>

                  <div style={{ color: BE.textMute, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {q.subject.slice(0, 10)}
                  </div>

                  <div style={{ color: BE.text, fontSize: 13, fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {preview.slice(0, 120)}{preview.length > 120 ? "…" : ""}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: statusColor, letterSpacing: "0.04em" }}>
                    {status === "correct" ? "CORRECT" : status === "incorrect" ? "WRONG" : "SKIPPED"}
                  </div>

                  <div style={{ color: BE.textMute, fontFamily: BE.mono, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: status === "incorrect" ? BE.bad : BE.textMute }}>{userShort}</span>
                    <span style={{ opacity: 0.4 }}>→</span>
                    <span style={{ color: status === "incorrect" ? BE.good : BE.textMute }}>{corrShort}</span>
                  </div>

                  <div style={{ color: q.timeSpentSecs > 180 ? BE.warn : BE.textMute, fontFamily: BE.mono, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    {q.timeSpentSecs > 180 && <Clock size={11} />}
                    {fmtTime(q.timeSpentSecs)}
                  </div>

                  <div style={{ color: marksColor, fontWeight: 700, fontFamily: BE.mono, fontSize: 13 }}>{marksVal}</div>

                  <div style={{ overflow: "hidden" }}>
                    {q.topic && q.topic !== "Uncategorized" && q.topic !== "General" ? (
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 4, background: BE.accentSoft, color: BE.accent,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                      }}>
                        {q.topic}
                      </span>
                    ) : (
                      <span style={{ color: BE.textMute, fontSize: 11 }}>—</span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <ExpandedQuestion q={q} status={status} statusColor={statusColor} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
