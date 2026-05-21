const STATS = [
  { value: "50+", label: "GATE Topics" },
  { value: "6", label: "Exams Covered" },
  { value: "∞", label: "Unique Questions" },
  { value: "0 ₹", label: "Core Practice" },
];

export default function StatsSection() {
  return (
    <div
      className="px-6 py-8 border-y"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4">
        {STATS.map((s, i, arr) => (
          <div
            key={s.label}
            className="px-5 py-4"
            style={{
              borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "clamp(28px, 5vw, 40px)",
                fontWeight: 600,
                letterSpacing: "-0.8px",
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
