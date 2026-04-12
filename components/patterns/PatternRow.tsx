// components/patterns/PatternRow.tsx
"use client";

import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/seo";
import PracticeButton from "./PracticeButton";
import ConfidenceBadge from "./ConfidenceBadge";
import MathRenderer from "@/components/ui/MathRenderer";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PatternRowProps {
  pattern: any;
  isHighlighted?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export default function PatternRow({ pattern, isHighlighted, isOpen, onToggle }: PatternRowProps) {
  const router = useRouter();
  const rowRef = useRef<HTMLDivElement>(null);

  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"bank" | "pyq" | "notes">("bank");
  const [selectedPyq, setSelectedPyq] = useState<any>(null);

  // TanStack Query for Lazy Loading Questions
  const { data, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["patternQuestions", pattern.id],
    queryFn: async () => {
      const res = await fetch(`/api/patterns/${pattern.id}/questions`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      return res.json();
    },
    enabled: isOpen, // Only fetch when row is expanded
  });

  const questions = data?.questions || [];
  const pyqs = data?.pyqs || [];

  // Subject-based accent color
  const getAccent = (subject: string) => {
    const s = (subject || "").toLowerCase();
    if (s.includes("organization") || s.includes("architecture")) return { pill: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-50", activeTab: "text-indigo-600 border-indigo-500" };
    if (s.includes("operating")) return { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500", activeTab: "text-amber-600 border-amber-500" };
    if (s.includes("algorithms") || s.includes("data structure")) return { pill: "bg-purple-100 text-purple-700", dot: "bg-purple-500", activeTab: "text-purple-600 border-purple-500" };
    if (s.includes("math") || s.includes("discrete") || s.includes("calculus") || s.includes("algebra")) return { pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", activeTab: "text-emerald-600 border-emerald-500" };
    return { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-500", activeTab: "text-blue-600 border-blue-500" };
  };

  const accent = getAccent(pattern.subject);

  // Stats (Using pre-calculated server stats)
  const total = pattern.totalQuestions || 0;
  const solved = pattern.solvedQuestions || 0;
  const accuracy = total > 0 ? (solved / total) * 100 : 0;
  const isMastered = solved >= 5;
  const pyqCount = pattern.pyqsCount || 0;

  const difficultyColors: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-700",
    Hard: "bg-red-100 text-red-700",
  };

  // Scroll into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [isOpen]);

  // Auto-switch to PYQ tab for subject-level practices if question bank is empty
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

  const getMixedQuestions = () => {
    const regularQs =
      difficultyFilter === "All"
        ? questions
        : questions.filter((q: any) => q.difficulty_level === difficultyFilter);
    if (!pyqs || pyqs.length === 0) return regularQs;
    const taggedPyqs = pyqs.map((p: any) => ({ ...p, _isPyq: true }));
    return [...regularQs, ...taggedPyqs].sort(() => Math.random() - 0.5);
  };

  const resetPyq = () => setSelectedPyq(null);

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
      {/* -- Row Header -- */}
      <div
        onClick={onToggle}
        className="grid grid-cols-12 items-center gap-3 px-5 py-4 cursor-pointer group"
      >
        <div className="col-span-8 flex items-center gap-3">
          <div
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base border ${
              pattern.isSubjectLevel
                ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                : isMastered
                ? "bg-yellow-50 border-yellow-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            {pattern.isSubjectLevel ? "🎓" : isMastered ? "👑" : "📄"}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h4
                className={`font-bold text-sm leading-snug truncate transition-colors ${
                  isOpen ? "text-blue-600" : "text-gray-900 group-hover:text-blue-600"
                }`}
              >
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
            <div className="flex md:hidden items-center gap-2 mt-0.5">
              <span className="text-[11px] font-black text-gray-800">{solved}/{total}</span>
              <span
                className={`text-[10px] font-black ${
                  accuracy >= 80 ? "text-emerald-500" : accuracy >= 50 ? "text-amber-500" : "text-red-500"
                }`}
              >
                {accuracy.toFixed(0)}%
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-gray-400 italic truncate mt-0.5 font-medium">
              {pattern.atomic_logic}
            </p>
          </div>
        </div>

        <div className="hidden md:flex col-span-2 justify-center">
          <ConfidenceBadge accuracy={accuracy} />
        </div>

        <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-3">
          <div className="text-right hidden md:block">
            <span className="text-sm font-black text-gray-900">{solved}</span>
            <span className="text-xs text-gray-400 font-bold"> / {total}</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-300 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-500" : "group-hover:text-blue-400"
            }`}
          />
        </div>
      </div>

      {/* -- Expanded Panel -- */}
      {isOpen && (
        <div className="px-3 md:px-5 pb-5 md:pb-7 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Tab bar */}
          <div className="flex items-center gap-0.5 border-b border-gray-100 mb-5 overflow-x-auto scrollbar-hide">
            {(
              [
                { key: "bank", label: "Question Bank", count: total, emoji: "🏦" },
                { key: "pyq", label: "Previous Year", count: pyqCount, emoji: "📜" },
                { key: "notes", label: "Mastery Notes", count: null, emoji: "📚" },
              ] as const
            ).map(({ key, label, count, emoji }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSelectedHistoryQuestion(null);
                  setIsGenerating(false);
                  resetPyq();
                }}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                  activeTab === key
                    ? `${accent.activeTab} bg-white`
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                <span>{emoji}</span>
                <span className="hidden sm:inline">{label}</span>
                {count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      activeTab === key ? "bg-blue-50 text-blue-500" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content card */}
          <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-white/5 p-4 md:p-6 min-h-[240px] flex flex-col">
            {isLoadingQuestions ? (
              <div className="flex-grow flex flex-col items-center justify-center py-20 animate-pulse">
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
                        <p className="text-xs text-gray-400 font-medium">Core logic and formulas for this topic.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("bank")}
                        className="self-start sm:self-auto bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
                      >
                        Practice Mode →
                      </button>
                    </div>

                    {pattern.short_notes ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {[0, 1].map((columnTrack) => (
                          <div key={columnTrack} className="flex flex-col gap-4">
                            {pattern.short_notes
                              .split(/###\s+/)
                              .filter(Boolean)
                              .map((section: string, index: number) => ({ section, index }))
                              .filter((item: { section: string; index: number }) => item.index % 2 === columnTrack)
                              .map(({ section, index }: { section: string; index: number }) => {
                                const lines = section.split("\n");
                                const title = lines[0].trim();
                                const rest = lines.slice(1).join("\n").trim();
                                return (
                                  <div
                                    key={index}
                                    className="group/card relative bg-gradient-to-b from-gray-50/50 to-white dark:from-white/[0.03] dark:to-transparent rounded-2xl border border-gray-100 dark:border-white/5 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 dark:hover:border-blue-500/20 overflow-hidden break-words"
                                  >
                                    <div className="flex items-center gap-2.5 mb-4">
                                      <div className={`w-1.5 h-1.5 rounded-full ${accent.dot} shadow-[0_0_8px_rgba(59,130,246,0.5)]`} />
                                      <h4 className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">{title}</h4>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                      <MathRenderer 
                                        content={rest} 
                                        className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center rounded-2xl bg-gray-50 dark:bg-[#111] border-2 border-dashed border-gray-100 dark:border-white/5">
                        <div className="text-4xl mb-3 grayscale opacity-30">✍️</div>
                        <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Drafting Blueprint</p>
                        <p className="text-gray-300 text-xs font-medium mt-1">Notes are being prepared for this topic.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "bank" && (
                  <div className="animate-in fade-in duration-200">
                    {selectedHistoryQuestion ? (
                      <div className="animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100 dark:border-white/5">
                          <button
                            onClick={() => setSelectedHistoryQuestion(null)}
                            className="text-[11px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
                          >
                            ← Back to Bank
                          </button>
                          <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full uppercase">
                            {selectedHistoryQuestion._isPyq ? `PYQ ${selectedHistoryQuestion.year}` : "Reviewing"}
                          </span>
                        </div>
                        <PracticeButton
                          patternId={pattern.id}
                          topicName={pattern.topic_name}
                          initialQuestion={selectedHistoryQuestion}
                          initialQueue={(() => {
                            const all = getMixedQuestions();
                            const idx = all.findIndex((q: any) => q.id === selectedHistoryQuestion.id);
                            return idx !== -1 ? all.slice(idx + 1) : [];
                          })()}
                        />
                      </div>
                    ) : isGenerating ? (
                      <div className="animate-in slide-in-from-bottom-3 duration-300 max-w-xl mx-auto py-4">
                        <div className="text-center mb-6">
                          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-1">Generate Practice</h4>
                          <p className="text-sm text-gray-400 font-medium">AI will create 5 unique questions.</p>
                        </div>
                        <PracticeButton patternId={pattern.id} topicName={pattern.topic_name} initialQuestion={null} />
                        <button
                          onClick={() => setIsGenerating(false)}
                          className="w-full mt-4 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5 p-0.5 bg-gray-100 dark:bg-white/5 rounded-lg">
                              {["All", "Easy", "Medium", "Hard"].map((lvl) => (
                                <button
                                  key={lvl}
                                  onClick={() => handleDifficultyChange(lvl)}
                                  className={`px-3 py-2 rounded-md text-xs font-black uppercase transition-all ${
                                    difficultyFilter === lvl
                                      ? "bg-white dark:bg-white/10 text-gray-800 dark:text-white shadow-sm"
                                      : "text-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => setIsGenerating(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide px-4 py-2 rounded-lg transition-colors shadow-sm"
                          >
                            + Generate
                          </button>
                        </div>

                        {getMixedQuestions().length === 0 ? (
                          <div className="py-20 text-center bg-gray-50/50 dark:bg-[#111] rounded-3xl border-2 border-dashed border-gray-100 dark:border-white/5">
                            <div className="text-4xl mb-4">📭</div>
                            <h4 className="text-gray-400 font-black text-sm uppercase tracking-widest mb-1">Bank is Empty</h4>
                            <p className="text-gray-300 text-[10px] font-medium italic mb-6">Start by generating your first set of questions.</p>
                            <button 
                              onClick={() => setIsGenerating(true)}
                              className="text-blue-600 font-black text-[10px] uppercase hover:underline"
                            >
                              Click here to generate →
                            </button>
                          </div>
                        ) : (
                          <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {getMixedQuestions().map((q: any, i: number) => {
                                const prefix = q._isPyq ? "pyq" : "gq";
                                const examSlug = toSlug(pattern.subject ? (q.exam_type || "gate") : "gate") + "-cse";
                                const subjectSlug = toSlug(pattern.subject || "general");
                                const topicSlug = toSlug(pattern.topic_name || "topic");
                                const seoUrl = `/${examSlug}/${subjectSlug}/${topicSlug}/${prefix}-${q.id}`;
                                return (
                                <div key={q.id} className="relative group/card">
                                  <button
                                    onClick={() => setSelectedHistoryQuestion(q)}
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
                                        {q._isPyq && (
                                          <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                            PYQ {q.year}
                                          </span>
                                        )}
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                          q._isPyq 
                                            ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400' 
                                            : (difficultyColors[q.difficulty_level] || "bg-gray-100 text-gray-500")
                                        }`}>
                                          {q._isPyq ? q.exam_type : q.difficulty_level}
                                        </span>
                                      </div>
                                    </div>
                                    <MathRenderer 
                                      content={q.question_text} 
                                      className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 flex-grow" 
                                    />
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 dark:border-white/5">
                                       <span className={`text-[9px] font-black opacity-0 group-hover/card:opacity-100 transition-opacity uppercase tracking-wider ${
                                         q._isPyq ? 'text-orange-600' : 'text-blue-600'
                                       }`}>Solve →</span>
                                       {q.attempts?.[0] && (
                                         <span className={`text-[10px] font-bold ${q.attempts[0].is_correct ? "text-green-500" : "text-red-400"}`}>
                                            {q.attempts[0].is_correct ? "✓ Correct" : "✕ Try Again"}
                                         </span>
                                       )}
                                    </div>
                                  </button>
                                  {/* Permalink icon – opens SEO page in new tab */}
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
                              )})}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === "pyq" && (
                  <div className="animate-in fade-in duration-200">
                    {selectedPyq ? (
                      <div className="animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                          <button
                            onClick={resetPyq}
                            className="text-[11px] font-black text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors"
                          >
                            ← Back to PYQs
                          </button>
                          <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase">
                            {selectedPyq.exam_type} {selectedPyq.year}
                          </span>
                        </div>
                        <PracticeButton
                          patternId={pattern.id}
                          topicName={pattern.topic_name}
                          initialQuestion={{ ...selectedPyq, _isPyq: true }}
                          initialQueue={(() => {
                            const all = (pyqs || []).map((p: any) => ({ ...p, _isPyq: true }));
                            const idx = all.findIndex((p: any) => p.id === selectedPyq.id);
                            return idx !== -1 ? all.slice(idx + 1) : [];
                          })()}
                        />
                      </div>
                    ) : pyqCount === 0 ? (
                      <div className="py-14 text-center bg-orange-50/30 rounded-2xl border-2 border-dashed border-orange-100">
                        <div className="text-3xl mb-3">📜</div>
                        <p className="text-gray-400 font-black text-sm uppercase tracking-widest mb-1">No PYQs Yet</p>
                        <p className="text-gray-300 text-xs font-medium">Previous year questions coming soon.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Previous Year Questions</span>
                          <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
                            {pyqCount} question{pyqCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pyqs.map((pyq: any, i: number) => {
                               const examSlug = toSlug(pyq.exam_type || 'gate') + '-cse';
                               const subSlug = toSlug(pattern.subject || pattern.topic_name || 'general');
                               const topSlug = toSlug(pattern.topic_name || 'topic');
                               const seoUrl = `/${examSlug}/${subSlug}/${topSlug}/pyq-${pyq.id}`;
                               return (
                               <div key={pyq.id} className="relative group/card">
                                 <button
                                   onClick={() => setSelectedPyq(pyq)}
                                   className="w-full group flex flex-col p-5 rounded-2xl border-2 border-orange-50 dark:border-white/5 bg-white dark:bg-[#111] hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/5 transition-all text-left relative overflow-hidden h-full"
                                 >
                                   <div className="flex justify-between items-start mb-3">
                                     <span className="text-[10px] font-black text-gray-200 dark:text-gray-400 group-hover:text-orange-200 transition-colors">#{i + 1}</span>
                                     <div className="flex items-center gap-1.5">
                                       {pyq.images && pyq.images.length > 0 && (
                                         <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                           🖼️ Image
                                         </span>
                                       )}
                                       <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-orange-500 text-white shadow-sm">
                                         {pyq.year}
                                       </span>
                                       <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                                         {pyq.exam_type}
                                       </span>
                                     </div>
                                   </div>
                                   <MathRenderer 
                                     content={pyq.question_text} 
                                     className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-3 mb-4 flex-grow" 
                                   />
                                   <div className="flex items-center justify-between mt-auto pt-3 border-t border-orange-50 dark:border-white/5">
                                     <span className="text-[9px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Solve →</span>
                                     {pyq.attempts?.[0] && (
                                       <span className={`text-[10px] font-bold ${pyq.attempts[0].is_correct ? "text-green-500" : "text-red-400"}`}>
                                         {pyq.attempts[0].is_correct ? "✓ Correct" : "✕ Try Again"}
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
                                   className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-white/10 z-10"
                                 >
                                   <ExternalLink size={11} className="text-gray-400 hover:text-orange-500" />
                                 </a>
                               </div>
                             );
                            })}
                          </div>
                        </div>
                      </>
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
