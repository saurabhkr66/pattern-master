"use client"
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import PatternRow from "./PatternRow";
import { SlidersHorizontal, X } from "lucide-react";

type FilterState = "all" | "not-started" | "in-progress" | "mastered";

const FILTER_OPTIONS: { value: FilterState; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not-started", label: "Not Started" },
  { value: "in-progress", label: "In Progress" },
  { value: "mastered", label: "Mastered" },
];

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
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const [activeFilter, setActiveFilter] = useState<FilterState>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  // 1. Prepare subjects for tabs — display "PYQs by Subject" but send "All" to server
  const subjects = ["PYQs by Subject", ...Object.keys(subjectStats).sort()];
  const totalTopicCount = Object.values(subjectStats).reduce((a, b) => a + b, 0);

  const [isPending, startTransition] = React.useTransition();

  // Prefetch all subject tab URLs on mount — makes tab switching instant
  React.useEffect(() => {
    subjects.forEach((s) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("subject", s === "PYQs by Subject" ? "All" : s);
      router.prefetch(`/practice?${params.toString()}`);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterClick = (subject: string) => {
    if (isPending) return;
    // Reset filter when switching subjects
    setActiveFilter("all");

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      // "PYQs by Subject" maps to "All" on the server
      params.set("subject", subject === "PYQs by Subject" ? "All" : subject);

      setOpenPatternId(null);

      router.push(`?${params.toString()}`, { scroll: false });

      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    });
  };

  // Compute displayed subject label (server sends "All", we display "PYQs by Subject")
  const displaySubject = activeSubject === "All" ? "PYQs by Subject" : activeSubject;

  // 2. Apply filter
  const displayedPatterns = activeFilter === "all"
    ? patterns
    : patterns.filter((p) => {
        if (activeFilter === "not-started") return p.solvedQuestions === 0;
        if (activeFilter === "in-progress") return p.solvedQuestions > 0 && p.solvedQuestions < p.totalQuestions;
        if (activeFilter === "mastered") return p.solvedQuestions >= 5;
        return true;
      });

  // Sync open state when navigation from search provides a highlight ID
  useEffect(() => {
    if (highlightPatternId) {
      setOpenPatternId(highlightPatternId);
    }
  }, [highlightPatternId]);

  // Close filter popover on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filter-popover]") && !target.closest("[data-filter-btn]")) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const handleTopicToggle = (id: string) => {
    setOpenPatternId(openPatternId === id ? null : id);
    
    // Clear highlight (patternId) from URL once user interacts with any topic
    if (searchParams.has("patternId")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("patternId");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Sticky subject filter bar */}
      <div
        className="sticky top-[60px] z-30 -mx-4 px-4 py-3 backdrop-blur-md border-b"
        style={{ background: "var(--sticky-bar-bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          {/* Subject tabs — scrollable */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1 min-w-0">
            {subjects.map((s) => {
              const count = s === "PYQs by Subject" ? totalTopicCount : subjectStats[s];
              const isActive = displaySubject === s;
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

            {/* "Filtered" virtual tab */}
            {activeFilter !== "all" && (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap shrink-0 bg-amber-500 text-white shadow-md shadow-amber-500/20"
              >
                Filtered
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.20)", color: "#fff" }}>
                  {displayedPatterns.length}
                </span>
                <span
                  className="ml-0.5 hover:bg-white/20 rounded p-0.5 transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setActiveFilter("all"); }}
                >
                  <X size={10} />
                </span>
              </button>
            )}
          </div>

          {/* Filter funnel button */}
          <div className="relative shrink-0">
            <button
              ref={filterBtnRef}
              data-filter-btn
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-1.5 p-2 rounded-lg transition-colors ${
                activeFilter !== "all"
                  ? "bg-amber-500/20 text-amber-500"
                  : "hover:bg-white/10"
              }`}
              style={activeFilter === "all" ? { color: "var(--text-secondary)" } : undefined}
              aria-label="Filter topics"
              title="Filter by status"
            >
              <SlidersHorizontal size={15} />
            </button>

            {/* Filter popover */}
            {filterOpen && (
              <div
                data-filter-popover
                className="absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-xl overflow-hidden z-50"
                style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
              >
                {FILTER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setActiveFilter(value); setFilterOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:opacity-80"
                    style={{
                      background: activeFilter === value ? "var(--bg-surface-2)" : "transparent",
                      color: activeFilter === value ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: activeFilter === value ? 700 : 500,
                    }}
                  >
                    {label}
                    {activeFilter === value && <span className="text-amber-500 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          {displayedPatterns.length > 0 ? (
            displayedPatterns.map((pattern) => (
              <PatternRow
                key={pattern.id}
                pattern={pattern}
                isHighlighted={pattern.id === highlightPatternId}
                isOpen={openPatternId === pattern.id}
                onToggle={() => handleTopicToggle(pattern.id)}
              />
            ))
          ) : (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm font-medium">
                {activeFilter !== "all" ? `No ${FILTER_OPTIONS.find(o => o.value === activeFilter)?.label.toLowerCase()} topics.` : "No topics in this subject."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span>
          {displaySubject === "PYQs by Subject"
            ? `${displayedPatterns.length} subjects`
            : activeFilter !== "all"
              ? `${displayedPatterns.length} of ${patterns.length} topics`
              : `${patterns.length} topics`}
        </span>
        <span>Verified for GATE 2027</span>
      </div>
    </div>
  );
}
