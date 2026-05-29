// components/patterns/PracticeButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { quickEditExplanation } from "@/app/actions/admin";
import MathRenderer from "@/components/ui/MathRenderer";
import { BE } from "@/lib/theme";
import { useLanguage } from "@/components/providers/LanguageProvider";

import QuestionControls from "./QuestionControls";
import ProgressRail from "./ProgressRail";
import QuestionMetaBar from "./QuestionMetaBar";
import AnswerSelector from "./AnswerSelector";
import ActionRow from "./ActionRow";
import ExplanationPanel from "./ExplanationPanel";
import ReportModal from "./ReportModal";
import SignInModal from "./SignInModal";

interface PracticeButtonProps {
  patternId: string;
  topicName: string;
  initialQuestion?: any;
  initialQueue?: any[];
  isPyqMode?: boolean;
  onExit?: () => void;
}

export default function PracticeButton({ patternId, topicName, initialQuestion, initialQueue, isPyqMode: _propIsPyqMode, onExit }: PracticeButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  const isAdmin = userEmail === "sauravkum4200@gmail.com" || userEmail === "sauravkum420@gmail.com";

  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState("");
  const [isSavingExplanation, setIsSavingExplanation] = useState(false);

  const isPyqMode = _propIsPyqMode || initialQuestion?._isPyq;
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<any>(initialQuestion || null);
  const [questionQueue, setQuestionQueue] = useState<any[]>(initialQueue || []);
  const [difficulty, setDifficulty] = useState("Medium");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [msqSelections, setMsqSelections] = useState<string[]>([]);
  const [natValue, setNatValue] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [aiModel, setAiModel] = useState<"gemini" | "deepseek" | "gemma">("gemini");
  const lastInitialIdRef = useRef<string | null>(initialQuestion?.id || null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<{ input: number; output: number; thoughts: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<any[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  useEffect(() => {
    const currentInitialId = initialQuestion?.id || null;
    if (initialQuestion) {
      if (currentInitialId !== lastInitialIdRef.current && currentInitialId !== question?.id) {
        setQuestion(initialQuestion);
        setQuestionQueue(initialQueue || []);
        setIsRevealed(false);
        setSelectedAnswer(null);
        setMsqSelections([]);
        setNatValue("");
        setError(null);
        setQuestionHistory([]);
        setSeconds(0);
        setIsBookmarked(!!initialQuestion?.isBookmarked);
        setGeneratedExplanation(null);
        setHasReported(false);
        setShowReportModal(false);
      }
      lastInitialIdRef.current = currentInitialId;
    } else {
      if (lastInitialIdRef.current !== null) {
        setQuestion(null);
        setQuestionQueue([]);
        setIsBookmarked(false);
        setGeneratedExplanation(null);
        setHasReported(false);
        setShowReportModal(false);
        lastInitialIdRef.current = null;
      }
    }
  }, [initialQuestion, initialQueue]);

  useEffect(() => {
    if (question) setIsBookmarked(!!question.isBookmarked);
  }, [question?.id]);

  useEffect(() => {
    if (!question?.id) return;
    const params = new URLSearchParams(window.location.search);
    params.set("q", question.id);
    router.replace(`/practice?${params.toString()}`, { scroll: false });
  }, [question?.id, router]);

  useEffect(() => {
    if (question && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [question?.id, !!question]);

  useEffect(() => {
    if (question) {
      const timer = setTimeout(() => {}, 5000);
      return () => clearTimeout(timer);
    }
  }, [!!question]);

  useEffect(() => {
    if (!question || isRevealed) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [question, isRevealed]);

  useEffect(() => {
    if (!question) return;
    const handler = (e: KeyboardEvent) => {
      if (isRevealed) {
        if (e.key === "Enter") { e.preventDefault(); handleNextFromQueue(); }
        return;
      }
      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        if (question.question_type === "MSQ") toggleMsqSelection(key);
        else setSelectedAnswer(key);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (question.question_type === "MCQ" && selectedAnswer) handleSubmit();
        else if (question.question_type === "MSQ" && msqSelections.length > 0) handleSubmit();
        else if (question.question_type === "NAT" && natValue.trim()) handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [question?.id, isRevealed, selectedAnswer, msqSelections, questionQueue?.length]);

  const handleGenerateExplanation = async () => {
    if (!question || isGeneratingExplanation) return;
    setIsGeneratingExplanation(true);
    const isMock = question.isMock || patternId?.startsWith("mock-");
    const mockTestId = isMock ? patternId.replace("mock-", "") : undefined;
    try {
      const res = await fetch("/api/questions/generate-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, questionType: isMock ? "MockQuestion" : undefined, mockTestId, isSubjectPyq: question._isSubjectPyq, isPyq: question._isPyq }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedExplanation(data.explanation);
        if (data.usage) setAiUsage(data.usage);
      }
    } catch (e) {
      console.error("Failed to generate explanation", e);
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  const handleGenerate = async () => {
    if (!isSignedIn) { setShowSignInModal(true); return; }
    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setQuestionQueue([]);
    setSelectedAnswer(null);
    setMsqSelections([]);
    setNatValue("");
    setIsRevealed(false);
    setHasReported(false);
    setGeneratedExplanation(null);
    setAiUsage(null);
    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, difficulty, provider: aiModel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setQuestion(data.current);
      setQuestionQueue(data.queue || []);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextFromQueue = () => {
    if (questionQueue.length > 0) {
      const [next, ...rest] = questionQueue;
      setQuestionHistory((h) => [...h, question]);
      setQuestion(next);
      setQuestionQueue(rest);
      setSelectedAnswer(null);
      setMsqSelections([]);
      setNatValue("");
      setIsRevealed(false);
      setSeconds(0);
      setHasReported(false);
      setGeneratedExplanation(null);
      setAiUsage(null);
    } else {
      if (isPyqMode) {
        setIsFullscreen(false);
        if (onExit) onExit();
        else setQuestion(null);
      } else {
        handleGenerate();
      }
    }
  };

  const handlePrevious = () => {
    if (questionHistory.length === 0) return;
    const prev = questionHistory[questionHistory.length - 1];
    setQuestionHistory((h) => h.slice(0, -1));
    setQuestionQueue((q) => [question, ...q]);
    setQuestion(prev);
    setSelectedAnswer(null);
    setMsqSelections([]);
    setNatValue("");
    setIsRevealed(false);
    setHasReported(false);
    setGeneratedExplanation(null);
    setAiUsage(null);
  };

  const toggleMsqSelection = (letter: string) => {
    if (isRevealed) return;
    setMsqSelections((prev) => prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter].sort());
  };

  const evaluateAnswer = (userAns: string, questionObj: any) => {
    if (!userAns || !questionObj) return false;
    const type = questionObj.question_type || "MCQ";
    const dbAns = (questionObj.correct_answer || "").trim();

    if (type === "MCQ") {
      return userAns.trim().charAt(0).toUpperCase() === dbAns.charAt(0).toUpperCase();
    }
    if (type === "MSQ") {
      const parse = (str: string) => str.split(/[;,]/).map(s => s.trim().toUpperCase()).filter(Boolean).sort().join(",");
      return parse(userAns) === parse(dbAns);
    }
    if (type === "NAT") {
      const userVal = parseFloat(userAns.trim());
      if (isNaN(userVal)) return false;
      const rangeMatch = dbAns.match(/^([\d.-]+)\s*(?::|to)\s*([\d.-]+)$/i);
      if (rangeMatch) return userVal >= parseFloat(rangeMatch[1]) && userVal <= parseFloat(rangeMatch[2]);
      const dbVal = parseFloat(dbAns);
      return !isNaN(dbVal) && Math.abs(userVal - dbVal) < 0.000001;
    }
    return false;
  };

  const checkIsCorrect = () => {
    if (!question) return false;
    const type = question.question_type || "MCQ";
    const currentAnswer = type === "MCQ" ? selectedAnswer : type === "MSQ" ? msqSelections.sort().join(", ") : natValue;
    return evaluateAnswer(currentAnswer || "", question);
  };

  const handleSubmit = async (finalAnswerOverride?: string) => {
    if (isRevealed) return;
    if (!isSignedIn) { setShowSignInModal(true); return; }

    const type = question.question_type || "MCQ";
    const finalAnswer = finalAnswerOverride || (
      type === "MCQ" ? selectedAnswer :
      type === "MSQ" ? msqSelections.sort().join(", ") :
      natValue
    ) || "";

    const isCorrect = evaluateAnswer(finalAnswer, question);
    if (type === "MCQ" && !finalAnswerOverride) setSelectedAnswer(finalAnswer);
    setIsRevealed(true);

    // Did this question already count toward the solved total BEFORE this attempt?
    // The server counts DISTINCT correctly-answered questions per pattern, so we
    // only bump on the FIRST correct solve — never on re-solves, never for mocks.
    const wasAlreadySolved = (question.attempts || []).some((a: any) => a?.is_correct);
    const shouldIncrement = isCorrect && !wasAlreadySolved && !question.isMock;

    queryClient.setQueryData(["patternQuestions", patternId], (oldData: any) => {
      if (!oldData) return oldData;
      const newAttempt = { is_correct: isCorrect, user_answer: finalAnswer, created_at: new Date().toISOString() };
      const updateArray = (arr: any[]) => (arr || []).map(q =>
        q.id === question.id ? { ...q, attempts: [newAttempt, ...(q.attempts || [])] } : q
      );
      return { ...oldData, questions: updateArray(oldData.questions), pyqs: updateArray(oldData.pyqs) };
    });

    // Optimistically bump the solved count so the progress bar ticks up instantly —
    // no refetch (which the endpoint's `private, max-age=30` would serve stale anyway),
    // no DB aggregation. PatternTable derives the displayed count as
    // `progress[id] ?? topic.solvedQuestions`, so we patch BOTH caches: the progress
    // map (authoritative when present) and the topics list (the fallback, and the only
    // cache guaranteed to exist for the rows on screen). The server reconciles the
    // true count on the next full page load.
    const bumpSolved = (delta: number) => {
      queryClient.setQueriesData({ queryKey: ["practiceProgress"] }, (old: any) => {
        const map = old?.progress ?? {};
        return { ...(old ?? {}), progress: { ...map, [patternId]: Math.max(0, (map[patternId] ?? 0) + delta) } };
      });
      queryClient.setQueriesData({ queryKey: ["practiceTopics"] }, (old: any) => {
        if (!old?.topics) return old;
        return {
          ...old,
          topics: old.topics.map((t: any) =>
            t.id === patternId
              ? { ...t, solvedQuestions: Math.max(0, (t.solvedQuestions ?? 0) + delta) }
              : t
          ),
        };
      });
    };

    if (shouldIncrement) bumpSolved(1);

    fetch("/api/save-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: (question._isPyq || question.isMock) ? undefined : question.id,
        pyqId: question._isPyq ? question.id : undefined,
        mockQuestionId: question.isMock ? question.id : undefined,
        isCorrect,
        userAnswer: finalAnswer,
        timeSpent: seconds,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`save-attempt failed: ${res.status}`);
      })
      .catch((err) => {
        console.error("Failed to save attempt:", err);
        // Roll back the optimistic bump so the bar can't drift above the DB count.
        if (shouldIncrement) bumpSolved(-1);
      });
  };

  const handleSaveExplanation = async () => {
    if (!isAdmin || !question) return;
    setIsSavingExplanation(true);
    try {
      let type = "GeneratedQuestion";
      let mockTestId: string | undefined;
      if (question.isMock) { type = "MockQuestion"; mockTestId = patternId.replace("mock-", ""); }
      else if (question._isPyq) type = "PYQ";

      await quickEditExplanation(question.id, type, editedExplanation, mockTestId);
      setQuestion({ ...question, explanation: editedExplanation });
      setGeneratedExplanation(null);
      setIsEditingExplanation(false);
    } catch (err) {
      console.error("Failed to save explanation:", err);
      alert("Failed to save explanation.");
    } finally {
      setIsSavingExplanation(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!question || isBookmarking) return;
    if (!isSignedIn) { setShowSignInModal(true); return; }
    setIsBookmarking(true);
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const res = await fetch("/api/bookmarks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: (question._isPyq || question.isMock) ? undefined : question.id,
          pyqId: question._isPyq ? question.id : undefined,
          mockQuestionId: question.isMock ? question.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsBookmarked(data.bookmarked);
      queryClient.setQueryData(["patternQuestions", patternId], (oldData: any) => {
        if (!oldData) return oldData;
        const updateArray = (arr: any[]) => (arr || []).map(q =>
          q.id === question.id ? { ...q, isBookmarked: data.bookmarked } : q
        );
        return { ...oldData, questions: updateArray(oldData.questions), pyqs: updateArray(oldData.pyqs) };
      });
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      setIsBookmarked(prev);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleBack = () => {
    setIsFullscreen(false);
    if (onExit) onExit();
    else setQuestion(null);
  };

  return (
    <div ref={containerRef} className="w-full scroll-mt-20">
      {!question ? (
        <QuestionControls
          difficulty={difficulty}
          aiModel={aiModel}
          isLoading={isLoading}
          error={error}
          onDifficultyChange={setDifficulty}
          onModelChange={setAiModel}
          onGenerate={handleGenerate}
        />
      ) : (
        <div
          className={isFullscreen ? "fixed inset-0 z-[60] overflow-y-auto flex flex-col" : "rounded-2xl border overflow-hidden flex flex-col w-full shadow-sm"}
          style={{ background: isFullscreen ? "var(--bg-base)" : "var(--bg-surface)", borderColor: BE.line }}
        >
          <ProgressRail
            questionHistory={questionHistory}
            questionQueue={questionQueue}
            seconds={seconds}
            isFullscreen={isFullscreen}
            onBack={handleBack}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />

          <div className={isFullscreen ? "max-w-3xl mx-auto w-full px-4 pt-6 pb-24 sm:py-10 md:py-14" : "p-4 sm:p-6 md:p-8 pb-20 sm:pb-8"}>
            <QuestionMetaBar
              question={question}
              topicName={topicName}
              hasReported={hasReported}
              isBookmarked={isBookmarked}
              isBookmarking={isBookmarking}
              language={language}
              onReport={() => setShowReportModal(true)}
              onToggleBookmark={handleToggleBookmark}
              onLanguageChange={setLanguage}
            />

            <div style={{ fontSize: "clamp(15px, 4vw, 20px)", lineHeight: 1.6, letterSpacing: -0.2, fontWeight: 400, marginBottom: 24, fontFamily: BE.serif, color: BE.text, overflowWrap: "break-word", wordBreak: "break-word" }}>
              <MathRenderer content={(language === "hi" && question.question_text_hindi) ? question.question_text_hindi : question.question_text} />
            </div>

            <AnswerSelector
              question={question}
              language={language}
              selectedAnswer={selectedAnswer}
              msqSelections={msqSelections}
              natValue={natValue}
              isRevealed={isRevealed}
              checkIsCorrect={checkIsCorrect}
              onSelectAnswer={setSelectedAnswer}
              onToggleMsq={toggleMsqSelection}
              onNatChange={setNatValue}
              onNatSubmit={() => handleSubmit()}
            />

            <ActionRow
              question={question}
              isRevealed={isRevealed}
              selectedAnswer={selectedAnswer}
              msqSelections={msqSelections}
              natValue={natValue}
              questionHistory={questionHistory}
              questionQueue={questionQueue}
              onPrevious={handlePrevious}
              onSkip={handleNextFromQueue}
              onSubmit={() => handleSubmit()}
              onNext={handleNextFromQueue}
            />

            {isRevealed && (
              <ExplanationPanel
                question={question}
                language={language}
                isCorrect={checkIsCorrect()}
                seconds={seconds}
                isAdmin={isAdmin}
                isGeneratingExplanation={isGeneratingExplanation}
                generatedExplanation={generatedExplanation}
                aiUsage={aiUsage}
                isEditingExplanation={isEditingExplanation}
                editedExplanation={editedExplanation}
                isSavingExplanation={isSavingExplanation}
                onGenerateExplanation={handleGenerateExplanation}
                onToggleEdit={() => {
                  if (isEditingExplanation) {
                    setIsEditingExplanation(false);
                  } else {
                    setEditedExplanation(generatedExplanation || question.explanation || "");
                    setIsEditingExplanation(true);
                  }
                }}
                onEditChange={setEditedExplanation}
                onSaveExplanation={handleSaveExplanation}
              />
            )}
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportModal
          questionId={question?.id}
          isPyq={question?._isPyq}
          isSubjectPyq={question?._isSubjectPyq}
          isSignedIn={!!isSignedIn}
          onClose={() => setShowReportModal(false)}
          onReported={() => setHasReported(true)}
          onRequireSignIn={() => setShowSignInModal(true)}
        />
      )}

      {showSignInModal && (
        <SignInModal onClose={() => setShowSignInModal(false)} />
      )}
    </div>
  );
}
