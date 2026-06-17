import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import TestWizard from "@/components/coaching/TestWizard";

export const dynamic = "force-dynamic";

export default async function NewTestPage() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">New Test</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  // mcq/nat for everyone; subjective (photo answers, AI-graded) is opt-in — only
  // surfaced when a super admin has enabled it for this coaching (or the actor is
  // a super admin). This keeps paid Gemini grading off for coachings that haven't
  // asked for it. The POST /api/coaching/tests route enforces the same rule.
  const coaching = await prisma.coaching.findUnique({
    where: { id: coachingId },
    select: { subjective_enabled: true },
  });
  const allowSubjective = !!actor?.isSuperAdmin || !!coaching?.subjective_enabled;
  const allowedTypes = allowSubjective ? ["mcq", "nat", "subjective"] : ["mcq", "nat"];
  const [questions, batches] = await Promise.all([
    prisma.coachingQuestion.findMany({
      where: { coaching_id: coachingId, question_type: { in: allowedTypes } },
      select: {
        id: true,
        question_text: true,
        question_type: true,
        grade: true,
        subject: true,
        topic: true,
        set_name: true,
        max_marks: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 1000,
    }),
    prisma.batch.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <TestWizard
      questions={questions.map((q) => ({ ...q, created_at: q.created_at.toISOString() }))}
      batches={batches}
      isSuperAdmin={!!actor?.isSuperAdmin}
    />
  );
}
