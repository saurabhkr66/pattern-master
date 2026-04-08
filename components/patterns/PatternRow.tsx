// components/patterns/PatternRow.tsx
"use client";

import { useState } from "react";
import PracticeButton from "./PracticeButton";
import ConfidenceBadge from "./ConfidenceBadge";

interface PatternRowProps {
  pattern: any;
  isHighlighted?: boolean;
}

export default function PatternRow({ pattern, isHighlighted }: PatternRowProps) {
  const [isOpen, setIsOpen] = useState(isHighlighted || false);
  const [selectedHistoryQuestion, setSelectedHistoryQuestion] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  // Difficulty badge colors
  const difficultyColors: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-700",
    Medium: "bg-amber-100 text-amber-700",
    Hard: "bg-red-100 text-red-700",
  };

  // Stats calculation for the row header
  const total = pattern.questions.length;
  const solved = pattern.questions.filter((q: any) => q.attempts?.[0]?.is_correct).length;
  const accuracy = total > 0 ? (solved / total) * 100 : 0;
  
  // Mastery logic: 5 correct answers earns the crown
  const isMastered = solved >= 5;

  // Filter questions by difficulty
  const filteredQuestions = difficultyFilter === "All"
    ? pattern.questions
    : pattern.questions.filter((q: any) => q.difficulty_level === difficultyFilter);

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
          <div className="bg-white rounded-2xl border border-blue-100 p-4 md:p-8 shadow-sm min-h-[300px]">
            
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
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">Reviewing History</span>
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
              /* MODE 3: BANK MODE (The main grid of questions) */
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

                {filteredQuestions.length === 0 ? (
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
                      {filteredQuestions.map((q: any, i: number) => (
                        <button
                          key={q.id}
                          onClick={() => setSelectedHistoryQuestion(q)}
                          className="group flex flex-col p-5 rounded-2xl border-2 border-gray-50 bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left relative overflow-hidden h-full"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black text-gray-200 group-hover:text-blue-200 transition-colors">#{i + 1}</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${difficultyColors[q.difficulty_level] || "bg-gray-100 text-gray-500"}`}>
                              {q.difficulty_level}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-700 line-clamp-3 mb-4 flex-grow">
                            {q.question_text}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                             <span className="text-[9px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Solve →</span>
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
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}