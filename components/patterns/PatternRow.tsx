"use client";

import { useRouter } from "next/navigation";
import { toSlug, getQuestionUrl } from "@/lib/seo";
import PracticeButton from "./PracticeButton";
import ConfidenceBadge from "./ConfidenceBadge";
import MathRenderer from "@/components/ui/MathRenderer";
import UserNotesEditor from "./UserNotesEditor";
import { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";
import { ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PatternRowProps {
  pattern: any;
  isHighlighted?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const difficultyColors: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard: "bg-red-100 text-red-700",
};

// Shared fetch function for both query and prefetch
const fetchPatternQuestions = async (patternId: string) => {
  const res = await fetch(`/api/patterns/${patternId}/questions`);
  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json();
};

// ── MEMOIZED QUESTION CARD ─────────────────────────────────────────────
const QuestionCard = memo(({ q, i, pattern, onSelect, isPyqOverride }: any) => {
  const isPyq = isPyqOverride !== undefined ? isPyqOverride : q._isPyq;
  const seoUrl = getQuestionUrl({
    id: q.id,
    prefix: isPyq ? "pyq" : "gq",
    subject: pattern.subject,
    topicName: pattern.topic_name,
    examType: q.exam_type
  });

  return (
    <div className="relative group/card h-full">
      <button
        onClick={() => onSelect(q)}
        className={`w-full flex flex-col p-5 rounded-2xl border-2 bg-white dark:bg-[#111] hover:shadow-xl transition-all text-left relative overflow-hidden h-full ${
          q._isPyq 
            ? 'border-orange-100 dark:border-orange-500/20 hover:border-orange-300 hover:shadow-orange-500/5' 
            : 'border-gray-50 dark:border-white/5 hover:border-blue-200 hover:shadow-blue-500/5'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-black text-gray-200 dark:text-gray-400 group-hover/card:text-blue-200 transition-colors">#{i + 1}</span>
          <div className="flex items-center gap-1.5">
            {q.images && q.images.length > 0 && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                🖼️ Image
              </span>
            )}
            {isPyq && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                PYQ {q.year}
              </span>
            )}
            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
              isPyq 
                ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400' 
                : (difficultyColors[q.difficulty_level] || "bg-gray-100 text-gray-500")
            }`}>
              {isPyq ? q.exam_type : q.difficulty_level}
            </span>
          </div>
        </div>
        <MathRenderer 
          content={q.question_text} 
          className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 flex-grow" 
        />
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 dark:border-white/5">
           <span className={`text-[9px] font-black opacity-0 group-hover/card:opacity-100 transition-opacity uppercase tracking-wider ${
             isPyq ? 'text-orange-600' : 'text-blue-600'
           }`}>Solve →</span>
           {q.attempts?.[0] && (
             <span className={`text-[10px] font-bold ${q.attempts[0].is_correct ? "text-green-500" : "text-red-400"}`}>
                {q.attempts[0].is_correct ? "✓ Correct" : "✕ Try Again"}
             </span>
           )}
        </div>
      </button>
      <a
        href={seoUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        title="Open question page"
        className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 z-10"
      >
        <ExternalLink size={11} className="text-gray-400 hover:text-blue-500" />
      </a>
    </div>
  );
});

QuestionCard.displayName = "QuestionCard";

export default function PatternRow({ pattern, isHighlighted, isOpen, onToggle }: PatternRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"bank" | "pyq" | "notes" | "review-notes">(pattern.isSubjectLevel ? "pyq" : "bank");
  const [selectedPyq, setSelectedPyq] = useState<any>(null);
  const [visibleBank, setVisibleBank] = useState(21);
  const [visiblePyqs, setVisiblePyqs] = useState(21);

  // Prefetch questions on hover — starts loading before the click
  const handlePrefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["patternQuestions", pattern.id],
      queryFn: () => fetchPatternQuestions(pattern.id),
      staleTime: 5 * 60 * 1000, // Don't re-prefetch if already cached
    });
  }, [queryClient, pattern.id]);

  const { data, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["patternQuestions", pattern.id],
    queryFn: () => fetchPatternQuestions(pattern.id),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,   // Cache for 5 min — reopening a topic is instant
    gcTime: 10 * 60 * 1000,     // Keep in memory for 10 min
  });

  const questions = data?.questions || [];
  const pyqs = data?.pyqs || [];

  const getAccent = (subject: string) => {
    const s = (subject || "").toLowerCase();
    if (s.includes("organization") || s.includes("architecture")) return { pill: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-50", activeTab: "text-indigo-600 border-indigo-500" };
    if (s.includes("operating")) return { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500", activeTab: "text-amber-600 border-amber-500" };
    if (s.includes("algorithms") || s.includes("data structure")) return { pill: "bg-purple-100 text-purple-700", dot: "bg-purple-500", activeTab: "text-purple-600 border-purple-500" };
    if (s.includes("math") || s.includes("discrete") || s.includes("calculus") || s.includes("algebra")) return { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", activeTab: "text-emerald-600 border-emerald-500" };
    return { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500", activeTab: "text-blue-600 border-blue-500" };
  };

  const accent = getAccent(pattern.subject);
  const total = pattern.totalQuestions || 0;
  const solved = pattern.solvedQuestions || 0;
  const accuracy = total > 0 ? (solved / total) * 100 : 0;
  const isMastered = solved >= 5;
  const pyqCount = pattern.pyqsCount || 0;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (data && pattern.isSubjectLevel && questions.length === 0) {
      setActiveTab("pyq");
    }
  }, [data, pattern.isSubjectLevel, questions.length]);

  useEffect(() => {
    const saved = localStorage.getItem("preferredDifficulty");
    if (saved) setDifficultyFilter(saved);
  }, []);

  const handleDifficultyChange = (lvl: string) => {
    setDifficultyFilter(lvl);
    localStorage.setItem("preferredDifficulty", lvl);
  };

  const mixedBankQuestions = useMemo(() => {
    const regularQs =
      difficultyFilter === "All"
        ? questions
        : questions.filter((q: any) => q.difficulty_level === difficultyFilter);
    if (!pyqs || pyqs.length === 0) return regularQs;
    const taggedPyqs = pyqs.map((p: any) => ({ ...p, _isPyq: true }));
    return [...regularQs, ...taggedPyqs];
  }, [questions, pyqs, difficultyFilter]);

  const resetPyq = () => setSelectedPyq(null);

  const pyqQueue = useMemo(() => {
    if (!selectedPyq) return [];
    const all = (pyqs || []).map((p: any) => ({ ...p, _isPyq: true }));
    const idx = all.findIndex((p: any) => p.id === selectedPyq.id);
    return idx !== -1 ? all.slice(idx + 1) : [];
  }, [pyqs, selectedPyq]);

  const historyQueue = useMemo(() => {
    if (!selectedHistoryQuestion) return [];
    const idx = mixedBankQuestions.findIndex((q: any) => q.id === selectedHistoryQuestion.id);
    return idx !== -1 ? mixedBankQuestions.slice(idx + 1) : [];
  }, [mixedBankQuestions, selectedHistoryQuestion]);

  return (
    <div
      ref={rowRef}
      className={`transition-colors ${
        isHighlighted
          ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400"
          : pattern.isSubjectLevel
          ? "bg-indigo-50/40 border-l-4 border-l-indigo-500"
          : isOpen
          ? "bg-blue-50/30"
          : "hover:bg-gray-50/60"
      }`}
    >
      <div onClick={onToggle} onMouseEnter={handlePrefetch} className="grid grid-cols-12 items-center gap-3 px-5 py-4 cursor-pointer group">
        <div className="col-span-8 flex items-center gap-3">
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base border ${
              pattern.isSubjectLevel ? "bg-indigo-600 border-indigo-500 text-white shadow-sm" : isMastered ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"
            }`}>
            {pattern.isSubjectLevel ? "🎓" : isMastered ? "👑" : "📄"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h4 className={`font-bold text-sm leading-snug truncate transition-colors ${isOpen ? "text-blue-600" : "text-gray-900 group-hover:text-blue-600"}`}>
                {pattern.topic_name}
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight ${accent.pill}`}>
                  {pattern.subject}
                </span>
                {pyqCount > 0 && (
                  <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-tight">
                    {pyqCount} PYQ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden md:flex col-span-2 justify-center">
          <ConfidenceBadge accuracy={accuracy} />
        </div>
        <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-2 md:gap-3">
          <div className="text-right">
            <div className="md:hidden">
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${accuracy === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {Math.round(accuracy)}%
              </span>
            </div>
            <div className="hidden md:block">
              <span className="text-sm font-black text-gray-900">{solved}</span>
              <span className="text-xs text-gray-400 font-bold"> / {total}</span>
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-300 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-500" : "group-hover:text-blue-400"}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="px-3 md:px-5 pb-5 md:pb-7">
          <div className="flex items-center gap-0.5 border-b border-gray-100 mb-5 overflow-x-auto scrollbar-hide">
            {(pattern.isSubjectLevel 
              ? [ { key: "pyq", label: "Previous Year", count: pyqCount, emoji: "📜" } ]
              : [
                  { key: "bank", label: "Question Bank", count: total, emoji: "🏦" },
                  { key: "pyq", label: "Previous Year", count: pyqCount, emoji: "📜" },
                  { key: "notes", label: "Mastery Notes", count: null, emoji: "📚" },
                  { key: "review-notes", label: "My Notes", count: null, emoji: "📝" },
                ] as const
            ).map(({ key, label, count, emoji }: any) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSelectedHistoryQuestion(null);
                  setIsGenerating(false);
                  resetPyq();
                }}
                className={`relative flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                  activeTab === key ? `${accent.activeTab} bg-white` : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                <span>{emoji}</span>
                <span className="hidden sm:inline">{label}</span>
                {count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeTab === key ? "bg-blue-50 text-blue-500" : "bg-gray-100 text-gray-400"}`}>
                    {count}
                  </span>
                )}
                {key === "review-notes" && (
                  <span className="absolute top-1.5 right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 p-4 md:p-6 min-h-[240px] flex flex-col">
            {isLoadingQuestions ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading questions…</p>
              </div>
            ) : (
              <>
                {activeTab === "notes" && (
                  <div className="animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Mastery Notes</h3>
                      </div>
                      <button onClick={() => setActiveTab("bank")} className="self-start sm:self-auto bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors">
                        Practice Mode →
                      </button>
                    </div>
                    {pattern.short_notes ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {[0, 1].map((col) => (
                          <div key={col} className="flex flex-col gap-4">
                            {pattern.short_notes.split(/###\s+/).filter(Boolean).map((s: string, idx: number) => ({ s, idx })).filter((x: any) => x.idx % 2 === col).map(({ s, idx }: any) => {
                              const lines = s.split("\n");
                              return (
                                <div key={idx} className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 p-5">
                                  <div className="flex items-center gap-2.5 mb-4">
                                    <div className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                                    <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">{lines[0].trim()}</h4>
                                  </div>
                                  <MathRenderer content={lines.slice(1).join("\n").trim()} className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium" />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-gray-400">Notes coming soon.</div>
                    )}
                  </div>
                )}

                {activeTab === "review-notes" && (
                  <div className="animate-in fade-in duration-300">
                    <UserNotesEditor patternId={pattern.id} />
                  </div>
                )}

                {activeTab === "bank" && (
                  <div>
                    <div style={{ display: (selectedHistoryQuestion || isGenerating) ? 'none' : 'block' }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-0.5 p-0.5 bg-gray-100 dark:bg-white/5 rounded-lg">
                          {["All", "Easy", "Medium", "Hard"].map((lvl) => (
                            <button key={lvl} onClick={() => handleDifficultyChange(lvl)} className={`px-3 py-2 rounded-md text-xs font-black uppercase transition-all ${difficultyFilter === lvl ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                              {lvl}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setIsGenerating(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors">+ Generate</button>
                      </div>

                      {mixedBankQuestions.length === 0 ? (
                        <div className="py-10 text-center text-gray-400 uppercase text-[10px] font-black tracking-widest">Bank is empty</div>
                      ) : (
                        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {mixedBankQuestions.slice(0, visibleBank).map((q: any, i: number) => (
                              <QuestionCard key={q.id} q={q} i={i} pattern={pattern} onSelect={setSelectedHistoryQuestion} />
                            ))}
                          </div>
                          {mixedBankQuestions.length > visibleBank && (
                            <div className="mt-8 flex justify-center pb-4">
                              <button 
                                onClick={() => setVisibleBank(prev => prev + 21)}
                                className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-colors"
                              >
                                Load More Questions
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {selectedHistoryQuestion && (
                      <div className="animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                          <button onClick={() => setSelectedHistoryQuestion(null)} className="text-[11px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
                            ← Back to Bank
                          </button>
                        </div>
                        <PracticeButton 
                          patternId={pattern.id} 
                          topicName={pattern.topic_name} 
                          initialQuestion={selectedHistoryQuestion} 
                          initialQueue={historyQueue} 
                          onExit={() => setSelectedHistoryQuestion(null)}
                        />
                      </div>
                    )}

                    {isGenerating && (
                      <div className="animate-in fade-in duration-200 max-w-xl mx-auto py-4">
                        <PracticeButton patternId={pattern.id} topicName={pattern.topic_name} initialQuestion={null} />
                        <button onClick={() => setIsGenerating(false)} className="w-full mt-4 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "pyq" && (
                  <div>
                    <div style={{ display: selectedPyq ? 'none' : 'block' }}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Previous Year Questions</span>
                      </div>
                      {pyqCount === 0 ? (
                        <div className="py-10 text-center text-gray-400 uppercase text-[10px] font-black tracking-widest">No PYQs yet</div>
                      ) : (
                        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pyqs.slice(0, visiblePyqs).map((pyq: any, i: number) => (
                              <QuestionCard key={pyq.id} q={pyq} isPyqOverride={true} i={i} pattern={pattern} onSelect={setSelectedPyq} />
                            ))}
                          </div>
                          {pyqs.length > visiblePyqs && (
                            <div className="mt-8 flex justify-center pb-4">
                              <button 
                                onClick={() => setVisiblePyqs(prev => prev + 21)}
                                className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-colors"
                              >
                                Load More PYQs
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedPyq && (
                      <div className="animate-in fade-in duration-200">
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                          <button onClick={resetPyq} className="text-[11px] font-black text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors">
                            ← Back to PYQs
                          </button>
                          <span className="text-[10px] font-black bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full">
                {pyqQueue.length} queued
              </span>
                        </div>
                             
                        <PracticeButton patternId={pattern.id} topicName={pattern.topic_name} initialQuestion={{ ...selectedPyq, _isPyq: true }} initialQueue={pyqQueue} isPyqMode={true} onExit={resetPyq} />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
