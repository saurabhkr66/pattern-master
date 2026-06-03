import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import QuestionsClient from "@/components/coaching/QuestionsClient";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Question Bank</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to manage its questions.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;

  const [questions, subjects] = await Promise.all([
    prisma.coachingQuestion.findMany({
      where: { coaching_id: coachingId },
      select: {
        id: true,
        question_text: true,
        question_type: true,
        subject: true,
        topic: true,
        difficulty: true,
        max_marks: true,
        correct_answer: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 500,
    }),
    prisma.coachingQuestion.findMany({
      where: { coaching_id: coachingId, subject: { not: null } },
      select: { subject: true },
      distinct: ["subject"],
    }),
  ]);

  return (
    <QuestionsClient
      initialQuestions={questions.map((q) => ({
        ...q,
        created_at: q.created_at.toISOString(),
      }))}
      subjects={subjects.map((s) => s.subject!).filter(Boolean)}
    />
  );
}
