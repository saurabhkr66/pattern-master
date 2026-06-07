// Open a coaching test's submission window for load testing: sets status=active,
// start_at to just-past, end_at to now + N hours. The test page gates on these
// (a closed window renders a shell and creates no attempt).
//   node --env-file=.env.local loadtest/open-window.mjs --testId=<id> --hours=6
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const TEST_ID = args.testId;
const HOURS = Number(args.hours ?? 6);
if (!TEST_ID) {
  console.error("Missing --testId=<id>");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaNeonHTTP(process.env.DATABASE_URL, {}),
});

const now = Date.now();
const updated = await prisma.coachingTest.update({
  where: { id: TEST_ID },
  data: {
    status: "active",
    start_at: new Date(now - 60_000),
    end_at: new Date(now + HOURS * 3600_000),
  },
  select: { id: true, title: true, start_at: true, end_at: true },
});
console.log(
  `Opened "${updated.title}" — window ${updated.start_at.toISOString()} → ${updated.end_at.toISOString()}`
);
console.log(
  "Note: the test page re-primes the cached config on render, so the new end_at takes effect on first open."
);

await prisma.$disconnect();
