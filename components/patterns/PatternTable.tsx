"use client"
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PatternRow from "./PatternRow";
import { SlidersHorizontal, X } from "lucide-react";
import { trackPageView } from "@/lib/analytics";


type FilterState = "all" | "not-started" | "in-progress" | "mastered";

const FILTER_OPTIONS: { value: FilterState; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not-started", label: "Not Started" },
  { value: "in-progress", label: "In Progress" },
  { value: "mastered", label: "Mastered" },
];

const fetchTopics = (exam: string, branch: string, subject: string) => {
  const p = new URLSearchParams({ exam, branch, subject });
  return fetch(`/api/practice/topics?${p.toString()}`).then((r) => r.json());
};

export default function PatternTable({
  patterns: initialPatterns,
  highlightPatternId,
  subjectStats,
  activeSubject: initialSubject,
}: {
  patterns: any[];
  highlightPatternId?: string;
  subjectStats: Record<string, number>;
  activeSubject: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const exam = searchParams.get("exam") || "GATE";
  const branch = searchParams.get("branch") || "";

  // Local subject state — no server navigation needed for tab switching
  const [localSubject, setLocalSubject] = useState(initialSubject);

  const [openPatternId, setOpenPatternId] = useState<string | null>(highlightPatternId || null);
  const tableRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  const [activeFilter, setActiveFilter] = useState<FilterState>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  // Fetch topics for the currently selected subject via API (client-side, cached by React Query)
  const { data, isLoading } = useQuery({
    queryKey: ["practiceTopics", exam, branch, localSubject],
    queryFn: () => fetchTopics(exam, branch, localSubject),
    initialData: localSubject === initialSubject ? { topics: initialPatterns } : undefined,
    staleTime: 5 * 60 * 1000,  // 5 min — switching back is instant
    gcTime: 10 * 60 * 1000,
  });

  const patterns = data?.topics ?? initialPatterns;

  // 1. Prepare subjects for tabs
  const subjects = ["PYQs by Subject", ...Object.keys(subjectStats).sort()];
  const totalTopicCount = Object.values(subjectStats).reduce((a, b) => a + b, 0);

  // Prefetch all subject tabs in the background on mount
  useEffect(() => {
    subjects.forEach((s, i) => {
      const subjectKey = s === "PYQs by Subject" ? "All" : s;
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ["practiceTopics", exam, branch, subjectKey],
          queryFn: () => fetchTopics(exam, branch, subjectKey),
          staleTime: 5 * 60 * 1000,
        });
      }, i * 300); // stagger 300ms to avoid DB overload
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterClick = (subject: string) => {
    const subjectKey = subject === "PYQs by Subject" ? "All" : subject;
    setLocalSubject(subjectKey);
    setActiveFilter("all");
    setOpenPatternId(null);

    // Update URL without triggering a server re-render
    const url = new URL(window.location.href);
    url.searchParams.set("subject", subjectKey);
    window.history.replaceState(null, "", url.toString());
    trackPageView();


    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Compute displayed subject label
  const displaySubject = localSubject === "All" ? "PYQs by Subject" : localSubject;

  // Apply progress filter
  const displayedPatterns = activeFilter === "all"
    ? patterns
    : patterns.filter((p: any) => {
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
      const url = new URL(window.location.href);
      url.searchParams.delete("patternId");
      window.history.replaceState(null, "", url.toString());
      trackPageView();
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
                  } ${isLoading && !isActive ? "opacity-50" : ""}`}
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
          {isLoading ? (
            // Skeleton rows while fetching new subject
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-gray-100" style={{ width: `${40 + (i * 13) % 40}%` }} />
                  <div className="h-3 w-16 rounded bg-gray-100" />
                </div>
                <div className="h-4 w-12 rounded bg-gray-100" />
              </div>
            ))
          ) : displayedPatterns.length > 0 ? (
            displayedPatterns.map((pattern: any) => (
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
