"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { type ExamConfig } from "@/lib/examConfigs";
import TestHeaderBar from "./TestHeaderBar";
import QuestionPane from "./QuestionPane";
import PalettePanel from "./PalettePanel";
import MobilePaletteOverlay from "./MobilePaletteOverlay";
import SubmitConfirmModal from "./SubmitConfirmModal";
import InstructionsModal from "./InstructionsModal";
import {
  type QStatus,
  type TestQuestion,
  type SubmitAnswer,
  type DraftState,
} from "./testEngineTypes";
import { saveLocalDraft, loadLocalDraft } from "@/lib/localDraft";

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
  // Autosave target. Defaults to the consumer Redis-draft endpoint; coaching
  // tests point this at their own (attempt-scoped) save route.
  //
  // `null` = LOCAL-ONLY draft: snapshots still go to IndexedDB (so a refresh
  // recovers answers) but nothing is pushed to a server. DPP runs use this —
  // they are short, solo, and have no draft store, and without it every autosave
  // would POST to the mock endpoint and park a permanent "error" in the header.
  saveEndpoint?: string | null;
  autosaveIntervalMs?: number;
  // Upper bound on the random delay before the timer-expiry auto-submit fires.
  // Defaults to 20 s, which exists to spread a whole batch of students hitting
  // submit at once. A solo runner (DPP) has no thundering herd, and the delay
  // just reads as a frozen screen — pass 0 there.
  submitJitterMs?: number;
  // Photo-answer upload config for SUBJECTIVE questions (coaching tests only).
  // undefined → consumer flow, engine behavior unchanged.
  subjectiveUpload?: { endpoint: string; attemptId: string };
}

export default function TestEngine({
  questions: rawQuestions,
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
  saveEndpoint = "/api/test/session/save",
  autosaveIntervalMs = 1_200_000,
  submitJitterMs = 20000,
  subjectiveUpload,
}: Props) {
  // Group questions by section (stable sort keeps in-section order) so global
  // navigation — "Save & next" at a section's end — always rolls into the NEXT
  // section. Coaching papers with per-student shuffle (and any teacher-built
  // paper with mixed subject order) arrive with sections interleaved, which
  // otherwise makes Next hop between sections in raw array order.
  const questions = useMemo(
    () => [...rawQuestions].sort((a, b) => a.sectionIndex - b.sectionIndex),
    [rawQuestions]
  );

  const s = initialState ?? {};

  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(s.activeSectionIdx ?? 0);
  const [currentQId, setCurrentQId] = useState<string>(s.currentQId ?? questions[0]?.id ?? "");
  const [statuses, setStatuses] = useState<Record<string, QStatus>>(
    (s.statuses as Record<string, QStatus>) ?? {}
  );
  const [mcqSelected, setMcqSelected] = useState<Record<string, string>>(s.mcqAnswers ?? {});
  const [msqSelected, setMsqSelected] = useState<Record<string, string[]>>(s.msqAnswers ?? {});
  const [natValues, setNatValues] = useState<Record<string, string>>(s.natValues ?? {});
  // Subjective answers = uploaded photo R2 keys (the photos are already in R2).
  const [subjPhotos, setSubjPhotos] = useState<Record<string, string[]>>(s.subjPhotos ?? {});
  const [markedReview, setMarkedReview] = useState<Set<string>>(new Set(s.markedReview ?? []));
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (serverExpiresAt) {
      return Math.max(0, Math.floor((new Date(serverExpiresAt).getTime() - Date.now()) / 1000));
    }
    return config.durationSecs;
  });
  const [showPalette, setShowPalette] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>(s.timeSpentMap ?? {});
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | null>(null);
  // Gates the local write-through until the IndexedDB recovery pass has run, so
  // the mount write cannot clobber the snapshot recovery is about to read. No
  // draft → nothing to recover → open immediately.
  const [draftReady, setDraftReady] = useState(!draftId);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const autoSubmittedRef = useRef(false);
  const currentQIdRef = useRef(currentQId);
  const sectionIdxRef = useRef(activeSectionIdx);
  const mcqRef = useRef(mcqSelected);
  const msqRef = useRef(msqSelected);
  const natRef = useRef(natValues);
  const subjRef = useRef(subjPhotos);
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
  useEffect(() => { subjRef.current = subjPhotos; }, [subjPhotos]);
  useEffect(() => { statusRef.current = statuses; }, [statuses]);
  useEffect(() => { reviewRef.current = markedReview; }, [markedReview]);
  useEffect(() => { timeSpentRef.current = timeSpent; }, [timeSpent]);

  const buildDraftState = useCallback((): DraftState => ({
    mcqAnswers: mcqRef.current,
    msqAnswers: msqRef.current,
    natValues: natRef.current,
    subjPhotos: subjRef.current,
    statuses: statusRef.current,
    markedReview: [...reviewRef.current],
    timeSpentMap: timeSpentRef.current,
    currentQId: currentQIdRef.current,
    activeSectionIdx: sectionIdxRef.current,
  }), []);

  // ── Offline backup ──
  // Mirror every draft snapshot into IndexedDB (local, survives reload) and try
  // to push it to the server. `synced` records whether the server has actually
  // acknowledged this snapshot — an unsynced local entry is answers the server
  // hasn't seen, which the reconnect handler below replays.
  const flushToServer = useCallback(async (): Promise<boolean> => {
    if (!draftId) return false;
    const state = buildDraftState();
    // Write locally first so a failed/blocked network call still leaves a
    // recoverable copy on disk.
    await saveLocalDraft(draftId, state, false, Date.now());
    // Local-only mode: the IndexedDB write above IS the save. Report success so
    // the header shows "saved" rather than an error for a draft that is working
    // exactly as designed. The entry stays `synced: false`, which is what makes
    // the recovery effect below re-apply it on the next mount.
    if (!saveEndpoint) return true;
    try {
      const res = await fetch(saveEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, state }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        // Mark the local copy as synced so reconnect doesn't replay it again.
        await saveLocalDraft(draftId, state, true, Date.now());
        return true;
      }
    } catch { /* offline / server unreachable — local copy stands in */ }
    return false;
  }, [draftId, buildDraftState, saveEndpoint]);

  const currentQ = questions.find((q) => q.id === currentQId) ?? questions[0];
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
          : q.question_type === "SUBJECTIVE"
          // Photo R2 keys joined with ";" — keys are server-minted and never
          // contain ";", so the existing string answer plumbing carries them.
          ? subjRef.current[q.id]?.join(";") || null
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
            // Random jitter (default 0–20 s) so a full batch of students doesn't
            // hit the submit endpoint simultaneously when their timers all reach
            // zero (1000 students / 20 s ≈ 50 submits/s — comfortable for the
            // box). The budget must stay inside SUBMIT_GRACE_SECS (60 s): 20 s
            // jitter + retry backoff + network slack. Answers are snapshotted
            // NOW, at expiry — the jitter delays only the network call, so the
            // wait grants no extra answering time.
            //
            // Solo runners pass submitJitterMs={0}: with no herd to spread there
            // is nothing to gain, and the delay just looks like a frozen screen.
            const answersAtExpiry = buildAnswers();
            const elapsedSecs = Math.round((Date.now() - startTimeRef.current) / 1000);
            setTimeout(
              () => { onSubmit(answersAtExpiry, elapsedSecs); },
              Math.random() * submitJitterMs
            );
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
      const ok = await flushToServer();
      // "error" here is non-fatal: the snapshot is safe in IndexedDB and will be
      // replayed automatically when the connection returns (online handler).
      setSaveStatus(ok ? "saved" : "error");
    }, autosaveIntervalMs);
    return () => clearInterval(id);
  }, [draftId, flushToServer, autosaveIntervalMs]);

  // ── Local write-through on every answer / navigation change ──
  // IndexedDB writes are cheap and local, so unlike the throttled server save we
  // persist on every meaningful state change. timeSpent (ticks every second) is
  // deliberately excluded — its latest value rides along on the next snapshot.
  //
  // Held until the recovery pass below has run. This effect is declared FIRST,
  // so on mount it would otherwise write the current (possibly empty) state over
  // the local snapshot before recovery gets to read it. Callers that seed
  // `initialState` from a server draft never noticed — their mount state isn't
  // empty. A local-only draft (DPP) has no server seed, so without this gate a
  // refresh restores nothing: the wipe wins the race every time.
  useEffect(() => {
    if (!draftId || !draftReady) return;
    saveLocalDraft(draftId, buildDraftState(), false, Date.now());
  }, [
    draftId, draftReady, buildDraftState,
    mcqSelected, msqSelected, natValues, subjPhotos,
    statuses, markedReview, currentQId, activeSectionIdx,
  ]);

  // ── Recover answers buffered offline before this load ──
  // If a network drop + reload happened, the server draft (initialState) is
  // stale but IndexedDB holds the newer answers. Apply the local copy on mount.
  // Every server save is preceded by a local write, so a local entry is always
  // newer-or-equal to the server's — and the key is attempt-scoped, so there is
  // no risk of loading a different attempt's data.
  const recoveredRef = useRef(false);
  useEffect(() => {
    if (!draftId || recoveredRef.current) return;
    recoveredRef.current = true;
    (async () => {
      // Whatever happens below, release the write-through gate — a draft that
      // cannot be read must not also stop new answers being saved.
      try {
        const local = await loadLocalDraft(draftId);
        if (!local || local.synced) return; // nothing newer than the server
        const ls = local.state as DraftState;
        if (ls.mcqAnswers) setMcqSelected(ls.mcqAnswers);
        if (ls.msqAnswers) setMsqSelected(ls.msqAnswers);
        if (ls.natValues) setNatValues(ls.natValues);
        if (ls.subjPhotos) setSubjPhotos(ls.subjPhotos);
        if (ls.statuses) setStatuses(ls.statuses as Record<string, QStatus>);
        if (ls.markedReview) setMarkedReview(new Set(ls.markedReview));
        if (ls.timeSpentMap) setTimeSpent(ls.timeSpentMap);
        if (ls.currentQId) setCurrentQId(ls.currentQId);
        if (typeof ls.activeSectionIdx === "number") setActiveSectionIdx(ls.activeSectionIdx);
        // Push the recovered answers back to the server now that we're loaded.
        flushToServer();
      } finally {
        setDraftReady(true);
      }
    })();
  }, [draftId, flushToServer]);

  // ── Replay buffered answers when the connection returns ──
  useEffect(() => {
    if (!draftId) return;
    const onOnline = async () => {
      setSaveStatus("saving");
      const ok = await flushToServer();
      setSaveStatus(ok ? "saved" : "error");
    };
    const onOffline = () => setSaveStatus("error");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [draftId, flushToServer]);

  // ── Safety net: flush state on tab close / app background ──
  // Catches the common failure modes (user closes tab, switches apps on
  // mobile, OS reclaims the page) without burning interval-based saves.
  // Uses fetch keepalive so the request survives page unload.
  useEffect(() => {
    if (!draftId) return;
    const flush = () => {
      const state = buildDraftState();
      // Local backup first — synchronous-ish and reliable even as the page dies.
      saveLocalDraft(draftId, state, false, Date.now());
      if (!saveEndpoint) return; // local-only draft — nothing to push
      try {
        fetch(saveEndpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, state }),
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
  }, [draftId, buildDraftState, saveEndpoint]);

  // Stamp a question as "visited but not answered" once the user leaves it
  // without recording an answer — distinguishes Not Answered from Not Visited.
  const markVisitedIfUnseen = (id: string) => {
    if (!id) return;
    setStatuses((prev) => (prev[id] ? prev : { ...prev, [id]: "skipped" }));
  };

  const goTo = (q: TestQuestion) => {
    markVisitedIfUnseen(currentQIdRef.current);
    setActiveSectionIdx(q.sectionIndex);
    setCurrentQId(q.id);
    setShowPalette(false);
  };

  // Navigate across the whole paper (not just the active section), so
  // "Save & next" at the end of a section rolls into the next section.
  const goByGlobal = (delta: number) => {
    const gIdx = questions.findIndex((q) => q.id === currentQIdRef.current);
    const target = questions[gIdx + delta];
    if (target) goTo(target);
  };

  const recordAnswer = (q: TestQuestion, answer: string | null) => {
    const answered = !!answer && answer.trim() !== "";
    const marked = markedReview.has(q.id);
    setStatuses((prev) => ({
      ...prev,
      [q.id]: answered
        ? (marked ? "answeredReview" : "answered")
        : (marked ? "review" : "skipped"),
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

  const handleSubjPhotos = (q: TestQuestion, keys: string[]) => {
    setSubjPhotos((prev) => ({ ...prev, [q.id]: keys }));
    recordAnswer(q, keys.join(";") || null); // answered = ≥1 photo
  };

  const clearResponse = (q: TestQuestion) => {
    setMcqSelected((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setMsqSelected((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setNatValues((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setSubjPhotos((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setStatuses((prev) => ({ ...prev, [q.id]: markedReview.has(q.id) ? "review" : "skipped" }));
  };

  const hasAnswerFor = (qId: string) =>
    !!(mcqSelected[qId] || msqSelected[qId]?.length || natValues[qId] || subjPhotos[qId]?.length);

  const toggleReview = (q: TestQuestion) => {
    const newSet = new Set(markedReview);
    const hasAnswer = hasAnswerFor(q.id);
    if (newSet.has(q.id)) {
      newSet.delete(q.id);
      setStatuses((prev) => ({ ...prev, [q.id]: hasAnswer ? "answered" : "skipped" }));
    } else {
      newSet.add(q.id);
      setStatuses((prev) => ({ ...prev, [q.id]: hasAnswer ? "answeredReview" : "review" }));
    }
    setMarkedReview(newSet);
  };

  const markForReviewAndNext = (q: TestQuestion) => {
    const hasAnswer = hasAnswerFor(q.id);
    if (!markedReview.has(q.id)) {
      const newSet = new Set(markedReview);
      newSet.add(q.id);
      setMarkedReview(newSet);
    }
    setStatuses((prev) => ({ ...prev, [q.id]: hasAnswer ? "answeredReview" : "review" }));
    goByGlobal(1);
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
    onSubmit(buildAnswers(), Math.round((Date.now() - startTimeRef.current) / 1000));
  }, [buildAnswers, timeLeft, config.durationSecs, onSubmit]);

  const statusVals = Object.values(statuses);
  const answeredCount = statusVals.filter((s) => s === "answered").length;
  const answeredReviewCount = statusVals.filter((s) => s === "answeredReview").length;
  const reviewCount = statusVals.filter((s) => s === "review").length;
  const notAnsweredCount = statusVals.filter((s) => s === "skipped").length;
  const notVisitedCount =
    questions.length - answeredCount - answeredReviewCount - reviewCount - notAnsweredCount;
  const counts = {
    answered: answeredCount,
    answeredReview: answeredReviewCount,
    review: reviewCount,
    notAnswered: notAnsweredCount,
    notVisited: notVisitedCount,
  };

  const curMcq = currentQ ? (mcqSelected[currentQ.id] ?? null) : null;
  const curMsq = currentQ ? (msqSelected[currentQ.id] ?? []) : [];
  const curNat = currentQ ? (natValues[currentQ.id] ?? "") : "";
  const curSubj = currentQ ? (subjPhotos[currentQ.id] ?? []) : [];
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
          markVisitedIfUnseen(currentQIdRef.current);
          setActiveSectionIdx(i);
          if (firstQId) setCurrentQId(firstQId);
        }}
        draftId={draftId}
        saveStatus={saveStatus}
        timeLeft={timeLeft}
        onTogglePalette={() => setShowPalette(!showPalette)}
        onOpenInstructions={() => setShowInstructions(true)}
        onSubmitClick={() => setConfirmSubmit(true)}
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <QuestionPane
          question={currentQ}
          globalIdx={globalIdx}
          totalQuestions={questions.length}
          // From the active section, so a paper with no negative marking (DPP)
          // doesn't display GATE's 1/3 penalty.
          negativePerMark={config.sections[activeSectionIdx]?.negativePerMark ?? 1 / 3}
          curMcq={curMcq}
          curMsq={curMsq}
          curNat={curNat}
          curSubj={curSubj}
          isReviewed={isReviewed}
          isBookmarked={isBookmarked}
          submitError={submitError}
          onMcq={handleMcq}
          onMsq={handleMsq}
          onNat={handleNat}
          onSubjPhotos={handleSubjPhotos}
          subjectiveUpload={subjectiveUpload}
          onToggleBookmark={toggleBookmark}
          onToggleReview={toggleReview}
          onClearResponse={clearResponse}
          onMarkReviewAndNext={markForReviewAndNext}
          onPrev={() => goByGlobal(-1)}
          onNext={() => goByGlobal(1)}
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
          onSubmitClick={() => { setShowPalette(false); setConfirmSubmit(true); }}
        />
      )}

      {showInstructions && (
        <InstructionsModal
          config={config}
          examType={config.examType}
          onClose={() => setShowInstructions(false)}
        />
      )}

      {confirmSubmit && (
        <SubmitConfirmModal
          totalQuestions={questions.length}
          answeredCount={answeredCount + answeredReviewCount}
          reviewCount={reviewCount}
          submitting={submitting}
          onCancel={() => setConfirmSubmit(false)}
          onConfirm={doSubmit}
        />
      )}
    </div>
  );
}
