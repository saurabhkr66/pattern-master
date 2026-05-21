import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ExamMeta = {
  exams: string[];
  branchesByExam: Record<string, string[]>;
};

export const getCachedExamMeta = unstable_cache(
  async (): Promise<ExamMeta> => {
    const rows = await prisma.pattern.findMany({
      select: { exam_type: true, branch: true },
      distinct: ["exam_type", "branch"],
    });

    const exams = [...new Set(rows.map((r) => r.exam_type))].sort();
    const branchesByExam: Record<string, string[]> = {};
    for (const row of rows) {
      if (!branchesByExam[row.exam_type]) branchesByExam[row.exam_type] = [];
      if (!branchesByExam[row.exam_type].includes(row.branch)) {
        branchesByExam[row.exam_type].push(row.branch);
      }
    }
    return { exams, branchesByExam };
  },
  ["exam-meta"],
  { revalidate: 3600, tags: ["patterns"] },
);
