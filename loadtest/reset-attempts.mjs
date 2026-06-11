// Reset load-test attempts so a run starts fresh. Once a student submits, the
// test page redirects them to results on re-open — so before re-running k6 you
// must clear the load-test students' attempts for the target test.
//
// Deletes TestAttempts belonging to the seeded load-test students (phones in the
// PHONE_BASE..PHONE_BASE+COUNT range) for one test (or all of a coaching's).
//   node --env-file=.env.local loadtest/reset-attempts.mjs --slug=saurav-coaching-classes --testId=<id>
//   node --env-file=.env.local loadtest/reset-attempts.mjs --slug=saurav-coaching-classes --all
//
// Also clears Redis cache markers so finalize/leaderboard don't serve stale state.
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const SLUG = args.slug;
const TEST_ID = args.testId;
const ALL = Boolean(args.all);
const PHONE_BASE = Number(args.phoneBase ?? 9000000000);
const COUNT = Number(args.count ?? 500);
if (!SLUG || (!TEST_ID && !ALL)) {
  console.error("Usage: --slug=<slug> (--testId=<id> | --all)");
  process.exit(1);
}

// Mirror lib/prisma.ts: standard TCP client on the VPS (DB_DRIVER=standard,
// local Postgres), Neon HTTP adapter otherwise. Run on the VPS with
// DB_DRIVER=standard — the Neon adapter can't reach a localhost Postgres.
const prisma =
  (process.env.DB_DRIVER ?? "neon-http") === "standard"
    ? new PrismaClient()
    : new PrismaClient({ adapter: new PrismaNeonHTTP(process.env.DATABASE_URL, {}) });

const coaching = await prisma.coaching.findUnique({
  where: { slug: SLUG },
  select: { id: true },
});
if (!coaching) {
  console.error(`No coaching with slug "${SLUG}".`);
  process.exit(1);
}

const phones = Array.from({ length: COUNT }, (_, i) => String(PHONE_BASE + i));
const students = await prisma.student.findMany({
  where: { coaching_id: coaching.id, phone: { in: phones } },
  select: { id: true },
});
const ids = students.map((s) => s.id);

const where = {
  student_id: { in: ids },
  coaching_id: coaching.id,
  ...(ALL ? {} : { test_id: TEST_ID }),
};
const res = await prisma.testAttempt.deleteMany({ where });
console.log(
  `Deleted ${res.count} attempt(s) for ${ids.length} load-test students` +
    (ALL ? " (all tests)." : ` on test ${TEST_ID}.`)
);

await prisma.$disconnect();
