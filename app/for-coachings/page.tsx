import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import ApplyForm from "@/components/coaching/ApplyForm";

export const metadata = {
  title: "For Coachings — Run online tests for your students | BattleExam",
  description:
    "Bring your coaching online with BattleExam: build tests from a huge question bank, assign them to your batches, and track every student's performance. Apply for access.",
};

const BENEFITS = [
  "Build tests from PYQs, generated questions, or your own uploads",
  "Assign to batches and track every student's score & analysis",
  "Auto-graded MCQ/NAT plus photo-based subjective grading",
  "Your own branded student portal at /c/your-coaching",
];

export default function ForCoachingsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] px-6 py-16">
      <div className="mx-auto grid max-w-5xl items-start gap-12 lg:grid-cols-2">
        {/* Pitch */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-xs font-bold tracking-wide text-amber-400">For Coaching Institutes</span>
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-[var(--text-primary)] md:text-5xl">
            Run your coaching&apos;s
            <br />
            tests online.
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
            Give your students a serious test platform — your question bank, your batches, your
            branding. We review each coaching personally before activation.
          </p>

          <ul className="mt-8 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                {b}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-[var(--text-muted)]">
            Already approved?{" "}
            <Link href="/coaching-admin/login" className="font-semibold text-amber-400 hover:underline">
              Sign in here
            </Link>
            .
          </p>
        </div>

        {/* Application form */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Apply for access</h2>
          <ApplyForm />
        </div>
      </div>
    </main>
  );
}
