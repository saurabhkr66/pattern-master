const STEPS = [
  {
    n: "01",
    title: "Answer",
    body: "Generated questions at your level. Each tagged to a pattern — not just a topic.",
  },
  {
    n: "02",
    title: "Understand",
    body: "Instant explanation, reasoning steps, and links to the short-note for the pattern.",
  },
  {
    n: "03",
    title: "Fix the pattern",
    body: "Next session focuses on the patterns you're weakest on. Drill until mastered.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      className="px-6 py-20 border-t"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface-2)" }}
    >
      <div className="max-w-5xl mx-auto">
        <p
          className="text-center text-[11px] font-bold uppercase tracking-widest mb-2.5"
          style={{ color: "var(--text-muted)" }}
        >
          How it works
        </p>
        <h2
          className="text-center mb-10 mx-auto"
          style={{
            fontFamily: "var(--be-font-serif, Georgia, serif)",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 600,
            letterSpacing: "-0.6px",
            lineHeight: 1.2,
            color: "var(--text-primary)",
            maxWidth: 600,
          }}
        >
          A feedback loop that gets sharper every session.
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="p-6 rounded-2xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--bg-surface)",
              }}
            >
              <div
                className="mb-2.5"
                style={{
                  fontFamily: "var(--be-font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--be-purple-500)",
                }}
              >
                {s.n}
              </div>
              <h3
                className="mb-2"
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  color: "var(--text-secondary)",
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
