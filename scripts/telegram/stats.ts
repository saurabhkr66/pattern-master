// scripts/telegram/stats.ts
//
// Prints, per exam, how many poll-ready (4-option, single-letter answer) PYQs
// exist — so you know which exams to give a Topic and which are too thin.
//
// Usage: npx tsx --env-file=.env scripts/telegram/stats.ts

import { prisma } from "@/lib/prisma";

const LETTERS = new Set(["A", "B", "C", "D"]);

async function main() {
  const rows = await prisma.pYQ.findMany({
    where: { question_type: "MCQ" },
    select: {
      correct_answer: true,
      options: true,
      pattern: { select: { exam_slug: true, branch_slug: true } },
    },
  });

  // Key by exam_slug + branch_slug so branched exams (GATE) split per branch.
  const counts = new Map<string, { exam: string; branch: string; total: number; pollReady: number }>();
  for (const r of rows) {
    const exam = r.pattern?.exam_slug ?? "(none)";
    const branch = r.pattern?.branch_slug ?? "";
    const key = `${exam}|${branch}`;
    const c = counts.get(key) ?? { exam, branch, total: 0, pollReady: 0 };
    c.total++;
    const letter = String(r.correct_answer ?? "").trim().toUpperCase();
    const opts = Array.isArray(r.options) ? r.options.filter((o) => String(o).trim()) : [];
    if (LETTERS.has(letter) && opts.length === 4) c.pollReady++;
    counts.set(key, c);
  }

  const sorted = [...counts.values()].sort(
    (a, b) => a.exam.localeCompare(b.exam) || b.pollReady - a.pollReady,
  );
  console.log("\nexamSlug          branchSlug        poll-ready / total MCQs");
  console.log("─".repeat(64));
  for (const c of sorted) {
    const branch = c.branch && c.branch !== "common" ? c.branch : "—";
    console.log(
      `${c.exam.padEnd(18)}${branch.padEnd(18)}${String(c.pollReady).padStart(6)} / ${c.total}`,
    );
  }
  console.log(
    "\nGive a Topic to each exam/branch with a healthy 'poll-ready' count.\n" +
      "Put examSlug (+ branchSlug for GATE) into scripts/telegram/config.ts.",
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
