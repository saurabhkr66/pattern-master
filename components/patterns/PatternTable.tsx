// components/patterns/PatternTable.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import PatternRow from "./PatternRow";

export default function PatternTable({ 
  patterns, 
  highlightPatternId 
}: { 
  patterns: any[], 
  highlightPatternId?: string 
}) {
  // 1. Get unique subjects with counts for the top tabs
  const subjectCounts: Record<string, number> = {};
  patterns.forEach((p) => {
    const s = p.subject || "Unknown";
    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
  });
  const subjects = ["All", ...Object.keys(subjectCounts)];

  const [activeSubject, setActiveSubject] = useState("All");
  const tableRef = useRef<HTMLDivElement>(null);

  // Auto-filter if a highlightPatternId is provided (from Dashboard "Solve Again")
  useEffect(() => {
    if (highlightPatternId) {
      const targetPattern = patterns.find(p => p.id === highlightPatternId);
      if (targetPattern) {
        setActiveSubject(targetPattern.subject);
      }
    }
  }, [highlightPatternId]);

  // Smooth scroll to the table when a filter is clicked
  const handleFilterClick = (subject: string) => {
    setActiveSubject(subject);
    // Scroll the table into view smoothly
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // 2. Filter patterns based on the top tab
  const filteredPatterns = activeSubject === "All" 
    ? patterns 
    : patterns.filter(p => p.subject === activeSubject);

  return (
    <div className="w-full space-y-6">
      {/* --- STICKY SUBJECT FILTER BAR --- */}
      <div className="sticky top-[60px] z-30 -mx-4 px-4 py-3 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {subjects.map((s) => {
            const count = s === "All" ? patterns.length : subjectCounts[s];
            return (
              <button
                key={s}
                onClick={() => handleFilterClick(s)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                  activeSubject === s 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
                    : "bg-white/10 text-white/60 hover:text-white hover:bg-white/15"
                }`}
              >
                {s}
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeSubject === s
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/40"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- SUB-TOPIC ROWS --- */}
      <div ref={tableRef} className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Table Header Labels */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <div className="col-span-6 md:col-span-8">Sub-Topic & Logic</div>
          <div className="col-span-3 md:col-span-2 text-center">Status</div>
          <div className="col-span-3 md:col-span-2 text-right">Progress</div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredPatterns.length > 0 ? (
            filteredPatterns.map((pattern) => (
              <PatternRow 
                key={pattern.id} 
                pattern={pattern} 
                isHighlighted={pattern.id === highlightPatternId}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-400 font-medium">No sub-topics found for this subject.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className="flex justify-between px-2 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
        <span>Showing: {filteredPatterns.length} of {patterns.length}</span>
        <span>Verified for GATE 2027</span>
      </div>
    </div>
  );
}