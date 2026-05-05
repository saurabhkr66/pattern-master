"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, BookOpen, Layers } from "lucide-react";

interface SearchResult {
  subjects: { id: string; subject_name: string }[];
  topics: { id: string; topic_name: string; subject: string; exam_type: string; branch: string }[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ subjects: [], topics: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsCache = useRef<Record<string, SearchResult>>({});

  const exam = searchParams.get("exam") ?? undefined;
  const branch = searchParams.get("branch") ?? undefined;

  const allResults = [
    ...results.subjects.map((s) => ({ type: "subject" as const, id: s.id, label: s.subject_name, sub: "Subject" })),
    ...results.topics.map((t) => ({ type: "topic" as const, id: t.id, label: t.topic_name, sub: t.subject })),
  ];

  const doSearch = useCallback(
    (q: string) => {
      const cacheKey = `${q}_${exam || ""}_${branch || ""}`;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      if (q.length < 2) {
        setResults({ subjects: [], topics: [] });
        setIsLoading(false);
        return;
      }

      // 1. Check Cache for INSTANT results
      if (resultsCache.current[cacheKey]) {
        setResults(resultsCache.current[cacheKey]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams({ q });
          if (exam) params.set("exam", exam);
          if (branch) params.set("branch", branch);
          const res = await fetch(`/api/search?${params}`);
          const data = await res.json();
          
          // 2. Save to Cache
          resultsCache.current[cacheKey] = data;
          setResults(data);
        } catch {
          // ignore
        } finally {
          setIsLoading(false);
        }
      }, 200); // Faster debounce: 200ms
    },
    [exam, branch]
  );

  const open = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setResults({ subjects: [], topics: [] });
    setActiveIndex(-1);
  };

  const navigate = (item: (typeof allResults)[number]) => {
    close();
    if (item.type === "subject") {
      router.push(`/practice?subject=${encodeURIComponent(item.label)}`);
    } else {
      const topic = results.topics.find((t) => t.id === item.id);
      if (topic) {
        router.push(
          `/practice?subject=${encodeURIComponent(topic.subject)}&patternId=${topic.id}`
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { close(); return; }
    if (allResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % allResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + allResults.length) % allResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (allResults[idx]) navigate(allResults[idx]);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-container]")) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) close(); else open();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <>
      {/* Search icon button */}
      <button
        type="button"
        onClick={open}
        className="p-2.5 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Search topics (Ctrl+K)"
        title="Search topics (Ctrl+K)"
      >
        <Search size={18} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200]"
          style={{ background: "rgba(0,0,0,0.4)" }}
        >
          <div
            data-search-container
            className="absolute left-0 right-0 top-[60px] mx-auto max-w-2xl px-4"
          >
            {/* Input row */}
            <div
              className="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl"
              style={{ background: "var(--bg-base)", borderColor: "var(--border-strong)" }}
            >
              <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); setActiveIndex(-1); }}
                onKeyDown={handleKeyDown}
                placeholder="Search topics or subjects…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {isLoading && (
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                  style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }}
                />
              )}
              <button
                onClick={close}
                className="p-1 rounded hover:bg-white/10 shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Results dropdown */}
            {allResults.length > 0 && (
              <div
                className="mt-1 rounded-xl border shadow-2xl overflow-hidden"
                style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
              >
                {results.subjects.length > 0 && (
                  <div>
                    <div
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b"
                      style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
                    >
                      Subjects
                    </div>
                    {results.subjects.map((s, i) => {
                      const globalIdx = i;
                      return (
                        <button
                          key={s.id}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => navigate({ type: "subject", id: s.id, label: s.subject_name, sub: "Subject" })}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                          style={{
                            background: activeIndex === globalIdx ? "var(--bg-surface-2)" : "transparent",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Layers size={14} className="shrink-0" style={{ color: "#f97316" }} />
                          <span className="text-sm font-medium">{s.subject_name}</span>
                          <span
                            className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                          >
                            Subject
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {results.topics.length > 0 && (
                  <div>
                    <div
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b"
                      style={{
                        color: "var(--text-muted)",
                        borderColor: "var(--border)",
                        borderTop: results.subjects.length > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      Topics
                    </div>
                    {results.topics.map((t, i) => {
                      const globalIdx = results.subjects.length + i;
                      return (
                        <button
                          key={t.id}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => navigate({ type: "topic", id: t.id, label: t.topic_name, sub: t.subject })}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                          style={{
                            background: activeIndex === globalIdx ? "var(--bg-surface-2)" : "transparent",
                            color: "var(--text-primary)",
                          }}
                        >
                          <BookOpen size={14} className="shrink-0" style={{ color: "#6366f1" }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{t.topic_name}</div>
                            <div className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{t.subject}</div>
                          </div>
                          <span
                            className="ml-auto shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}
                          >
                            Topic
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No results */}
            {!isLoading && query.length >= 2 && allResults.length === 0 && (
              <div
                className="mt-1 rounded-xl border px-4 py-6 text-center text-sm shadow-2xl"
                style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
