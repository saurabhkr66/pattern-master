"use client"
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useRef, useEffect, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import PatternRow from "./PatternRow";
import ResumeCard from "./ResumeCard";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
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

import { BE } from "@/lib/theme";

export default function PatternTable({
  patterns: initialPatterns,
  highlightPatternId,
  directQuestionId,
  subjectStats,
  activeSubject: initialSubject,
  resolvedExam,
  resolvedBranch,
}: {
  patterns: any[];
  highlightPatternId?: string;
  directQuestionId?: string;
  subjectStats: Record<string, number>;
  activeSubject: string;
  resolvedExam: string;
  resolvedBranch: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { userId, isLoaded: authLoaded } = useAuth();

  const exam = searchParams.get("exam") || resolvedExam;
  const branch = searchParams.get("branch") || resolvedBranch;
  // Read live from URL so it reacts to client-side navigation (e.g. "Solve again").
  // Do NOT fall back to the server props here — once the user clears patternId
  // from the URL, the prop fallback would re-assert and the sync effect below
  // would reopen the originally-highlighted row. Props are used only to seed
  // initial state.
  const urlQuestionId = searchParams.get("questionId") ?? searchParams.get("q");
  const urlPatternId = searchParams.get("patternId");
  const urlSubject = searchParams.get("subject");

  const [localSubject, setLocalSubject] = useState(urlSubject || initialSubject);
  const [openPatternId, setOpenPatternId] = useState<string | null>(
    urlPatternId ?? highlightPatternId ?? null
  );
  const [sortMode, setSortMode] = useState<"default" | "practiced">("default");
  const tableRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Keep pref_branch in sync and stamp resolved exam/branch into URL (replaces server-side redirect)
  useEffect(() => {
    if (resolvedBranch) localStorage.setItem("pref_branch", resolvedBranch);
    if (resolvedExam) localStorage.setItem("pref_exam", resolvedExam);

    const url = new URL(window.location.href);
    let changed = false;
    if (!url.searchParams.has("exam") && resolvedExam) { url.searchParams.set("exam", resolvedExam); changed = true; }
    if (!url.searchParams.has("branch") && resolvedBranch) { url.searchParams.set("branch", resolvedBranch); changed = true; }
    if (changed) window.history.replaceState(null, "", url.toString());
  }, [resolvedExam, resolvedBranch]);

  // React to client-side URL changes (e.g. "Solve again" from dashboard)
  useEffect(() => {
    if (urlPatternId) {
      setOpenPatternId(urlPatternId);
    }
    if (urlSubject && urlSubject !== localSubject) {
      setLocalSubject(urlSubject);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPatternId, urlSubject]);

  const { data, isLoading } = useQuery({
    queryKey: ["practiceTopics", exam, branch, localSubject],
    queryFn: () => fetchTopics(exam, branch, localSubject),
    initialData: localSubject === initialSubject ? { topics: initialPatterns } : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const rawPatterns = data?.topics ?? initialPatterns;

  // ── Client-side progress hydration (persisted across refresh) ──
  // Keyed on exam+branch only — stable across subject tab switches so the result
  // is fetched once and reused for the full session (staleTime: 6 h).
  //
  // We mirror the progress map into localStorage so optimistic solved-count bumps
  // (written in PracticeButton) SURVIVE a page refresh without re-hitting the
  // server. We restore the data along with its original server-fetch timestamp,
  // so React Query's 6 h staleTime is measured from the last *server* read — the
  // server is contacted at most once per 6 h, never on a plain refresh.
  const PROGRESS_TTL = 6 * 60 * 60 * 1000;
  // Scoped by userId — without it, this key survives a sign-out/sign-in on the
  // same browser and replays the PREVIOUS account's solved counts as "fresh"
  // for up to 6h on the new account (cross-account progress leak).
  const progressStorageKey = userId ? `be_progress_${userId}_${exam}_${branch}` : null;
  const [progressReady, setProgressReady] = useState(false);

  // Seed the query cache from localStorage before enabling the fetch, so fresh
  // cached data (incl. persisted bumps) skips the network call entirely.
  useEffect(() => {
    if (!authLoaded) return;
    try {
      const raw = progressStorageKey ? localStorage.getItem(progressStorageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        // Never seed from an EMPTY map: it would pin every topic at 0/N for the
        // full 6 h staleTime. Treating it as absent forces one server read,
        // which also self-heals entries poisoned before this guard existed.
        const hasProgress = Object.keys(parsed?.data?.progress ?? {}).length > 0;
        if (hasProgress && typeof parsed.fetchedAt === "number") {
          queryClient.setQueryData(["practiceProgress", exam, branch], parsed.data, {
            updatedAt: parsed.fetchedAt,
          });
        }
      }
    } catch { /* ignore corrupt/blocked storage */ }
    setProgressReady(true);
  }, [exam, branch, progressStorageKey, authLoaded, queryClient]);

  const { data: progressData } = useQuery({
    queryKey: ["practiceProgress", exam, branch],
    queryFn: async () => {
      const params = new URLSearchParams({ exam, branch });
      const res = await fetch(`/api/practice/progress?${params.toString()}`);
      if (!res.ok) throw new Error(`progress ${res.status}`);
      const json = await res.json();
      // Throw rather than cache a non-answer — React Query keeps the previous
      // data and retries, instead of persisting 0s for the next 6 h.
      if (json?.unauthenticated || json?.error) throw new Error("progress unavailable");
      try {
        if (progressStorageKey) {
          localStorage.setItem(progressStorageKey, JSON.stringify({ data: json, fetchedAt: Date.now() }));
        }
      } catch { /* ignore */ }
      return json;
    },
    staleTime: PROGRESS_TTL,  // 6 hours
    gcTime:    PROGRESS_TTL,
    enabled: progressReady,   // wait for the seed so fresh cached data skips the fetch
    refetchOnWindowFocus: false,
  });

  // Persist in-memory changes (optimistic bumps) WITHOUT advancing the server-fetch
  // timestamp, so answering questions doesn't reset the 6 h refetch timer.
  useEffect(() => {
    if (!progressData || !progressStorageKey) return;
    try {
      const raw = localStorage.getItem(progressStorageKey);
      const prev = raw ? JSON.parse(raw) : null;
      const fetchedAt = prev && typeof prev.fetchedAt === "number" ? prev.fetchedAt : Date.now();
      localStorage.setItem(progressStorageKey, JSON.stringify({ data: progressData, fetchedAt }));
    } catch { /* ignore */ }
  }, [progressData, progressStorageKey]);

  const progress: Record<string, number> = progressData?.progress ?? {};

  // Merge static patterns with dynamic progress
  const patterns = React.useMemo(() =>
    rawPatterns.map((p: any) => ({
      ...p,
      solvedQuestions: progress[p.id] ?? p.solvedQuestions ?? 0,
    })),
    [rawPatterns, progress]
  );

  const subjects = [{ id: 'All', name: 'All subjects', n: Object.values(subjectStats).reduce((a, b) => a + b, 0) }, 
                    ...Object.keys(subjectStats).sort().map(s => ({ id: s, name: s, n: subjectStats[s] }))];

  const subjectKey = `pref_subject_${exam}_${branch}`;

  const handleFilterClick = (subjectId: string) => {
    startTransition(() => {
      localStorage.setItem(subjectKey, subjectId);
      document.cookie = `${subjectKey}=${encodeURIComponent(subjectId)}; path=/; max-age=31536000; SameSite=Lax`;
      setLocalSubject(subjectId);
      setOpenPatternId(null);
      const url = new URL(window.location.href);
      url.searchParams.set("subject", subjectId);
      url.searchParams.delete("patternId");
      window.history.replaceState(null, "", url.toString());
      trackPageView();
    });
  };

  const handleTopicToggle = (id: string) => {
    const isOpening = openPatternId !== id;
    setOpenPatternId(isOpening ? id : null);
    
    const url = new URL(window.location.href);
    if (isOpening) {
      url.searchParams.set("patternId", id);
    } else {
      url.searchParams.delete("patternId");
      url.searchParams.delete("questionId");
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url.toString());
    trackPageView();
  };

  // Stats for the snapshot strip
  const totalSolved = patterns.reduce((acc: number, p: any) => acc + (p.solvedQuestions || 0), 0);
  const totalPossible = patterns.reduce((acc: number, p: any) => acc + (p.totalQuestions || 0), 0);
  const accuracy = totalPossible > 0 ? Math.round((totalSolved / totalPossible) * 100) : 0;

  const sortedPatterns = React.useMemo(() => {
    if (sortMode === "default") return patterns;
    return [...patterns].sort((a, b) => (b.solvedQuestions || 0) - (a.solvedQuestions || 0));
  }, [patterns, sortMode]);

  return (
    <div className="w-full">
      {/* Subject rail (horizontal, scrollable) */}
      <div 
        className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:overflow-visible md:pb-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {subjects.map(s => {
          const active = s.id === localSubject;
          const isFullPapers = s.id === 'Full Papers';
          return (
            <div key={s.id}
              onClick={() => handleFilterClick(s.id)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: `1px solid ${active ? BE.accent : isFullPapers ? BE.accent : BE.line}`,
                background: active ? BE.accent : isFullPapers ? BE.accentSoft : 'transparent',
                color: active ? '#fff' : isFullPapers ? BE.accent : BE.textDim,
                fontSize: 12.5, fontWeight: isFullPapers ? 700 : 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              className="hover:border-amber-500/50 transition-all active:scale-95"
            >
              {s.name}
              <span style={{ fontSize: 11, fontFamily: BE.mono, opacity: 0.7 }}>{s.n}</span>
            </div>
          );
        })}
      </div>

      {/* Resume Practice & Ads Section */}
      <div className="flex flex-col md:flex-row items-stretch gap-6 mb-6">
        <div className="md:w-[40%] min-w-0 flex">
          <ResumeCard
            onResume={(patternId, subject) => {
              if (subject && subject !== localSubject) {
                setLocalSubject(subject);
                const url = new URL(window.location.href);
                url.searchParams.set("subject", subject);
                url.searchParams.set("patternId", patternId);
                window.history.replaceState(null, "", url.toString());
              }
              setOpenPatternId(patternId);
              setTimeout(() => {
                const el = document.getElementById(`pattern-${patternId}`);
                if (!el) return;
                const block = window.innerWidth < 768 ? "start" : "center";
                el.scrollIntoView({ behavior: "smooth", block });
              }, 100);
            }}
          />
        </div>
        
        {/* Desktop Side Ad Section */}
        {/* <div className="hidden md:flex md:w-[60%] flex-col">
          <div style={{ fontSize: 10, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Sponsored</div>
          <div style={{ 
            border: `1px solid ${BE.line}`, 
            borderRadius: 16, 
            padding: 24, 
            flex: 1,
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,143,0,0.1)', color: BE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: BE.text, marginBottom: 6 }}>Master GATE 2026</div>
            <div style={{ fontSize: 14, color: BE.textDim, lineHeight: 1.6, marginBottom: 20 }}>Join the premium cohort for Electronics & Communication Engineering. Comprehensive tests, notes and community.</div>
            <div style={{ fontSize: 14, color: BE.accent, fontWeight: 700, cursor: 'pointer' }}>Learn More →</div>
          </div>
        </div> */}
      </div>

      {/* Snapshot strip (desktop/mobile shared but optimized) */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 py-3 border-t mb-4 text-[12.5px]" style={{ borderColor: BE.line }}>
        <div style={{ color: BE.text }}><span style={{ color: BE.textMute }}>Solved </span><span style={{ fontWeight: 600, fontFamily: BE.mono }}>{totalSolved} / {totalPossible}</span></div>
        <div style={{ color: BE.text }}><span style={{ color: BE.textMute }}>Accuracy </span><span style={{ fontWeight: 600, color: BE.good, fontFamily: BE.mono }}>{accuracy}%</span></div>
        <div className="hidden sm:block" style={{ color: BE.text }}><span style={{ color: BE.textMute }}>Subtopics </span><span style={{ fontWeight: 600, fontFamily: BE.mono }}>{patterns.length}</span></div>
        <div className="flex-1" />
        <div 
          onClick={() => setSortMode(prev => prev === "default" ? "practiced" : "default")}
          style={{ color: BE.accent, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {isPending && <Loader2 size={14} className="animate-spin text-amber-500" />}
          Sort: {sortMode === "practiced" ? "Most practiced ↓" : "Default"}
        </div>
      </div>

      {/* MOBILE ONLY: Inline ad card */}
      {/* <div className="md:hidden mb-6">
        <div style={{ fontSize: 10, color: BE.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>Sponsored</div>
        <div style={{ border: `1px solid ${BE.line}`, borderRadius: 16, padding: 16, display: 'flex', gap: 14, alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BE.mono, fontSize: 12, color: BE.textMute, fontWeight: 700 }}>GW</div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 700, color: BE.text }}>GATE 2026 Mock Series</div>
            <div style={{ fontSize: 11.5, color: BE.textDim }}>30 tests · ranked leaderboard</div>
          </div>
          <div style={{ fontSize: 12, color: BE.accent, fontWeight: 700 }}>Open →</div>
        </div>
      </div> */}

      {/* Subtopic list */}
      <div style={{ borderTop: `1px solid ${BE.line}` }}>
        {isLoading ? (
           <div className="py-12 text-center text-sm text-gray-400">Loading subtopics...</div>
        ) : sortedPatterns.filter((p: any) => localSubject === "All" || !p.isSubjectLevel).length > 0 ? (
          sortedPatterns.filter((p: any) => localSubject === "All" || !p.isSubjectLevel).map((pattern: any) => {
            // Subject-level rows on the "All" view act as navigation (drill into subject).
            const isNavRow = pattern.isSubjectLevel && localSubject === "All";
            return (
              <PatternRow
                key={pattern.id}
                pattern={pattern}
                isHighlighted={pattern.id === urlPatternId}
                isOpen={openPatternId === pattern.id}
                onToggle={() => isNavRow ? handleFilterClick(pattern.topic_name) : handleTopicToggle(pattern.id)}
                directQuestionId={pattern.id === urlPatternId ? urlQuestionId ?? undefined : undefined}
              />
            );
          })
        ) : (
          <div className="py-20 text-center">
            <p style={{ color: BE.textMute, fontSize: 14 }}>No topics in this subject yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
