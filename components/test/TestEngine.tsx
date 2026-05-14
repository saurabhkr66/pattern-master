"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, BarChart3, Loader2, CheckCircle2, CloudOff } from "lucide-react";
import { fmtTimer, type ExamConfig, type SectionConfig } from "@/lib/examConfigs";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import { getCloudinaryUrl } from "@/lib/imageUtils";

/* ─────────────── Types ─────────────── */
export interface TestQuestion {
  id: string;
  source: "pyq" | "subject_pyq" | "template";
  sectionIndex: number;
  sectionName: string;
  isOptional: boolean;
  question_text: string;
  options: string[] | null;
  question_type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  year?: number;
  subject: string;
  topic?: string;
  images?: { index: number; filename: string }[] | null;
}

export interface SubmitAnswer {
  questionId: string;
  source: "pyq" | "subject_pyq" | "template";
  sectionIndex: number;
  isOptional: boolean;
  questionType: string;
  marks: number;
  userAnswer: string | null;
  subject: string;
  timeSpentSecs: number;
}

type QStatus = "unseen" | "answered" | "skipped" | "review";

export interface DraftState {
  mcqAnswers?: Record<string, string>;
  msqAnswers?: Record<string, string[]>;
  natValues?: Record<string, string>;
  statuses?: Record<string, string>;
  markedReview?: string[];
  timeSpentMap?: Record<string, number>;
  currentQId?: string;
  activeSectionIdx?: number;
}

interface Props {
  questions: TestQuestion[];
  config: ExamConfig;
  branch?: string;
  mockTestId: string | null;
  mockTestTitle: string;
  onSubmit: (answers: SubmitAnswer[], timeTakenSecs: number) => void;
  submitting: boolean;
  submitError: string | null;
  draftId: string | null;
  serverExpiresAt: string | null;
  initialState: DraftState | null;
  userName?: string;
}

const optionLetters = ["A", "B", "C", "D", "E", "F"];

function sectionQuestions(questions: TestQuestion[], sectionIdx: number) {
  return questions.filter((q) => q.sectionIndex === sectionIdx);
}

function PalCount({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div style={{ padding: "6px 8px", border: `1px solid ${BE.line}`, borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c, flexShrink: 0 }} />
      <span style={{ fontFamily: BE.mono, fontWeight: 600, fontSize: 12, color: BE.text }}>{n}</span>
      <span style={{ color: BE.textDim, fontSize: 10.5 }}>{l}</span>
    </div>
  );
}

/* ─────────────── Component ─────────────── */
export default function TestEngine({
  questions,
  config,
  branch,
  mockTestId,
  mockTestTitle,
  onSubmit,
  submitting,
  submitError,
  draftId,
  serverExpiresAt,
  initialState,
  userName,
}: Props) {
  const s = initialState ?? {};

  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(s.activeSectionIdx ?? 0);
  const [currentQId, setCurrentQId] = useState<string>(s.currentQId ?? questions[0]?.id ?? "");
  const [statuses, setStatuses] = useState<Record<string, QStatus>>(
    (s.statuses as Record<string, QStatus>) ?? {}
  );
  const [mcqSelected, setMcqSelected] = useState<Record<string, string>>(s.mcqAnswers ?? {});
  const [msqSelected, setMsqSelected] = useState<Record<string, string[]>>(s.msqAnswers ?? {});
  const [natValues, setNatValues] = useState<Record<string, string>>(s.natValues ?? {});
  const [markedReview, setMarkedReview] = useState<Set<string>>(new Set(s.markedReview ?? []));
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (serverExpiresAt) {
      return Math.max(0, Math.floor((new Date(serverExpiresAt).getTime() - Date.now()) / 1000));
    }
    return config.durationSecs;
  });
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>(s.timeSpentMap ?? {});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);
  const currentQIdRef = useRef(currentQId);
  const sectionIdxRef = useRef(activeSectionIdx);
  const mcqRef = useRef(mcqSelected);
  const msqRef = useRef(msqSelected);
  const natRef = useRef(natValues);
  const statusRef = useRef(statuses);
  const reviewRef = useRef(markedReview);
  const timeSpentRef = useRef(timeSpent);

  useEffect(() => { currentQIdRef.current = currentQId; }, [currentQId]);
  useEffect(() => { sectionIdxRef.current = activeSectionIdx; }, [activeSectionIdx]);
  useEffect(() => { mcqRef.current = mcqSelected; }, [mcqSelected]);
  useEffect(() => { msqRef.current = msqSelected; }, [msqSelected]);
  useEffect(() => { natRef.current = natValues; }, [natValues]);
  useEffect(() => { statusRef.current = statuses; }, [statuses]);
  useEffect(() => { reviewRef.current = markedReview; }, [markedReview]);
  useEffect(() => { timeSpentRef.current = timeSpent; }, [timeSpent]);

  const buildDraftState = useCallback((): DraftState => ({
    mcqAnswers: mcqRef.current,
    msqAnswers: msqRef.current,
    natValues: natRef.current,
    statuses: statusRef.current,
    markedReview: [...reviewRef.current],
    timeSpentMap: timeSpentRef.current,
    currentQId: currentQIdRef.current,
    activeSectionIdx: sectionIdxRef.current,
  }), []);

  const sections = config.sections;
  const multiSection = sections.length > 1;

  const currentQ = questions.find((q) => q.id === currentQId) ?? questions[0];
  const sectionQs = sectionQuestions(questions, activeSectionIdx);
  const currentIdx = sectionQs.findIndex((q) => q.id === currentQId);
  const globalIdx = questions.findIndex((q) => q.id === currentQId);

  const buildAnswers = useCallback((): SubmitAnswer[] =>
    questions.map((q) => ({
      questionId: q.id,
      source: q.source,
      sectionIndex: q.sectionIndex,
      isOptional: q.isOptional,
      questionType: q.question_type,
      marks: q.marks,
      subject: q.subject,
      timeSpentSecs: timeSpentRef.current[q.id] || 0,
      userAnswer:
        q.question_type === "MSQ"
          ? (msqRef.current[q.id]?.sort().join(";") ?? null) || null
          : q.question_type === "NAT"
          ? natRef.current[q.id]?.trim() || null
          : mcqRef.current[q.id] ?? null,
    })), [questions]);

  // ── Countdown timer ──
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            setTimeout(() => { onSubmit(buildAnswers(), config.durationSecs); }, 100);
          }
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent((prev) => {
        const id = currentQIdRef.current;
        return { ...prev, [id]: (prev[id] || 0) + 1 };
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave every 20 minutes ──
  // The interval is intentionally long: each save is one Upstash command, and
  // at scale these add up fast. Crash safety is provided by the safety-net
  // effect below (saves on tab close / visibility hidden), so the worst case
  // a user can lose is whatever they entered since the last *event*, not the
  // last interval tick — typically only seconds in real-world failure modes.
  useEffect(() => {
    if (!draftId) return;
    const id = setInterval(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch("/api/test/session/save", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, state: buildDraftState() }),
        });
        const data = await res.json();
        setSaveStatus(data.ok ? "saved" : "error");
      } catch { setSaveStatus("error"); }
    }, 1_200_000);
    return () => clearInterval(id);
  }, [draftId, buildDraftState]);

  // ── Safety net: flush state on tab close / app background ──
  // Catches the common failure modes (user closes tab, switches apps on
  // mobile, OS reclaims the page) without burning interval-based saves.
  // Uses fetch keepalive so the request survives page unload.
  useEffect(() => {
    if (!draftId) return;
    const flush = () => {
      try {
        fetch("/api/test/session/save", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, state: buildDraftState() }),
          keepalive: true,
        }).catch(() => {});
      } catch { /* ignore */ }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [draftId, buildDraftState]);

  const goTo = (q: TestQuestion) => {
    setActiveSectionIdx(q.sectionIndex);
    setCurrentQId(q.id);
    setShowPalette(false);
  };

  const goToIdx = (idx: number) => {
    const clamped = Math.max(0, Math.min(sectionQs.length - 1, idx));
    const target = sectionQs[clamped];
    if (target) goTo(target);
  };

  const recordAnswer = (q: TestQuestion, answer: string | null) => {
    setStatuses((prev) => ({
      ...prev,
      [q.id]: !answer || answer.trim() === ""
        ? (markedReview.has(q.id) ? "review" : "skipped")
        : (markedReview.has(q.id) ? "review" : "answered"),
    }));
  };

  const handleMcq = (q: TestQuestion, letter: string) => {
    setMcqSelected((prev) => ({ ...prev, [q.id]: letter }));
    recordAnswer(q, letter);
  };

  const handleMsq = (q: TestQuestion, letter: string) => {
    const cur = msqSelected[q.id] ?? [];
    const next = cur.includes(letter) ? cur.filter((l) => l !== letter) : [...cur, letter];
    setMsqSelected((prev) => ({ ...prev, [q.id]: next }));
    recordAnswer(q, next.join(";") || null);
  };

  const handleNat = (q: TestQuestion, val: string) => {
    setNatValues((prev) => ({ ...prev, [q.id]: val }));
    recordAnswer(q, val || null);
  };

  const clearResponse = (q: TestQuestion) => {
    setMcqSelected((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setMsqSelected((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setNatValues((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setStatuses((prev) => ({ ...prev, [q.id]: markedReview.has(q.id) ? "review" : "skipped" }));
  };

  const toggleReview = (q: TestQuestion) => {
    const newSet = new Set(markedReview);
    if (newSet.has(q.id)) {
      newSet.delete(q.id);
      const hasAnswer = !!(mcqSelected[q.id] || msqSelected[q.id]?.length || natValues[q.id]);
      setStatuses((prev) => ({ ...prev, [q.id]: hasAnswer ? "answered" : "skipped" }));
    } else {
      newSet.add(q.id);
      setStatuses((prev) => ({ ...prev, [q.id]: "review" }));
    }
    setMarkedReview(newSet);
  };

  const markForReviewAndNext = (q: TestQuestion) => {
    if (!markedReview.has(q.id)) {
      const newSet = new Set(markedReview);
      newSet.add(q.id);
      setMarkedReview(newSet);
      setStatuses((prev) => ({ ...prev, [q.id]: "review" }));
    }
    goToIdx(currentIdx + 1);
  };

  const toggleBookmark = (q: TestQuestion) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
      return next;
    });
  };

  const doSubmit = useCallback(() => {
    clearInterval(timerRef.current!);
    onSubmit(buildAnswers(), config.durationSecs - timeLeft);
  }, [buildAnswers, timeLeft, config.durationSecs, onSubmit]);

  const answeredCount = Object.values(statuses).filter((s) => s === "answered").length;
  const reviewCount = Object.values(statuses).filter((s) => s === "review").length;
  const visitedCount = Object.values(statuses).filter((s) => s === "skipped").length;
  const notVisitedCount = questions.length - answeredCount - reviewCount - visitedCount;
  const timerColor = timeLeft < 600 ? BE.bad : timeLeft < 1800 ? BE.warn : BE.text;
  const curMcq = currentQ ? (mcqSelected[currentQ.id] ?? null) : null;
  const curMsq = currentQ ? (msqSelected[currentQ.id] ?? []) : [];
  const curNat = currentQ ? (natValues[currentQ.id] ?? "") : "";
  const isReviewed = currentQ ? markedReview.has(currentQ.id) : false;
  const isBookmarked = currentQ ? bookmarkedIds.has(currentQ.id) : false;

  const negMarking = currentQ?.question_type === "MCQ"
    ? `−${(currentQ.marks / 3).toFixed(2)} if wrong`
    : null;

  const userInitials = userName
    ? userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const sectionConfig: SectionConfig | undefined = sections[currentQ?.sectionIndex ?? 0];

  if (!currentQ) return null;

  /* ── Global palette grid (all questions) ── */
  const GlobalPaletteGrid = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {questions.map((q, i) => {
        const st = statuses[q.id];
        const isCur = q.id === currentQId;
        const bg = isCur ? BE.accent
          : st === "answered" ? BE.good + "38"
          : st === "review" ? BE.warn + "38"
          : st === "skipped" ? "rgba(255,255,255,0.08)"
          : "transparent";
        const borderColor = isCur ? BE.accent
          : st === "answered" ? BE.good + "88"
          : st === "review" ? BE.warn + "88"
          : BE.line;
        const color = isCur ? "#fff"
          : st === "answered" ? BE.good
          : st === "review" ? BE.warn
          : BE.textDim;
        return (
          <button
            key={q.id}
            onClick={() => goTo(q)}
            style={{
              height: 28, borderRadius: 5,
              fontFamily: BE.mono, fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", background: bg,
              border: `1px solid ${borderColor}`, color,
              transition: "all 0.15s",
            }}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-base)" }}>
      {/* ── TOP BAR ── */}
      <header style={{ height: 56, borderBottom: `1px solid ${BE.line}`, display: "flex", alignItems: "center", padding: "0 22px", gap: 12, background: BE.surface, flexShrink: 0 }}>
        <div style={{ fontFamily: BE.serif, fontSize: 15, fontWeight: 600, color: BE.text, whiteSpace: "nowrap" }}>
          {mockTestTitle} · {config.label}{branch ? ` ${branch}` : ""}
        </div>

        {multiSection && (
          <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--bg-base)", borderRadius: 7, border: `1px solid ${BE.line}` }}>
            {sections.map((sec, i) => {
              const active = i === activeSectionIdx;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setActiveSectionIdx(i);
                    const firstQ = sectionQuestions(questions, i)[0];
                    if (firstQ) setCurrentQId(firstQ.id);
                  }}
                  style={{ padding: "4px 10px", fontSize: 11.5, borderRadius: 5, color: active ? BE.text : BE.textDim, background: active ? "rgba(255,255,255,0.08)" : "transparent", cursor: "pointer", fontWeight: 500, border: "none" }}
                >
                  {sec.name}
                </button>
              );
            })}
          </div>
        )}

        <span style={{ flex: 1 }} />

        {draftId && (
          <div className="hidden sm:flex items-center gap-1.5" style={{ fontSize: 11, color: saveStatus === "error" ? BE.bad : BE.textMute }}>
            {saveStatus === "saving" && <Loader2 size={11} className="animate-spin" />}
            {saveStatus === "saved" && <CheckCircle2 size={11} style={{ color: BE.good }} />}
            {saveStatus === "error" && <CloudOff size={11} />}
            <span>{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : ""}</span>
          </div>
        )}

        <button className="be-btn hidden sm:flex" style={{ padding: "5px 10px", fontSize: 11.5 }}>Calculator</button>
        <button className="be-btn hidden sm:flex" style={{ padding: "5px 10px", fontSize: 11.5 }}>Instructions</button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: `${timerColor}15`, border: `1px solid ${timerColor}33`, borderRadius: 8 }}>
          <Clock size={12} style={{ color: timerColor }} />
          <span style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600, color: timerColor }}>{fmtTimer(timeLeft)}</span>
        </div>

        <button onClick={() => setShowPalette(!showPalette)} className="lg:hidden p-2 rounded-lg border" style={{ borderColor: BE.line }}>
          <BarChart3 size={18} />
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {/* ── QUESTION PANE ── */}
        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "22px 28px" }}>
            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontFamily: BE.mono, fontSize: 12, color: BE.textDim }}>
                Q {globalIdx + 1} / {questions.length}
              </span>
              <span style={{
                fontSize: 11, padding: "3px 7px", borderRadius: 5,
                background: BE.accentSoft, color: BE.accent,
                fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                {currentQ.question_type} · {currentQ.marks} marks
              </span>
              {negMarking && (
                <span style={{ fontSize: 11, color: BE.textMute }}>{negMarking}</span>
              )}
              <span style={{ flex: 1 }} />
              <button
                onClick={() => toggleBookmark(currentQ)}
                className="be-btn"
                style={{ padding: "4px 9px", fontSize: 11 }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill={isBookmarked ? BE.warn : "none"} stroke={BE.warn} strokeWidth="1.4" style={{ marginRight: 4, display: "inline" }}>
                  <path d="M3 1v10l3-2 3 2V1z" />
                </svg>
                {isBookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              <button
                onClick={() => toggleReview(currentQ)}
                className="be-btn"
                style={{
                  padding: "4px 9px", fontSize: 11,
                  background: isReviewed ? BE.warn + "18" : undefined,
                  borderColor: isReviewed ? BE.warn + "55" : undefined,
                  color: isReviewed ? BE.warn : undefined,
                }}
              >
                {isReviewed ? "Unmark review" : "Mark for review"}
              </button>
            </div>

            {/* Question text */}
            <div style={{ fontFamily: BE.serif, fontSize: 19, lineHeight: 1.55, color: BE.text, marginBottom: 22 }}>
              {currentQ.images && Array.isArray(currentQ.images) && currentQ.images.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-4">
                  {(currentQ.images as { index: number; filename: string }[]).map((img) => (
                    <img key={img.index} src={getCloudinaryUrl(img.filename)} alt="" className="rounded-lg border max-h-[300px]" style={{ borderColor: BE.line }} />
                  ))}
                </div>
              )}
              <MathRenderer content={currentQ.question_text} />
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
              {currentQ.question_type === "NAT" ? (
                <div className="max-w-[200px]">
                  <input
                    type="number" step="any" autoFocus
                    value={curNat} onChange={(e) => handleNat(currentQ, e.target.value)}
                    placeholder="Value…"
                    className="w-full px-4 py-3 rounded-xl border text-lg font-bold focus:outline-none"
                    style={{ background: BE.surface, borderColor: curNat ? BE.accent : BE.line, color: BE.text, fontFamily: BE.mono }}
                  />
                  <div className="mt-2 text-[11px]" style={{ color: BE.textMute }}>Enter exact numeric value.</div>
                </div>
              ) : (
                currentQ.options?.map((opt, oi) => {
                  const letter = optionLetters[oi];
                  const isMSQ = currentQ.question_type === "MSQ";
                  const selected = isMSQ ? curMsq.includes(letter) : curMcq === letter;
                  return (
                    <div
                      key={oi}
                      onClick={() => isMSQ ? handleMsq(currentQ, letter) : handleMcq(currentQ, letter)}
                      style={{
                        display: "flex", gap: 12, padding: "12px 14px", borderRadius: 9,
                        border: `1px solid ${selected ? BE.accent : BE.line}`,
                        background: selected ? BE.accentSoft : BE.surface,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: BE.mono, fontSize: 12, fontWeight: 700,
                        background: selected ? BE.accent : "rgba(255,255,255,0.05)",
                        color: selected ? "#fff" : BE.textDim,
                        border: `1px solid ${selected ? BE.accent : BE.line}`,
                      }}>
                        {letter}
                      </div>
                      <div style={{ fontSize: 14, color: selected ? BE.text : BE.textDim, paddingTop: 3 }}>
                        <MathRenderer content={typeof opt === "string" ? opt.replace(/^[A-E]\.\s*/, "") : String(opt)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {submitError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-xs border border-red-500/30">{submitError}</div>
            )}
          </div>

          {/* ── BOTTOM ACTION BAR ── */}
          <div style={{
            borderTop: `1px solid ${BE.line}`, padding: "12px 28px",
            background: "var(--bg-base)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <button
              onClick={() => goToIdx(currentIdx - 1)}
              disabled={currentIdx === 0}
              className="be-btn"
              style={{ opacity: currentIdx === 0 ? 0.35 : 1 }}
            >
              ← Previous
            </button>
            <button onClick={() => clearResponse(currentQ)} className="be-btn">
              Clear response
            </button>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => markForReviewAndNext(currentQ)}
              className="be-btn"
            >
              Save &amp; mark for review
            </button>
            <button
              onClick={() => goToIdx(currentIdx + 1)}
              disabled={currentIdx === sectionQs.length - 1}
              className="be-btn be-btn-primary"
              style={{ padding: "8px 16px", opacity: currentIdx === sectionQs.length - 1 ? 0.35 : 1 }}
            >
              Save &amp; next →
            </button>
          </div>
        </main>

        {/* ── PALETTE SIDEBAR ── */}
        <aside
          className="hidden lg:flex flex-col"
          style={{
            width: 280, minHeight: 0, borderLeft: `1px solid ${BE.line}`,
            background: BE.surface, overflow: "hidden",
          }}
        >
          {/* Pinned top: user info + counts + label */}
          <div style={{ flexShrink: 0, padding: "20px 16px 12px", display: "flex", flexDirection: "column", gap: 14, borderBottom: `1px solid ${BE.line}` }}>
            {/* User info */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16, background: BE.accent, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 600, fontSize: 13, flexShrink: 0,
              }}>
                {userInitials}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: BE.text }}>{userName ?? "Student"}</div>
                <div style={{ fontSize: 10.5, color: BE.textMute }}>Subject · {branch ?? currentQ.subject}</div>
              </div>
            </div>

            {/* Status counts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              <PalCount n={answeredCount} l="Answered" c={BE.good} />
              <PalCount n={reviewCount} l="Review" c={BE.warn} />
              <PalCount n={visitedCount} l="Visited" c={BE.textDim} />
              <PalCount n={notVisitedCount} l="Not visited" c={BE.textMute} />
            </div>

            <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              All questions
            </div>
          </div>

          {/* Scrollable question grid */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px" }}>
            {multiSection
              ? sections.map((sec, si) => (
                <div key={si} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: BE.textMute, fontWeight: 700, marginBottom: 6, opacity: 0.7 }}>{sec.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {sectionQuestions(questions, si).map((q) => {
                      const globalI = questions.findIndex((x) => x.id === q.id);
                      const st = statuses[q.id];
                      const isCur = q.id === currentQId;
                      return (
                        <button
                          key={q.id}
                          onClick={() => goTo(q)}
                          style={{
                            height: 28, borderRadius: 5,
                            fontFamily: BE.mono, fontSize: 11, fontWeight: 600,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            background: isCur ? BE.accent : st === "answered" ? BE.good + "38" : st === "review" ? BE.warn + "38" : st === "skipped" ? "rgba(255,255,255,0.08)" : "transparent",
                            border: `1px solid ${isCur ? BE.accent : st === "answered" ? BE.good + "88" : st === "review" ? BE.warn + "88" : BE.line}`,
                            color: isCur ? "#fff" : st === "answered" ? BE.good : st === "review" ? BE.warn : BE.textDim,
                          }}
                        >
                          {globalI + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
              : <GlobalPaletteGrid />
            }
          </div>

          {/* Pinned bottom: submit */}
          <div style={{ flexShrink: 0, padding: "12px 16px 20px", borderTop: `1px solid ${BE.line}` }}>
            <button
              onClick={() => setConfirmSubmit(true)}
              className="be-btn be-btn-primary"
              style={{ width: "100%", padding: "10px 12px", fontSize: 13, justifyContent: "center", display: "flex" }}
            >
              Submit test
            </button>
          </div>
        </aside>
      </div>

      {/* ── MOBILE PALETTE OVERLAY ── */}
      {showPalette && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={() => setShowPalette(false)}>
          <div
            className="w-72 h-full p-5 flex flex-col gap-4 overflow-y-auto"
            style={{ background: BE.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              All Questions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
              <PalCount n={answeredCount} l="Answered" c={BE.good} />
              <PalCount n={reviewCount} l="Review" c={BE.warn} />
              <PalCount n={visitedCount} l="Visited" c={BE.textDim} />
              <PalCount n={notVisitedCount} l="Not visited" c={BE.textMute} />
            </div>
            <GlobalPaletteGrid />
            <button onClick={() => setShowPalette(false)} className="be-btn w-full mt-auto">Close</button>
          </div>
        </div>
      )}

      {/* ── SUBMIT MODAL ── */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl p-8 border" style={{ background: BE.surface, borderColor: BE.line }}>
            <div style={{ fontFamily: BE.serif, fontSize: 24, fontWeight: 600, marginBottom: 6, color: BE.text }}>Submit your test?</div>
            <div style={{ fontSize: 14, color: BE.textDim, marginBottom: 24 }}>
              You have {questions.length - answeredCount - reviewCount} questions remaining. You cannot change your answers after submitting.
            </div>
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-4 rounded-xl border text-center" style={{ borderColor: BE.line }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: BE.good, fontFamily: BE.mono }}>{answeredCount}</div>
                <div style={{ fontSize: 11, color: BE.textMute }}>Answered</div>
              </div>
              <div className="p-4 rounded-xl border text-center" style={{ borderColor: BE.line }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: BE.warn, fontFamily: BE.mono }}>{reviewCount}</div>
                <div style={{ fontSize: 11, color: BE.textMute }}>Flagged</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 be-btn" style={{ height: 48 }}>Resume</button>
              <button
                onClick={doSubmit}
                disabled={submitting}
                className="flex-1 be-btn be-btn-primary flex items-center justify-center gap-2"
                style={{ height: 48, background: BE.bad, borderColor: BE.bad }}
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
