"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { type ExamConfig } from "@/lib/examConfigs";
import TestHeaderBar from "./TestHeaderBar";
import QuestionPane from "./QuestionPane";
import PalettePanel from "./PalettePanel";
import MobilePaletteOverlay from "./MobilePaletteOverlay";
import SubmitConfirmModal from "./SubmitConfirmModal";
import {
  sectionQuestions,
  type QStatus,
  type TestQuestion,
  type SubmitAnswer,
  type DraftState,
} from "./testEngineTypes";

export type { TestQuestion, SubmitAnswer, DraftState } from "./testEngineTypes";

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

export default function TestEngine({
  questions,
  config,
  branch,
  mockTestId: _mockTestId,
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

  // Each question counts as its own page view. We stamp `?q=N` (1-indexed
  // global position) into the URL on every question change; Next.js's
  // useSearchParams reacts to history.replaceState in 14+, which the
  // GlobalAnalyticsTracker watches — so the pageview fires automatically
  // without us calling trackPageView() here.
  useEffect(() => {
    if (!currentQId) return;
    const idx = questions.findIndex((q) => q.id === currentQId);
    if (idx < 0) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("q") === String(idx + 1)) return;
    url.searchParams.set("q", String(idx + 1));
    window.history.replaceState(null, "", url.toString());
  }, [currentQId, questions]);
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
  const counts = { answered: answeredCount, review: reviewCount, visited: visitedCount, notVisited: notVisitedCount };

  const curMcq = currentQ ? (mcqSelected[currentQ.id] ?? null) : null;
  const curMsq = currentQ ? (msqSelected[currentQ.id] ?? []) : [];
  const curNat = currentQ ? (natValues[currentQ.id] ?? "") : "";
  const isReviewed = currentQ ? markedReview.has(currentQ.id) : false;
  const isBookmarked = currentQ ? bookmarkedIds.has(currentQ.id) : false;

  const userInitials = userName
    ? userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  if (!currentQ) return null;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-base)" }}>
      <TestHeaderBar
        mockTestTitle={mockTestTitle}
        config={config}
        branch={branch}
        questions={questions}
        activeSectionIdx={activeSectionIdx}
        onSectionChange={(i, firstQId) => {
          setActiveSectionIdx(i);
          if (firstQId) setCurrentQId(firstQId);
        }}
        draftId={draftId}
        saveStatus={saveStatus}
        timeLeft={timeLeft}
        onTogglePalette={() => setShowPalette(!showPalette)}
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <QuestionPane
          question={currentQ}
          globalIdx={globalIdx}
          totalQuestions={questions.length}
          curMcq={curMcq}
          curMsq={curMsq}
          curNat={curNat}
          isReviewed={isReviewed}
          isBookmarked={isBookmarked}
          submitError={submitError}
          currentIdx={currentIdx}
          sectionQsLength={sectionQs.length}
          onMcq={handleMcq}
          onMsq={handleMsq}
          onNat={handleNat}
          onToggleBookmark={toggleBookmark}
          onToggleReview={toggleReview}
          onClearResponse={clearResponse}
          onMarkReviewAndNext={markForReviewAndNext}
          onPrev={() => goToIdx(currentIdx - 1)}
          onNext={() => goToIdx(currentIdx + 1)}
        />

        <PalettePanel
          config={config}
          questions={questions}
          statuses={statuses}
          currentQId={currentQId}
          currentQSubject={currentQ.subject}
          branch={branch}
          userName={userName}
          userInitials={userInitials}
          counts={counts}
          onGoTo={goTo}
          onSubmitClick={() => setConfirmSubmit(true)}
        />
      </div>

      {showPalette && (
        <MobilePaletteOverlay
          questions={questions}
          statuses={statuses}
          currentQId={currentQId}
          counts={counts}
          onGoTo={goTo}
          onClose={() => setShowPalette(false)}
        />
      )}

      {confirmSubmit && (
        <SubmitConfirmModal
          totalQuestions={questions.length}
          answeredCount={answeredCount}
          reviewCount={reviewCount}
          submitting={submitting}
          onCancel={() => setConfirmSubmit(false)}
          onConfirm={doSubmit}
        />
      )}
    </div>
  );
}
