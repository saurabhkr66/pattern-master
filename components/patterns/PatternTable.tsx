"use client"
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useRef } from "react";
import PatternRow from "./PatternRow";

export default function PatternTable({ 
  patterns, 
  highlightPatternId,
  subjectStats,
  activeSubject 
}: { 
  patterns: any[], 
  highlightPatternId?: string,
  subjectStats: Record<string, number>,
  activeSubject: string
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openPatternId, setOpenPatternId] = useState<string | null>(highlightPatternId || null);
  const tableRef = useRef<HTMLDivElement>(null);

  // 1. Prepare subjects for tabs
  const subjects = ["All", ...Object.keys(subjectStats).sort()];
  const totalTopicCount = Object.values(subjectStats).reduce((a, b) => a + b, 0);

  const [isPending, startTransition] = React.useTransition();

  // Smooth scroll and URL update
  const handleFilterClick = (subject: string) => {
    if (isPending) return;
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("subject", subject);
      
      // Reset pattern highlight/open state when switching subjects
      setOpenPatternId(null);
      
      router.push(`?${params.toString()}`, { scroll: false });

      // Scroll the table into view
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    });
  };

  const filteredPatterns = patterns; // Server already filtered them

  return (
    <div className="w-full space-y-4">
      {/* Sticky subject filter bar */}
      <div
        className="sticky top-[60px] z-30 -mx-4 px-4 py-3 backdrop-blur-md border-b"
        style={{ background: "var(--sticky-bar-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {subjects.map((s) => {
            const count = s === "All" ? totalTopicCount : subjectStats[s];
            const isActive = activeSubject === s;
            return (
              <button
                key={s}
                onClick={() => handleFilterClick(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "hover:opacity-80"
                } ${isPending && !isActive ? "opacity-30 pointer-events-none" : ""}`}
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
        <span>{filteredPatterns.length} of {totalTopicCount} topics</span>
        <span>Verified for GATE 2027</span>
      </div>
    </div>
  );
}