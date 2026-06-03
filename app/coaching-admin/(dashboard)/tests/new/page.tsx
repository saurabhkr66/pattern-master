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

  // Only mcq/nat questions are eligible for the v1 test flow (subjective excluded).
  const questions = await prisma.coachingQuestion.findMany({
    where: { coaching_id: coachingId, question_type: { in: ["mcq", "nat"] } },
    select: {
      id: true,
      question_text: true,
      question_type: true,
      subject: true,
      max_marks: true,
    },
    orderBy: { created_at: "desc" },
    take: 1000,
  });

  return <TestWizard questions={questions} isSuperAdmin={!!actor?.isSuperAdmin} />;
}
