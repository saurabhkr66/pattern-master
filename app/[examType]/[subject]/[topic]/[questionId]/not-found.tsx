// app/[examType]/[subject]/[topic]/[questionId]/not-found.tsx
import Link from "next/link";

export default function QuestionNotFound() {
  return (
    <div className="max-w-xl mx-auto py-20 px-4 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
        Question not found
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        This question may have been removed or the URL is invalid.
      </p>
      <Link
        href="/practice"
        className="rounded-xl px-6 py-2.5 text-sm font-bold"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Back to Practice
      </Link>
    </div>
  );
}
