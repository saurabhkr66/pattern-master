// Quick read-only probe: confirm we're on the intended branch and list the
// coaching slugs + their ACTIVE tests (with ids) so you know what to pass to k6.
//   node --env-file=.env.local loadtest/discover.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const prisma = new PrismaClient({
  adapter: new PrismaNeonHTTP(process.env.DATABASE_URL, {}),
});

const host = (process.env.DATABASE_URL || "").match(/@([^/]+)/)?.[1] ?? "?";
console.log(`DB host: ${host}\n`);

const coachings = await prisma.coaching.findMany({
  select: {
    slug: true,
    name: true,
    active: true,
    _count: { select: { students: true } },
    tests: {
      where: { status: "active" },
      select: {
        id: true,
        title: true,
        start_at: true,
        end_at: true,
        questions: true,
      },
    },
  },
});

if (!coachings.length) console.log("No coachings on this branch.");
for (const c of coachings) {
  console.log(`• ${c.slug}  "${c.name}"  active=${c.active}  students=${c._count.students}`);
  if (!c.tests.length) console.log("    (no active tests)");
  for (const t of c.tests) {
    const now = Date.now();
    const open =
      (!t.start_at || new Date(t.start_at).getTime() <= now) &&
      (!t.end_at || new Date(t.end_at).getTime() >= now);
    const qn = Array.isArray(t.questions) ? t.questions.length : 0;
    console.log(
      `    TEST_ID=${t.id}  "${t.title}"  window=${open ? "OPEN" : "CLOSED"}  questions=${qn}` +
        `  start=${t.start_at?.toISOString() ?? "—"}  end=${t.end_at?.toISOString() ?? "—"}`
    );
  }
}

await prisma.$disconnect();
