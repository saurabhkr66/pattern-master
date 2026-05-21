import { BE } from "@/lib/theme";

export function SuggestedSkeleton() {
  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 24, marginBottom: 24, background: BE.surface }}>
      <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 12, width: "25%" }} className="animate-pulse" />
      <div style={{ height: 20, borderRadius: 4, background: BE.lineSoft, marginBottom: 10, width: "55%" }} className="animate-pulse" />
      <div style={{ height: 13, borderRadius: 4, background: BE.lineSoft, marginBottom: 6, width: "90%" }} className="animate-pulse" />
      <div style={{ height: 13, borderRadius: 4, background: BE.lineSoft, marginBottom: 20, width: "70%" }} className="animate-pulse" />
      <div style={{ height: 34, borderRadius: 10, background: BE.lineSoft, width: 160 }} className="animate-pulse" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: BE.line, border: `1px solid ${BE.line}`, borderRadius: 12, marginBottom: 24, overflow: "hidden" }} className="db-stats">
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ padding: "18px 20px", background: BE.surface }} className="db-stat-cell">
          <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 10, width: "55%" }} className="animate-pulse" />
          <div style={{ height: 24, borderRadius: 4, background: BE.lineSoft, marginBottom: 8, width: "40%" }} className="animate-pulse" />
          <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, width: "65%" }} className="animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 20, marginBottom: 24, background: BE.surface }}>
      <div style={{ height: 14, borderRadius: 4, background: BE.lineSoft, marginBottom: 6, width: "22%" }} className="animate-pulse" />
      <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 18, width: "45%" }} className="animate-pulse" />
      <div style={{ height: 88, borderRadius: 6, background: BE.lineSoft }} className="animate-pulse" />
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ height: 14, borderRadius: 4, background: BE.lineSoft, marginBottom: 12, width: "28%" }} className="animate-pulse" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }} className="db-review-grid">
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface }}>
            <div style={{ height: 13, borderRadius: 4, background: BE.lineSoft, marginBottom: 8, width: "55%" }} className="animate-pulse" />
            <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 14, width: "38%" }} className="animate-pulse" />
            <div style={{ height: 40, borderRadius: 4, background: BE.lineSoft }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div>
      <div style={{ height: 14, borderRadius: 4, background: BE.lineSoft, marginBottom: 10, width: "22%" }} className="animate-pulse" />
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, overflow: "hidden", background: BE.surface }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderBottom: i === 4 ? "none" : `1px solid ${BE.line}` }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: BE.lineSoft, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 13, borderRadius: 4, background: BE.lineSoft }} className="animate-pulse" />
            <div style={{ height: 11, width: 56, borderRadius: 4, background: BE.lineSoft }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
