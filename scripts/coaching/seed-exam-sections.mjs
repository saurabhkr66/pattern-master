// Seed the GLOBAL exam -> section catalog (ExamSection rows with coaching_id = null).
//
// Usage:
//   node --env-file=.env.local scripts/coaching/seed-exam-sections.mjs
//   (use .env.local to target the dev Neon branch; .env points at prod)
//
// Reads data/exam-sections.json ({ exams: { "<exam>": ["Section", ...] } }) and
// makes the global catalog match it: for each exam it deletes the existing global
// rows and recreates them in order. Idempotent + re-runnable. Coaching-owned rows
// (coaching_id != null) are never touched. No transactions/upsert — the Neon HTTP
// adapter rejects both, so it's deleteMany + create() per row.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) fail("DATABASE_URL not set. Run with: node --env-file=.env.local ...");

// Follow DB_DRIVER like lib/prisma.ts: "standard" = plain TCP client (the
// self-hosted VPS + localhost Postgres), otherwise the Neon HTTP adapter.
// Without this the seed would always write to Neon, even when .env says the VPS.
const driver = process.env.DB_DRIVER ?? "neon-http";
const prisma = driver === "standard"
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}) });

async function main() {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync("data/exam-sections.json", "utf8"));
  } catch (e) {
    fail(`Could not read/parse data/exam-sections.json: ${e.message}`);
  }
  const exams = parsed?.exams ?? {};
  const examNames = Object.keys(exams);
  if (examNames.length === 0) fail("No exams found under `exams` in data/exam-sections.json.");

  console.log(`\nSeeding global section catalog for ${examNames.length} exam(s)…\n`);

  let created = 0;
  for (const exam of examNames) {
    const sections = Array.isArray(exams[exam]) ? exams[exam] : [];
    // Replace this exam's global rows so the catalog matches the JSON exactly.
    await prisma.examSection.deleteMany({ where: { coaching_id: null, exam } });
    for (let i = 0; i < sections.length; i++) {
      const name = String(sections[i]).trim();
      if (!name) continue;
      try {
        await prisma.examSection.create({
          data: { coaching_id: null, exam, name, sort_order: i },
        });
        created++;
      } catch (e) {
        console.log(`   - ${exam} / ${name}: ${e.message.split("\n")[0]}`);
      }
    }
    console.log(`  ✔ ${exam}: ${sections.length} section(s)`);
  }

  console.log(`\n✔ Created ${created} global section row(s).\n`);
}

main()
  .catch((e) => fail(e.message))
  .finally(() => process.exit(0));
