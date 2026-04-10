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
  const [openPatternId, setOpenPatternId] = useState<string | null>(highlightPatternId || null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Load persisted subject on mount
  useEffect(() => {
    const saved = localStorage.getItem("activeSubject");
    if (saved && subjects.includes(saved)) {
      setActiveSubject(saved);
    }
  }, []);

  // Auto-filter if a highlightPatternId is provided (from Dashboard "Solve Again")
  useEffect(() => {
    if (highlightPatternId) {
      const targetPattern = patterns.find(p => p.id === highlightPatternId);
      if (targetPattern) {
        setActiveSubject(targetPattern.subject);
        setOpenPatternId(highlightPatternId);
        localStorage.setItem("activeSubject", targetPattern.subject);
      }
    }
  }, [highlightPatternId, patterns]);

  // Smooth scroll to the table when a filter is clicked
  const handleFilterClick = (subject: string) => {
    setActiveSubject(subject);
    localStorage.setItem("activeSubject", subject);
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
    <div className="w-full space-y-4">
      {/* Sticky subject filter bar */}
      <div
        className="sticky top-[60px] z-30 -mx-4 px-4 py-3 backdrop-blur-md border-b"
        style={{ background: "var(--sticky-bar-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {subjects.map((s) => {
            const count = s === "All" ? patterns.length : subjectCounts[s];
            const isActive = activeSubject === s;
            return (
              <button
                key={s}
                onClick={() => handleFilterClick(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "hover:opacity-80"
                }`}
                style={isActive ? undefined : { background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}
              >
                {s}
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={
                    isActive
                      ? { background: "rgba(255,255,255,0.20)", color: "#fff" }
                      : { background: "var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pattern rows table */}
      <div ref={tableRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="col-span-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic</div>
          <div className="hidden md:block col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</div>
          <div className="col-span-4 md:col-span-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Progress</div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredPatterns.length > 0 ? (
            filteredPatterns.map((pattern) => (
              <PatternRow
                key={pattern.id}
                pattern={pattern}
                isHighlighted={pattern.id === highlightPatternId}
                isOpen={openPatternId === pattern.id}
                onToggle={() => setOpenPatternId(openPatternId === pattern.id ? null : pattern.id)}
              />
            ))
          ) : (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm font-medium">No topics in this subject.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span>{filteredPatterns.length} of {patterns.length} topics</span>
        <span>Verified for GATE 2027</span>
      </div>
    </div>
  );
}