"use client";

import { useState, useMemo } from "react";
import { Clock } from "lucide-react";
import { BE } from "@/lib/theme";
import ExpandedQuestion from "./ExpandedQuestion";
import { shortAns, fmtTime, plainPreview, COL_STYLE, type ResultData } from "./testAnalysisHelpers";

type Filter = "all" | "correct" | "incorrect" | "skipped" | "slow";
type Q = ResultData["questions"][number];

interface Props {
  questions: ResultData["questions"];
  // Bumped by the parent (e.g. the "Review wrong answers" action) to force the
  // table to jump to the "Wrong" filter. Ignored on first render.
  jumpToWrong?: number;
}

const MOBILE_PAGE = 15;

// Marks actually awarded for a question. Prefers the server-reported value
// (handles partial credit); falls back to all-or-nothing for legacy sessions.
function marksLabel(q: Q, status: "correct" | "incorrect" | "skipped"): string {
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
  if (typeof q.awarded === "number") {
    if (q.awarded > 0) return `+${trim(q.awarded)}`;
    if (q.awarded < 0) return `−${trim(Math.abs(q.awarded))}`;
    return "0";
  }
  if (status === "correct") return `+${q.marks}`;
  if (status === "incorrect" && q.question_type === "MCQ") return `−${trim(q.marks / 3)}`;
  return "0";
}

export default function QuestionBreakdownTable({ questions, jumpToWrong }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [mobileVisible, setMobileVisible] = useState(MOBILE_PAGE);

  // Stable paper position (1-indexed) per question id — the breakdown arrives
  // in paper order, so this is the real Q number regardless of filtering.
  const orderMap = useMemo(() => {
    const m = new Map<string, number>();
    questions.forEach((q, idx) => m.set(q.id, idx + 1));
    return m;
  }, [questions]);

  // Jump to the "Wrong" filter when the parent bumps `jumpToWrong`. Handled
  // during render (React's "adjust state when a prop changes" pattern) rather
  // than in an effect, which avoids a cascading-render lint error.
  const [prevJump, setPrevJump] = useState(jumpToWrong);
  if (jumpToWrong !== prevJump) {
    setPrevJump(jumpToWrong);
    if (jumpToWrong && jumpToWrong > 0) {
      setActiveSubject("All");
      setFilter("incorrect");
      setMobileVisible(MOBILE_PAGE);
    }
  }

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

  const mobileQs = filteredQs.slice(0, mobileVisible);

  return (
    <section className="be-card qbd-wrap overflow-hidden border" style={{ borderColor: BE.line }}>
      <style>{`
        /* ── Mobile card layout ── */
        .qbd-desktop { display: block; }
        .qbd-mobile  { display: none; }

        @media (max-width: 768px) {
          .qbd-desktop { display: none; }
          .qbd-mobile  { display: block; }
          .qbd-wrap {
            border-left: none !important;
            border-right: none !important;
            border-radius: 0 !important;
          }
        }

        /* Filter pill row */
        .qbd-pill-row {
          display: flex; gap: 6px; overflow-x: auto;
          padding: 0 0 8px;
          scrollbar-width: none;
        }
        .qbd-pill-row::-webkit-scrollbar { display: none; }

        .qbd-pill {
          flex-shrink: 0;
          padding: 6px 12px; border-radius: 999px;
          font-size: 11.5px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all .15s;
          font-family: inherit;
          border: 1px solid ${BE.line};
          background: transparent;
          color: ${BE.textDim};
        }
        .qbd-pill .cnt {
          font-family: ${BE.mono}; font-size: 10px;
          color: ${BE.textMute};
        }
        .qbd-pill.active {
          border-color: ${BE.accent};
          color: #fbcb6a;
          background: ${BE.accentSoft};
        }
        .qbd-pill.active .cnt { color: #fbcb6a; }

        /* Card */
        .qbd-card {
          border: 1px solid ${BE.line}; border-radius: 4px;
          padding: 14px 14px 12px;
          background: rgba(21,17,14,1);
          display: flex; flex-direction: column; gap: 10px;
        }

        /* Card header */
        .qbd-card-head {
          display: flex; align-items: center; justify-content: space-between;
          font-family: ${BE.mono}; font-size: 10.5px;
          color: ${BE.textMute}; letter-spacing: 0.08em;
        }
        .qbd-card-head .left { display: flex; align-items: center; gap: 10px; }
        .qbd-card-head .qnum { color: ${BE.textDim}; font-weight: 600; }
        .qbd-card-head .sep  { color: rgba(74,68,61,1); }
        .qbd-card-head .sec  { color: ${BE.textDim}; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.12em; }

        .qbd-status {
          padding: 3px 8px; border-radius: 3px;
          font-family: ${BE.mono}; font-size: 9.5px;
          letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
        }
        .qbd-status.correct { background: rgba(110,231,160,.12); color: ${BE.good}; }
        .qbd-status.wrong   { background: rgba(244,114,114,.12); color: ${BE.bad}; }
        .qbd-status.skipped { background: rgba(107,99,90,.18);   color: ${BE.textDim}; }

        /* Question text */
        .qbd-qtext {
          font-size: 13px; line-height: 1.45; color: ${BE.text};
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Meta row */
        .qbd-meta {
          display: flex; align-items: center; flex-wrap: wrap; gap: 14px;
          font-family: ${BE.mono}; font-size: 10.5px; color: ${BE.textMute};
          padding-top: 8px; border-top: 1px dashed ${BE.line};
        }
        .qbd-meta .item { display: inline-flex; gap: 4px; align-items: center; }
        .qbd-meta .item .k { color: rgba(74,68,61,1); }
        .qbd-meta .item .v { color: ${BE.textDim}; }
        .qbd-meta .item .v.good { color: ${BE.good}; }
        .qbd-meta .item .v.bad  { color: ${BE.bad}; }
        .qbd-meta .item .arrow  { color: rgba(74,68,61,1); margin: 0 1px; }

        /* Load more */
        .qbd-loadmore {
          margin: 0 0 8px;
          padding: 12px; text-align: center;
          border: 1px dashed ${BE.line}; border-radius: 4px;
          font-family: ${BE.mono}; font-size: 11px;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: ${BE.textDim}; cursor: pointer;
          background: transparent;
          width: 100%;
          transition: all .15s;
        }
        .qbd-loadmore:hover { color: #fbcb6a; border-color: ${BE.accent}; }
      `}</style>

      {/* ─────────── DESKTOP layout (unchanged) ─────────── */}
      <div className="qbd-desktop">
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
                    {filterTabs.find(t => t.key === tab.key)?.count}
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
              const marksVal = marksLabel(q, status);
              const marksColor = marksVal.startsWith("+") ? BE.good : marksVal.startsWith("−") ? BE.bad : BE.textMute;

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
                    <div style={{ color: BE.textMute, fontFamily: BE.mono, fontWeight: 600, fontSize: 12 }}>#{orderMap.get(q.id) ?? i + 1}</div>
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
      </div>

      {/* ─────────── MOBILE card layout ─────────── */}
      <div className="qbd-mobile">
        {/* Section heading */}
        <div style={{
          padding: "20px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 14,
        }}>
          <div style={{ fontFamily: BE.serif, fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em" }}>
            Questions <em style={{ fontStyle: "italic", color: "#fbcb6a" }}>breakdown</em>
          </div>
          <div style={{ fontFamily: BE.mono, fontSize: 10, color: BE.textMute }}>
            {filteredQs.length} shown
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ padding: "0 0 16px" }}>
          <div className="qbd-pill-row">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); setMobileVisible(MOBILE_PAGE); }}
                className={`qbd-pill${filter === tab.key ? " active" : ""}`}
              >
                {tab.label}
                {tab.key !== "all" && (
                  <span className="cnt">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Subject pills (if multiple subjects) */}
          {subjects.length > 1 && (
            <div className="qbd-pill-row" style={{ marginTop: 6 }}>
              {["All", ...subjects].map(s => {
                const count = s === "All" ? questions.length : questions.filter(q => q.subject === s).length;
                return (
                  <button
                    key={s}
                    onClick={() => { setActiveSubject(s); setMobileVisible(MOBILE_PAGE); }}
                    className={`qbd-pill${activeSubject === s ? " active" : ""}`}
                  >
                    {s}
                    <span className="cnt">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cards */}
        <div style={{ padding: "4px 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredQs.length === 0 && (
            <div style={{
              padding: "28px 0", textAlign: "center",
              fontFamily: BE.mono, fontSize: 11,
              color: BE.textMute, letterSpacing: "0.08em",
            }}>
              No questions match this filter.
            </div>
          )}

          {mobileQs.map((q, i) => {
            const status = q.user_answer === null ? "skipped" : q.is_correct ? "correct" : "incorrect";
            const statusColor = status === "correct" ? BE.good : status === "incorrect" ? BE.bad : BE.textMute;
            const userShort = shortAns(q.user_answer, q.question_type);
            const corrShort = shortAns(q.correct_answer, q.question_type);
            const preview = plainPreview(q.question_text);
            const marksVal = marksLabel(q, status);
            const isExpanded = expandedQId === q.id;

            return (
              <div key={q.id} style={{ border: `1px solid ${BE.line}`, borderRadius: 4, background: "rgba(21,17,14,1)" }}>
                {/* Tappable card summary */}
                <div
                  className="qbd-card"
                  style={{ cursor: "pointer", borderRadius: 0, border: "none", background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent" }}
                  onClick={() => setExpandedQId(isExpanded ? null : q.id)}
                >
                  {/* Card header */}
                  <div className="qbd-card-head">
                    <div className="left">
                      <span className="qnum">Q{orderMap.get(q.id) ?? i + 1}</span>
                      <span className="sep">·</span>
                      <span className="sec">
                        {(q.topic && q.topic !== "Uncategorized" && q.topic !== "General")
                          ? q.topic
                          : q.subject.slice(0, 12)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`qbd-status ${status === "correct" ? "correct" : status === "incorrect" ? "wrong" : "skipped"}`}>
                        {status === "correct" ? "Correct" : status === "incorrect" ? "Wrong" : "Skipped"}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"
                        style={{ color: BE.textMute, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Question preview */}
                  <div className="qbd-qtext">{preview || "—"}</div>

                  {/* Meta */}
                  <div className="qbd-meta">
                    <span className="item">
                      <span className="k">Ans</span>
                      <span className={`v${status === "incorrect" ? " bad" : ""}`}>{userShort}</span>
                      <span className="arrow">→</span>
                      <span className={`v${status === "incorrect" ? " good" : ""}`}>{corrShort}</span>
                    </span>
                    <span className="item">
                      <span className="k">Time</span>
                      <span className="v" style={{ color: q.timeSpentSecs > 180 ? BE.warn : undefined }}>
                        {fmtTime(q.timeSpentSecs)}
                      </span>
                    </span>
                    <span className="item">
                      <span className="k">Marks</span>
                      <span className={`v${marksVal.startsWith("+") ? " good" : marksVal.startsWith("−") ? " bad" : ""}`}>
                        {marksVal}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Expanded: full question + options + explanation */}
                {isExpanded && (
                  <ExpandedQuestion q={q} status={status} statusColor={statusColor} compact />
                )}
              </div>
            );
          })}

          {/* Load more */}
          {mobileVisible < filteredQs.length && (
            <button
              className="qbd-loadmore"
              onClick={() => setMobileVisible(v => v + MOBILE_PAGE)}
            >
              Load more · {filteredQs.length - mobileVisible} remaining
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
