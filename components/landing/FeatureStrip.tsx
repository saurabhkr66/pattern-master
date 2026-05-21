export default function FeatureStrip() {
  return (
    <section className="px-6 pb-20">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[2fr_1fr] gap-4 items-stretch">
        {/* Left — Mistake log card */}
        <div
          className="rounded-2xl border p-7"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#8b5cf6" }}>
            Mistake log · Pattern analysis
          </p>
          <h3
            style={{
              fontFamily: "var(--be-font-serif, Georgia, serif)",
              fontSize: "clamp(20px, 3vw, 26px)",
              fontWeight: 600,
              letterSpacing: "-0.4px",
              color: "var(--text-primary)",
              margin: "0 0 8px",
            }}
          >
            See the gaps in your reasoning.
          </h3>
          <p className="text-[13.5px] leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
            We group wrong answers by the concept beneath them. 4 patterns account for 30 of 34 recent mistakes.
          </p>
          <div className="flex items-start gap-3 mt-5">
            <div
              className="shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center"
              style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}
            >
              <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>17</span>
              <span style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8, marginTop: 2 }}>wrong</span>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Secondary index B+ tree calculations</p>
              <p
                className="text-[13px] mt-1 italic"
                style={{ fontFamily: "var(--be-font-serif, Georgia, serif)", color: "var(--text-secondary)" }}
              >
                &ldquo;You miscount leaf-level capacity when fan-out exceeds key size.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Right — Ad-free solver card */}
        <div
          className="rounded-2xl p-7 flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ opacity: 0.85 }}>
              Solver focus mode
            </p>
            <h3
              style={{
                fontFamily: "var(--be-font-serif, Georgia, serif)",
                fontSize: "clamp(18px, 2.5vw, 24px)",
                fontWeight: 600,
                margin: "0 0 8px",
              }}
            >
              Ad-free while you&apos;re thinking.
            </h3>
            <p className="text-[13px] leading-relaxed" style={{ opacity: 0.85 }}>
              Ads keep BattleExam free — but they never appear on the solver or during flashcards. Ever.
            </p>
          </div>
          <p
            className="mt-8 text-[11px]"
            style={{ opacity: 0.75, fontFamily: "var(--font-geist-mono, monospace)" }}
          >
            Our contract with you.
          </p>
        </div>
      </div>
    </section>
  );
}
