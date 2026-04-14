export default function PracticeLoading() {
  return (
    <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 rounded-lg" style={{ background: "var(--bg-surface-2)" }} />
        <div className="h-4 w-72 mt-2 rounded-lg" style={{ background: "var(--bg-surface-2)" }} />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 rounded-lg shrink-0"
            style={{
              width: `${70 + Math.random() * 40}px`,
              background: "var(--bg-surface-2)",
            }}
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        {/* Header row */}
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}>
          <div className="h-3 w-20 rounded" style={{ background: "var(--border)" }} />
        </div>
        {/* Topic rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-9 h-9 rounded-xl" style={{ background: "var(--bg-surface-2)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded" style={{ width: `${40 + Math.random() * 30}%`, background: "var(--bg-surface-2)" }} />
              <div className="h-3 w-16 rounded" style={{ background: "var(--bg-surface-2)" }} />
            </div>
            <div className="h-4 w-12 rounded" style={{ background: "var(--bg-surface-2)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
