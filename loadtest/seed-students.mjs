// Seed N load-test students into a coaching, each with a distinct phone and a
// known PIN, so k6 can log in as 500 different students (the login rate limit is
// per (coaching, phone) — see lib/studentLoginRateLimit — so they MUST differ).
//
// PIN hashing mirrors lib/studentAuth.hashPin exactly: scrypt(pin, salt, 32),
// stored as `${saltHex}:${derivedHex}`. verifyPin will accept these.
//
// Run against a NON-PROD database (a Neon dev branch). Example:
//   node --env-file=.env.local loadtest/seed-students.mjs --slug=demo --count=500
//
// Cleanup later:
//   node --env-file=.env.local loadtest/seed-students.mjs --slug=demo --clean
//
// The phones it creates are 9000000000 + i (i = 0..count-1); PIN is 1234.
// k6 derives the SAME phones from __VU, so no CSV hand-off is needed.

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

// Mirror lib/prisma.ts: pick the DB transport from DB_DRIVER so this seeder
// works both against the Neon dev branch (default "neon-http") AND against the
// self-hosted VPS's local Postgres ("standard" plain-TCP client). The Neon HTTP
// adapter cannot speak to a vanilla localhost Postgres, so on the VPS you MUST
// run this with DB_DRIVER=standard (its .env already sets that).
const DB_DRIVER = process.env.DB_DRIVER ?? "neon-http";
const makePrisma = () =>
  DB_DRIVER === "standard"
    ? new PrismaClient()
    : new PrismaClient({ adapter: new PrismaNeonHTTP(process.env.DATABASE_URL, {}) });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const SLUG = args.slug;
const COUNT = Number(args.count ?? 500);
const PHONE_BASE = Number(args.phoneBase ?? 9000000000);
const PIN = String(args.pin ?? "1234");
const CLEAN = Boolean(args.clean);

if (!SLUG) {
  console.error("Missing --slug=<coaching-slug>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run with: node --env-file=.env.local ...");
  process.exit(1);
}

// Safety rail: refuse to seed if the DB host looks like prod. Adjust the guard
// to your prod host if needed, or pass --force to override.
if (!args.force && /prod|main/i.test(process.env.DATABASE_URL) && !/dev|staging|test/i.test(process.env.DATABASE_URL)) {
  console.error(
    "DATABASE_URL may point at prod (contains 'prod'/'main'). Re-run with --force if you are sure."
  );
  process.exit(1);
}

const prisma = makePrisma();

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

const phoneFor = (i) => String(PHONE_BASE + i);

// Neon's HTTP endpoint drops intermittently under a burst (esp. cross-region to
// Singapore). Retry with backoff instead of aborting the whole seed.
async function withRetry(fn, label, tries = 5) {
  let delay = 1000;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= tries) throw e;
      process.stdout.write(`\n  retry ${attempt}/${tries - 1} (${label}): ${e.code ?? e.message}\n`);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 8000);
    }
  }
}

async function main() {
  const coaching = await prisma.coaching.findUnique({
    where: { slug: SLUG },
    select: { id: true, name: true },
  });
  if (!coaching) {
    console.error(`No coaching with slug "${SLUG}".`);
    process.exit(1);
  }

  if (CLEAN) {
    const phones = Array.from({ length: COUNT }, (_, i) => phoneFor(i));
    // Attempts first (FK), then the students.
    const students = await prisma.student.findMany({
      where: { coaching_id: coaching.id, phone: { in: phones } },
      select: { id: true },
    });
    const ids = students.map((s) => s.id);
    if (ids.length) {
      await prisma.testAttempt.deleteMany({ where: { student_id: { in: ids } } });
      await prisma.student.deleteMany({ where: { id: { in: ids } } });
    }
    console.log(`Cleaned ${ids.length} load-test students from "${coaching.name}".`);
    return;
  }

  console.log(`Seeding ${COUNT} students into "${coaching.name}" (${SLUG})…`);
  let created = 0;
  // Small chunks keep the HTTP adapter from flooding Neon (which triggers the
  // connect timeouts cross-region); each upsert is retried on a transient drop.
  const CHUNK = 10;
  for (let start = 0; start < COUNT; start += CHUNK) {
    const slice = Array.from(
      { length: Math.min(CHUNK, COUNT - start) },
      (_, j) => start + j
    );
    await Promise.all(
      slice.map(async (i) => {
        const phone = phoneFor(i);
        await withRetry(
          () =>
            prisma.student.upsert({
              where: { coaching_id_phone: { coaching_id: coaching.id, phone } },
              create: {
                coaching_id: coaching.id,
                name: `LoadTest ${i}`,
                phone,
                active: true,
                pin_hash: hashPin(PIN),
              },
              update: { active: true, pin_hash: hashPin(PIN) },
            }),
          `student ${i}`
        );
        created++;
      })
    );
    process.stdout.write(`\r  ${created}/${COUNT}`);
  }
  console.log(
    `\nDone. Phones ${phoneFor(0)}–${phoneFor(COUNT - 1)}, PIN ${PIN}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
