// components/patterns/PatternRow.tsx
"use client";

import { useRouter } from "next/navigation";
import PracticeButton from "./PracticeButton";
import ConfidenceBadge from "./ConfidenceBadge";
import { useState, useEffect, useRef } from "react";

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
  
  // Debug: Check if short_notes is arriving
  console.log(`[PatternRow] ${pattern.topic_name} notes:`, pattern.short_notes ? "Value present" : "NULL");
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  const getTheme = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes("organization") || s.includes("architecture")) return { base: "indigo", bg: "bg-indigo-600", border: "border-indigo-100", text: "text-indigo-600", ring: "ring-indigo-500/20", light: "bg-indigo-50/50" };
    if (s.includes("operating")) return { base: "amber", bg: "bg-amber-600", border: "border-amber-100", text: "text-amber-600", ring: "ring-amber-500/20", light: "bg-amber-50/50" };
    if (s.includes("algorithms") || s.includes("data structure")) return { base: "purple", bg: "bg-purple-600", border: "border-purple-100", text: "text-purple-600", ring: "ring-purple-500/20", light: "bg-purple-50/50" };
    if (s.includes("math") || s.includes("discrete") || s.includes("calculus") || s.includes("algebra")) return { base: "emerald", bg: "bg-emerald-600", border: "border-emerald-100", text: "text-emerald-600", ring: "ring-emerald-500/20", light: "bg-emerald-50/50" };
    return { base: "blue", bg: "bg-blue-600", border: "border-blue-100", text: "text-blue-600", ring: "ring-blue-500/20", light: "bg-blue-50/50" };
  };

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("complexity") || t.includes("time") || t.includes("perform")) return "⚡";
    if (t.includes("memory") || t.includes("cache") || t.includes("storage")) return "🧠";
    if (t.includes("hazard") || t.includes("stall") || t.includes("conflict")) return "⚠️";
    if (t.includes("formula") || t.includes("metric") || t.includes("math")) return "🔢";
    if (t.includes("property") || t.includes("rule") || t.includes("concept")) return "✨";
    return "💡";
  };

  const theme = getTheme(pattern.subject);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly to wait for the expansion animation to complete
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [isOpen]);

  // Let's use the actual React pattern for this
  useEffect(() => {
    const saved = localStorage.getItem("preferredDifficulty");
    if (saved) {
      setDifficultyFilter(saved);
    }
  }, []);

  const handleDifficultyChange = (lvl: string) => {
    setDifficultyFilter(lvl);
    localStorage.setItem("preferredDifficulty", lvl);
  };
  const [activeTab, setActiveTab] = useState<"bank" | "pyq" | "notes">("bank");
  const [selectedPyq, setSelectedPyq] = useState<any>(null);

  // Difficulty badge colors
  const difficultyColors: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-700",
    Hard: "bg-red-100 text-red-700",
  };

  // Stats calculation for the row header
  const total = pattern.questions.length + (pattern.pyqs?.length || 0);
  const solved = pattern.questions.filter((q: any) => q.attempts?.[0]?.is_correct).length +
                 (pattern.pyqs?.filter((p: any) => p.attempts?.[0]?.is_correct).length || 0);
  const accuracy = total > 0 ? (solved / total) * 100 : 0;
  
  // Mastery logic: 5 correct answers earns the crown
  const isMastered = solved >= 5;

  // PYQ count
  const pyqCount = pattern.pyqs?.length || 0;

  // Build mixed question list: regular questions + random PYQs injected
  const getMixedQuestions = () => {
    const regularQs = difficultyFilter === "All"
      ? pattern.questions
      : pattern.questions.filter((q: any) => q.difficulty_level === difficultyFilter);

    if (!pattern.pyqs || pattern.pyqs.length === 0) return regularQs;

    // Tag all PYQs for identification  
    const taggedPyqs = pattern.pyqs.map((p: any) => ({ ...p, _isPyq: true }));

    // Merge and shuffle everything together
    const mixed = [...regularQs, ...taggedPyqs].sort(() => Math.random() - 0.5);

    return mixed;
  };

  // Filter questions by difficulty (for bank tab only)
  const filteredQuestions = difficultyFilter === "All"
    ? pattern.questions
    : pattern.questions.filter((q: any) => q.difficulty_level === difficultyFilter);

  const resetPyq = () => {
    setSelectedPyq(null);
  };

  return (
    <div ref={rowRef} className={`border-b border-gray-100 last:border-0 transition-all ${
      isHighlighted ? 'bg-blue-50 ring-2 ring-blue-500 shadow-lg z-10 relative animate-pulse' : 
      isOpen ? 'bg-blue-50/20' : 'hover:bg-gray-50/50'
    }`}>
      
      {/* --- ROW HEADER --- */}
      <div 
        onClick={onToggle}
        className="grid grid-cols-12 gap-4 items-center px-6 py-5 cursor-pointer group"
      >
        {/* Topic Name & Atomic Logic Preview */}
        <div className="col-span-12 md:col-span-8 flex items-center gap-3 md:gap-4">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg shadow-sm transition-all shrink-0 ${
            isMastered ? "bg-yellow-100 border border-yellow-200" : "bg-white border border-gray-200 text-gray-300"
          }`}>
            {isMastered ? "👑" : "📄"}
          </div>
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className={`font-bold text-sm md:text-base transition-colors truncate ${isOpen ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                {pattern.topic_name}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[8px] md:text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  {pattern.subject}
                </span>
                {pyqCount > 0 && (
                  <span className="text-[8px] md:text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                    {pyqCount} PYQ
                  </span>
                )}
              </div>
            </div>
            {/* Mobile Progress Strip */}
            <div className="flex md:hidden items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-gray-900">{solved}</span>
                <span className="text-gray-400 text-[9px] font-bold">/ {total}</span>
              </div>
              <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-black ${accuracy >= 80 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {accuracy.toFixed(0)}%
                </span>
              </div>
            </div>
            <p className="hidden md:block text-[11px] text-gray-400 font-medium truncate mt-0.5 italic">
              Logic: {pattern.atomic_logic}
            </p>
          </div>
        </div>

        {/* Confidence Badge (Desktop Only) */}
        <div className="hidden md:flex col-span-2 justify-center">
          <ConfidenceBadge accuracy={accuracy} />
        </div>

        {/* Solved Count & Chevron */}
        <div className="hidden md:flex col-span-2 items-center justify-end gap-6">
          <div className="text-right">
            <span className="text-sm font-black text-gray-900">{solved}</span>
            <span className="text-gray-400 text-xs font-bold"> / {total}</span>
          </div>
          <span className={`text-gray-300 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {/* --- EXPANDED CONTENT (THE WORKSPACE) --- */}
      {isOpen && (
        <div className="px-3 md:px-6 pb-6 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* Tab Switcher: Question Bank | PYQs | Notes */}
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 mb-6 pb-2">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl w-max shrink-0">
              <button
                onClick={() => { setActiveTab("bank"); resetPyq(); }}
                className={`px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === "bank"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                🏦 Question Bank
                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-black ${activeTab === "bank" ? "bg-blue-50 text-blue-500" : "bg-gray-200 text-gray-400"}`}>
                  {total}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab("pyq"); setSelectedHistoryQuestion(null); setIsGenerating(false); }}
                className={`px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === "pyq"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                📜 Previous Year
                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-black ${activeTab === "pyq" ? "bg-orange-50 text-orange-500" : "bg-gray-200 text-gray-400"}`}>
                  {pyqCount}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab("notes"); setSelectedHistoryQuestion(null); setIsGenerating(false); resetPyq(); }}
                className={`px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === "notes"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                📚 Mastery Notes
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-blue-100 p-4 md:p-8 shadow-sm min-h-[300px]">
            
            {/* ==========================================
                TAB: SHORT NOTES
               ========================================== */}
            {activeTab === "notes" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="relative">
                  {/* Notes Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-10">
                    <div className="flex items-center gap-4 md:gap-5">
                      <div className={`w-12 h-12 md:w-14 md:h-14 ${theme.bg} rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl shadow-${theme.base}-500/30 text-xl md:text-2xl font-bold text-white relative group/icon overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/icon:translate-y-0 transition-transform duration-500"></div>
                        <span className="relative z-10">📝</span>
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-none mb-1 tracking-tight uppercase">Mastery Notes</h3>
                        <p className={`text-[9px] md:text-[10px] font-black ${theme.text} uppercase tracking-[0.2em] flex items-center gap-2`}>
                          Blueprint <span className={`w-1 h-1 ${theme.bg} rounded-full`}></span> {pattern.topic_name}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab("bank")}
                      className={`px-5 md:px-8 py-2 md:py-3 ${theme.light} hover:opacity-80 ${theme.text} text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl md:rounded-2xl transition-all border ${theme.border} shadow-sm flex items-center gap-3 group/btn shrink-0 w-fit`}
                    >
                      Practice Mode <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                    </button>
                  </div>

                  {pattern.short_notes ? (
                    /* The actual "Designed" Notes Grid - Masonry style */
                    <div className="columns-1 md:columns-2 gap-4 md:gap-6 space-y-4 md:space-y-6">
                      {(() => {
                        const sections = pattern.short_notes.split(/###\s+/).filter(Boolean);
                        return sections.map((section: string, idx: number) => {
                          const lines = section.split('\n');
                          const title = lines[0].trim();
                          const content = lines.slice(1).filter(l => l.trim().length > 0);
                          const cardIcon = getIcon(title);

                          return (
                            <div 
                              key={idx} 
                              className={`break-inside-avoid group bg-white rounded-2xl md:rounded-[32px] border ${theme.border} shadow-sm hover:shadow-2xl hover:shadow-${theme.base}-500/10 hover:-translate-y-1 transition-all duration-500 p-5 md:p-8 flex flex-col relative overflow-hidden`}
                            >
                              {/* Glowing Background Accent */}
                              <div className={`absolute -right-4 -top-4 w-24 h-24 ${theme.bg} opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity`}></div>
                              
                              <div className="flex items-center justify-between mb-4 md:mb-8">
                                <h4 className={`text-[10px] md:text-[11px] font-black ${theme.text} uppercase tracking-[0.15em] flex items-center gap-3`}>
                                  <span className={`w-6 md:w-8 h-[2px] ${theme.bg} opacity-20 group-hover:opacity-100 group-hover:w-10 md:group-hover:w-12 transition-all`}></span> 
                                  {title}
                                </h4>
                                <span className="text-lg md:text-xl grayscale group-hover:grayscale-0 transition-all duration-500">{cardIcon}</span>
                              </div>

                              <div className="space-y-3 md:space-y-5 flex-grow">
                                {content.map((line: string, lIdx: number) => {
                                  const isFormula = line.includes('$') || line.includes('=') || line.includes('/') || line.includes('log') || line.includes('max') || line.includes('min');
                                  const isBullet = line.trim().startsWith('•') || line.trim().match(/^\d+\./);
                                  
                                  const cleanLine = line.trim().replace(/^[•\d+\.]\s*/, '');

                                  if (isFormula) {
                                    return (
                                      <div key={lIdx} className={`${theme.light} border ${theme.border} rounded-xl md:rounded-2xl p-3 md:p-5 my-1.5 md:my-2 relative overflow-hidden group/formula`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${theme.bg} opacity-30`}></div>
                                        <p className={`${theme.text} font-bold text-[10px] md:text-sm tracking-tight font-mono leading-relaxed`}>
                                          {line.trim()}
                                        </p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div key={lIdx} className="flex gap-3 md:gap-4">
                                      {isBullet && (
                                        <div className={`mt-2 w-1.5 h-1.5 rounded-full ${theme.bg} shrink-0 shadow-[0_0_12px_rgba(var(--${theme.base}-rgb),0.6)]`} />
                                      )}
                                      <p className={`text-gray-600 font-bold text-[11px] md:text-[14px] leading-relaxed tracking-tight ${!isBullet ? `${theme.text} text-[9px] md:text-[10px] uppercase font-black opacity-40 mt-3 md:mt-4 mb-1` : ''}`}>
                                        {cleanLine}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-6 md:mt-10 pt-4 md:pt-5 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-[7px] md:text-[8px] font-black text-gray-300 uppercase leading-none tracking-widest">Mastery Kit v2.0</span>
                                <div className="flex gap-1.5">
                                  <div className={`w-1 h-1 rounded-full ${theme.bg} opacity-20`}></div>
                                  <div className={`w-1 h-1 rounded-full ${theme.bg} opacity-40`}></div>
                                  <div className={`w-1 h-1 rounded-full ${theme.bg} opacity-100 animate-pulse`}></div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="py-24 text-center bg-gray-50/50 rounded-[48px] border-2 border-dashed border-gray-100 relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50"></div>
                       <div className="relative z-10">
                         <div className="text-6xl mb-8 grayscale opacity-20 text-center animate-bounce duration-[3000ms]">✍️</div>
                         <h4 className="text-gray-400 font-black text-sm uppercase tracking-[0.3em] mb-3">Drafting Blueprint</h4>
                         <p className="text-gray-400 text-[11px] font-bold italic max-w-xs mx-auto opacity-60">Our subject masters are synthesizing the core patterns for this topic. Stay tuned!</p>
                       </div>
                    </div>
                  )}

                  <div className="mt-8 md:mt-16 text-center border-t border-gray-50 pt-6 md:pt-10">
                    <p className="text-[9px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] italic flex items-center justify-center gap-4">
                      <span className="w-8 md:w-12 h-px bg-gray-100"></span> Verified for GATE 2027 by AI Systems <span className="w-8 md:w-12 h-px bg-gray-100"></span>
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* ==========================================
                TAB: QUESTION BANK (existing logic)
               ========================================== */}
            {activeTab === "bank" && (
              <>
                {/* MODE 1: PRACTICE MODE (Solving a specific question) */}
                {selectedHistoryQuestion ? (
                  <div className="animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                      <button 
                        onClick={() => setSelectedHistoryQuestion(null)}
                        className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
                      >
                        ← Back to Question Bank
                      </button>
                      <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
                        {selectedHistoryQuestion._isPyq ? `PYQ ${selectedHistoryQuestion.year}` : "Reviewing History"}
                      </span>
                    </div>
                    <PracticeButton 
                      patternId={pattern.id} 
                      topicName={pattern.topic_name} 
                      initialQuestion={selectedHistoryQuestion}
                      initialQueue={(() => {
                        const allMixed = getMixedQuestions();
                        const idx = allMixed.findIndex((q: any) => q.id === selectedHistoryQuestion.id);
                        return idx !== -1 ? allMixed.slice(idx + 1) : [];
                      })()}
                    />
                  </div>
                ) : isGenerating ? (
                  /* MODE 2: GENERATE MODE (Initiating new questions) */
                  <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto py-8">
                    <div className="text-center mb-8">
                      <h4 className="text-xl font-black text-gray-900 mb-2">Generate New Practice</h4>
                      <p className="text-gray-400 text-sm font-medium">Select your difficulty and Gemini will create 5 unique questions.</p>
                    </div>
                    <PracticeButton 
                      patternId={pattern.id} 
                      topicName={pattern.topic_name} 
                      initialQuestion={null}
                    />
                    <button 
                      onClick={() => setIsGenerating(false)}
                      className="w-full mt-4 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                    >
                      Cancel and Return to Bank
                    </button>
                  </div>
                ) : (
                  /* MODE 3: BANK MODE (The main grid of questions — with random PYQs mixed in) */
                  <div className="animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question Bank</h5>
                        <div className="h-px w-8 bg-gray-100"></div>
                        {/* Difficulty Filter */}
                        <div className="flex gap-1 p-0.5 bg-gray-50 rounded-lg">
                          {["All", "Easy", "Medium", "Hard"].map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => handleDifficultyChange(lvl)}
                              className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                difficultyFilter === lvl ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsGenerating(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                      >
                        + Generate New
                      </button>
                    </div>

                    {(() => {
                      const mixedQs = getMixedQuestions();
                      return mixedQs.length === 0 ? (
                        <div className="py-20 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
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
                            {mixedQs.map((q: any, i: number) => (
                              <button
                                key={q.id}
                                onClick={() => setSelectedHistoryQuestion(q)}
                                className={`group flex flex-col p-5 rounded-2xl border-2 bg-white hover:shadow-xl transition-all text-left relative overflow-hidden h-full ${
                                  q._isPyq 
                                    ? 'border-orange-100 hover:border-orange-300 hover:shadow-orange-500/5' 
                                    : 'border-gray-50 hover:border-blue-200 hover:shadow-blue-500/5'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <span className="text-[10px] font-black text-gray-200 group-hover:text-blue-200 transition-colors">#{i + 1}</span>
                                  <div className="flex items-center gap-1.5">
                                    {q._isPyq && (
                                      <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-orange-100 text-orange-600">
                                        PYQ {q.year}
                                      </span>
                                    )}
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                                      q._isPyq 
                                        ? 'bg-gray-100 text-gray-500' 
                                        : (difficultyColors[q.difficulty_level] || "bg-gray-100 text-gray-500")
                                    }`}>
                                      {q._isPyq ? q.exam_type : q.difficulty_level}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs font-bold text-gray-700 line-clamp-3 mb-4 flex-grow">
                                  {q.question_text}
                                </p>
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                                   <span className={`text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider ${
                                     q._isPyq ? 'text-orange-600' : 'text-blue-600'
                                   }`}>Solve →</span>
                                   {q.attempts?.[0] && (
                                     <span className={`text-[10px] font-bold ${q.attempts[0].is_correct ? "text-green-500" : "text-red-400"}`}>
                                        {q.attempts[0].is_correct ? "✓ Correct" : "✕ Try Again"}
                                     </span>
                                   )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            {/* ==========================================
                TAB: PREVIOUS YEAR QUESTIONS
               ========================================== */}
            {activeTab === "pyq" && (
              <div className="animate-in fade-in duration-500">
                {/* Solving a selected PYQ */}
                {selectedPyq ? (
                  <div className="animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                      <button 
                        onClick={resetPyq}
                        className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors"
                      >
                        ← Back to PYQs
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase">
                          {selectedPyq.exam_type} {selectedPyq.year}
                        </span>
                      </div>
                    </div>

                    <PracticeButton 
                      patternId={pattern.id} 
                      topicName={pattern.topic_name} 
                      initialQuestion={{ ...selectedPyq, _isPyq: true }}
                      initialQueue={(() => {
                        const allPyqs = (pattern.pyqs || []).map((p: any) => ({ ...p, _isPyq: true }));
                        const idx = allPyqs.findIndex((p: any) => p.id === selectedPyq.id);
                        return idx !== -1 ? allPyqs.slice(idx + 1) : [];
                      })()}
                    />
                  </div>
                ) : (
                  /* PYQ List Mode */
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Previous Year Questions</h5>
                        <div className="h-px w-8 bg-gray-100"></div>
                      </div>
                      <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                        {pyqCount} question{pyqCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {pyqCount === 0 ? (
                      <div className="py-20 text-center bg-orange-50/30 rounded-3xl border-2 border-dashed border-orange-100">
                        <div className="text-4xl mb-4">📜</div>
                        <h4 className="text-gray-400 font-black text-sm uppercase tracking-widest mb-1">No PYQs Yet</h4>
                        <p className="text-gray-300 text-[10px] font-medium italic">Previous year questions for this topic haven&#39;t been added yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pattern.pyqs.map((pyq: any, i: number) => (
                            <button
                              key={pyq.id}
                              onClick={() => { 
                                setSelectedPyq(pyq); 
                              }}
                              className="group flex flex-col p-5 rounded-2xl border-2 border-orange-50 bg-white hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all text-left relative overflow-hidden h-full"
                            >
                              {/* Year banner */}
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black text-gray-200 group-hover:text-orange-200 transition-colors">#{i + 1}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-orange-500 text-white shadow-sm">
                                    {pyq.year}
                                  </span>
                                  <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-gray-100 text-gray-500">
                                    {pyq.exam_type}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-gray-700 line-clamp-3 mb-4 flex-grow">
                                {pyq.question_text}
                              </p>
                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-orange-50">
                                <span className="text-[9px] font-black text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Solve →</span>
                                {pyq.attempts?.[0] && (
                                  <span className={`text-[10px] font-bold ${pyq.attempts[0].is_correct ? "text-green-500" : "text-red-400"}`}>
                                    {pyq.attempts[0].is_correct ? "✓ Correct" : "✕ Try Again"}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}