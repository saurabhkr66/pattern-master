import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { getCoachingTaxonomy } from "@/lib/coachingTaxonomy";
import QuestionsClient from "@/components/coaching/QuestionsClient";

export const dynamic = "force-dynamic";

// Matches QUESTIONS_PAGE_SIZE in the questions API route — the first page is
// server-rendered; the client pulls subsequent pages from that endpoint.
const PAGE_SIZE = 50;

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

  const [questions, taxonomy] = await Promise.all([
    // Fetch one extra row to know if a "Load more" page exists (no count query).
    // This first page feeds the flat search/type fallback view.
    prisma.coachingQuestion.findMany({
      where: { coaching_id: coachingId },
      select: {
        id: true,
        question_text: true,
        question_type: true,
        grade: true,
        subject: true,
        topic: true,
        set_name: true,
        difficulty: true,
        max_marks: true,
        correct_answer: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: PAGE_SIZE + 1,
    }),
    // Folder tree (grade → subject → set + counts) for the browse view.
    getCoachingTaxonomy(coachingId),
  ]);

  const hasMore = questions.length > PAGE_SIZE;
  const firstPage = hasMore ? questions.slice(0, PAGE_SIZE) : questions;

  return (
    <QuestionsClient
      initialQuestions={firstPage.map((q) => ({
        ...q,
        created_at: q.created_at.toISOString(),
      }))}
      initialHasMore={hasMore}
      taxonomy={taxonomy}
      isSuperAdmin={!!actor!.isSuperAdmin}
    />
  );
}
