import { prisma } from "../lib/prisma";

async function main() {
  console.log("\n=== MockTestTemplate durations grouped by exam_type ===");
  const rows = await prisma.mockTestTemplate.findMany({
    select: { id: true, title: true, exam_type: true, branch: true, duration_secs: true, total_questions: true },
    orderBy: [{ exam_type: "asc" }, { duration_secs: "asc" }],
  });
  const groups = new Map<string, { count: number; durations: Set<number>; total_q: Set<number> }>();
  for (const r of rows) {
    const key = `${r.exam_type} / ${r.branch ?? "—"}`;
    const g = groups.get(key) ?? { count: 0, durations: new Set(), total_q: new Set() };
    g.count++;
    g.durations.add(r.duration_secs);
    g.total_q.add(r.total_questions);
    groups.set(key, g);
  }
  console.table([...groups.entries()].map(([k, v]) => ({
    "exam_type / branch": k,
    mock_count: v.count,
    distinct_durations_hrs: [...v.durations].map(s => (s / 3600).toFixed(2)).join(", "),
    distinct_durations_secs: [...v.durations].join(", "),
    total_q: [...v.total_q].join(", "),
  })));

  console.log("\n=== JEE Main mocks specifically (full list) ===");
  const jee = await prisma.mockTestTemplate.findMany({
    where: { exam_type: { in: ["JEE_MAIN", "JEE Main"] } },
    select: { id: true, title: true, exam_type: true, duration_secs: true, total_questions: true, mode: true },
    orderBy: { mock_number: "asc" },
  });
  console.table(jee.map(m => ({
    title: m.title,
    exam_type: m.exam_type,
    duration: `${(m.duration_secs / 3600).toFixed(2)}h (${m.duration_secs}s)`,
    total_q: m.total_questions,
    mode: m.mode,
  })));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
