import Link from "next/link";

interface Props {
  topicLabel: string;
  practiceHref: string;
}

export default function PracticeModePromo({ topicLabel, practiceHref }: Props) {
  return (
    <section
      className="mb-10 p-6 rounded-2xl border relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))",
        borderColor: "var(--accent)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <p
            className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: "var(--accent)" }}
          >
            🎯 These are sample questions
          </p>
          <h2
            className="text-lg md:text-xl font-black mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Get the full {topicLabel} experience — 100% free
          </h2>
          <ul
            className="text-sm leading-relaxed mb-4 grid sm:grid-cols-2 gap-x-4 gap-y-1"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>✓ Attempt tracking &amp; analytics</li>
            <li>✓ Timer &amp; exam-mode simulation</li>
            <li>✓ Adaptive difficulty (Easy → Hard)</li>
            <li>✓ Bookmarks, notes &amp; mistake review</li>
          </ul>
          <p
            className="text-xs mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Just sign in to unlock everything. Free for all students.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href={practiceHref}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              🚀 Start Practice Mode
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold border transition-colors"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                background: "transparent",
              }}
            >
              Sign in free →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
