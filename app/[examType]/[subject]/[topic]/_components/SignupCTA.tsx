import Link from "next/link";

export default function SignupCTA({ topicLabel }: { topicLabel: string }) {
  return (
    <div
      className="mt-12 p-6 rounded-2xl border text-center"
      style={{
        background: "var(--bg-surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <p
        className="font-bold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Want unlimited AI-generated {topicLabel} questions?
      </p>
      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        Sign up free and practice with adaptive difficulty — Easy, Medium,
        Hard. New questions every session.
      </p>
      <Link
        href="/sign-up"
        className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
      >
        Start practising for free →
      </Link>
    </div>
  );
}
