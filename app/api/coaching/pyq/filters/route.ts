import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// Cascading filter options for the PYQ picker, driven by what's already chosen.
// Only patterns that actually have PYQs are considered. Auth: coaching admin
// (PYQ data itself is shared, not tenant-scoped).
export const GET = withCoachingContext(async (req) => {
  const exam = req.nextUrl.searchParams.get("exam")?.trim() || null;
  const branch = req.nextUrl.searchParams.get("branch")?.trim() || null;
  const subject = req.nextUrl.searchParams.get("subject")?.trim() || null;

  const hasPyqs = { pyqs: { some: {} } };

  const examRows = await prisma.pattern.findMany({
    where: hasPyqs,
    select: { exam_type: true },
    distinct: ["exam_type"],
    orderBy: { exam_type: "asc" },
  });
  const exams = examRows.map((r) => r.exam_type);

  let branches: string[] = [];
  let subjects: string[] = [];
  let topics: string[] = [];

  if (exam) {
    const rows = await prisma.pattern.findMany({
      where: { exam_type: exam, ...hasPyqs },
      select: { branch: true },
      distinct: ["branch"],
      orderBy: { branch: "asc" },
    });
    branches = rows.map((r) => r.branch);
  }

  if (exam && branch) {
    const rows = await prisma.pattern.findMany({
      where: { exam_type: exam, branch, ...hasPyqs },
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    });
    subjects = rows.map((r) => r.subject);
  }

  if (exam && branch && subject) {
    const rows = await prisma.pattern.findMany({
      where: { exam_type: exam, branch, subject, ...hasPyqs },
      select: { topic_name: true },
      distinct: ["topic_name"],
      orderBy: { topic_name: "asc" },
    });
    topics = rows.map((r) => r.topic_name);
  }

  return NextResponse.json({ exams, branches, subjects, topics });
});
