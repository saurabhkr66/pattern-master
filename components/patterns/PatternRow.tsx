// components/patterns/PatternRow.tsx
"use client";

import { useRouter } from "next/navigation";
import PracticeButton from "./PracticeButton";
import ConfidenceBadge from "./ConfidenceBadge";
import { useState } from "react";

interface PatternRowProps {
  pattern: any;
  isHighlighted?: boolean;
}

export default function PatternRow({ pattern, isHighlighted }: PatternRowProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(isHighlighted || false);
  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"bank" | "pyq">("bank");
  const [selectedPyq, setSelectedPyq] = useState<any>(null);
  const [pyqRevealed, setPyqRevealed] = useState(false);
  const [pyqSelectedAnswer, setPyqSelectedAnswer] = useState<string | null>(null);

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

  // PYQ answer handler (with API call)
  const handlePyqAnswer = async (option: string) => {
    if (pyqRevealed) return;
    const letter = option.trim().charAt(0).toUpperCase();
    const isCorrect = letter === selectedPyq.correct_answer;
    
    setPyqSelectedAnswer(letter);
    setPyqRevealed(true);

    try {
      await fetch("/api/save-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pyqId: selectedPyq.id,
          isCorrect: isCorrect,
        }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to save attempt:", err);
    }
  };

  const resetPyq = () => {
    setSelectedPyq(null);
    setPyqRevealed(false);
    setPyqSelectedAnswer(null);
  };

  return (
    <div className={`border-b border-gray-100 last:border-0 transition-all ${
      isHighlighted ? 'bg-blue-50 ring-2 ring-blue-500 shadow-lg z-10 relative animate-pulse' : 
      isOpen ? 'bg-blue-50/20' : 'hover:bg-gray-50/50'
    }`}>
      
      {/* --- ROW HEADER --- */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="grid grid-cols-12 gap-4 items-center px-6 py-5 cursor-pointer group"
      >
        {/* Topic Name & Atomic Logic Preview */}
        <div className="col-span-12 md:col-span-8 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm transition-all ${
            isMastered ? "bg-yellow-100 border border-yellow-200" : "bg-white border border-gray-200 text-gray-300"
          }`}>
            {isMastered ? "👑" : "📄"}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h4 className={`font-bold transition-colors ${isOpen ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                {pattern.topic_name}
              </h4>
              <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                {pattern.subject}
              </span>
              {pyqCount > 0 && (
                <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                  {pyqCount} PYQ{pyqCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5 italic">
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
          
          {/* Tab Switcher: Question Bank | PYQs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-4">
            <button
              onClick={() => { setActiveTab("bank"); resetPyq(); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === "bank"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              🏦 Question Bank
              <span className="ml-1.5 text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-black">{total}</span>
            </button>
            <button
              onClick={() => { setActiveTab("pyq"); setSelectedHistoryQuestion(null); setIsGenerating(false); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === "pyq"
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              📜 Previous Year
              <span className="ml-1.5 text-[9px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full font-black">{pyqCount}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-blue-100 p-4 md:p-8 shadow-sm min-h-[300px]">
            
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
                              onClick={() => setDifficultyFilter(lvl)}
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
                    <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
                      <button 
                        onClick={resetPyq}
                        className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-orange-600 uppercase tracking-widest transition-colors"
                      >
                        ← Back to PYQs
                      </button>
                      <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase">
                        {selectedPyq.exam_type} {selectedPyq.year}
                      </span>
                    </div>

                    {/* PYQ Question Card */}
                    <div className="p-4 md:p-6 bg-white rounded-2xl border-2 border-orange-50 shadow-sm mb-4">
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] md:text-[10px] font-black bg-orange-600 text-white px-2 py-0.5 rounded uppercase">
                            {pattern.topic_name}
                          </span>
                          <span className="text-[9px] md:text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase">
                            {selectedPyq.exam_type} {selectedPyq.year}
                          </span>
                        </div>
                        {pyqRevealed && (
                          <span className={`text-[10px] md:text-xs font-bold shrink-0 ${
                            pyqSelectedAnswer === selectedPyq.correct_answer ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {pyqSelectedAnswer === selectedPyq.correct_answer ? "✓ CORRECT" : "✕ INCORRECT"}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-800 font-bold text-sm md:text-lg leading-snug mb-4 md:mb-6">
                        {selectedPyq.question_text}
                      </p>

                      <div className="grid grid-cols-1 gap-2 md:gap-3">
                        {selectedPyq.options.map((option: string, i: number) => {
                          const letter = option.trim().charAt(0).toUpperCase();
                          const isSelected = pyqSelectedAnswer === letter;
                          const isActuallyCorrect = letter === selectedPyq.correct_answer;

                          let buttonStyle = "border-gray-100 bg-gray-50 active:bg-orange-50";
                          if (pyqRevealed) {
                            if (isActuallyCorrect) {
                              buttonStyle = "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500";
                            } else if (isSelected) {
                              buttonStyle = "border-red-500 bg-red-50 text-red-800";
                            } else {
                              buttonStyle = "opacity-40 border-gray-100 grayscale-[0.5]";
                            }
                          }

                          return (
                            <button
                              key={i}
                              disabled={pyqRevealed}
                              onClick={() => handlePyqAnswer(option)}
                              className={`group w-full text-left p-3 md:p-4 border-2 rounded-xl transition-all flex items-center gap-3 md:gap-4 select-none touch-manipulation ${buttonStyle}`}
                            >
                              <span className={`w-7 h-7 md:w-8 md:h-8 shrink-0 flex items-center justify-center rounded-lg font-bold text-xs md:text-sm border-2 transition-colors ${
                                pyqRevealed && isActuallyCorrect 
                                  ? "bg-green-500 text-white border-green-500" 
                                  : "bg-white text-gray-400 border-gray-200 group-hover:border-orange-400"
                              }`}>
                                {letter}
                              </span>
                              <span className="font-medium text-xs md:text-base leading-tight">
                                {option.includes('.') ? option.split('.').slice(1).join('.').trim() : option}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    {pyqRevealed && (
                      <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-gray-900 text-white p-5 md:p-6 rounded-2xl shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl md:text-6xl font-black">📜</div>
                          <h4 className="text-orange-400 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2 md:mb-3">PYQ Logic Breakdown</h4>
                          <p className="text-gray-300 text-xs md:text-sm leading-relaxed relative z-10">
                            {selectedPyq.explanation}
                          </p>
                          <div className="mt-4 md:mt-6">
                            <button 
                              onClick={resetPyq}
                              className="w-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-[10px] md:text-xs font-bold py-3 md:py-3.5 rounded-lg transition-colors border border-white/10 touch-manipulation"
                            >
                              ← Back to PYQ List
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
                              onClick={() => { setSelectedPyq(pyq); setPyqRevealed(false); setPyqSelectedAnswer(null); }}
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