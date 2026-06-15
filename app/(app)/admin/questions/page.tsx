import { redirect } from "next/navigation";
import { getCoachingActor } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import AdminQuestionsClient from "@/components/coaching/AdminQuestionsClient";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) redirect("/");

  const [questions, coachings, subjectRows, setRows, gradeRows] = await Promise.all([
    prisma.coachingQuestion.findMany({
      select: {
        id: true,
        question_text: true,
        question_type: true,
        subject: true,
        topic: true,
        difficulty: true,
        max_marks: true,
        coaching_id: true,
        coaching: { select: { id: true, name: true } },
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 500,
    }),
    prisma.coaching.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.coachingQuestion.findMany({
      where: { subject: { not: null } },
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    }),
    prisma.coachingQuestion.findMany({
      where: { set_name: { not: null } },
      select: { set_name: true },
      distinct: ["set_name"],
      orderBy: { set_name: "asc" },
    }),
    prisma.coachingQuestion.findMany({
      where: { grade: { not: null } },
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" },
    }),
  ]);

  return (
    <AdminQuestionsClient
      initialQuestions={questions.map((q) => ({
        ...q,
        created_at: q.created_at.toISOString(),
      }))}
      coachings={coachings}
      subjects={subjectRows.map((s) => s.subject!).filter(Boolean)}
      sets={setRows.map((s) => s.set_name!).filter(Boolean)}
      grades={gradeRows.map((g) => g.grade!).filter(Boolean)}
    />
  );
}
