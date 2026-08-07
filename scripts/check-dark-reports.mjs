// Pre-deploy check for the "Dark Image" report category: does the worklist load,
// and do its rows actually resolve to questions in THIS database?
//
// The worklist records question IDs, so it is only valid against the DB the
// audit ran on — point this at the same one.
//
// Usage (VPS, via the SSH tunnel):
//   DB_DRIVER=standard node --env-file=.env scripts/check-dark-reports.mjs
//
// Read-only.

import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n✖ DATABASE_URL not set. Run with: node --env-file=.env ...\n");
  process.exit(1);
}

const driver = process.env.DB_DRIVER ?? "neon-http";
const prisma = driver === "standard"
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}) });

const LIMIT = 60; // must match loadDarkImageWorklist's default

let data;
try {
  data = JSON.parse(readFileSync(path.join("data", "dark-images.json"), "utf8"));
} catch (e) {
  console.error(`\n✖ data/dark-images.json unreadable: ${e.message}`);
  console.error("  Run scripts/audit-dark-images.mjs first.\n");
  process.exit(1);
}

const all = (data.images ?? []).filter((e) => e?.ref && Array.isArray(e.rows));
const entries = all.sort((a, b) => b.ratio - a.ratio).slice(0, LIMIT);

console.log(`\nworklist: ${all.length} flagged, using worst ${entries.length} (generated ${data.generatedAt ?? "?"})`);
console.log(`DB_DRIVER=${driver}\n`);

const pyqIds = [...new Set(entries.flatMap((e) => e.rows.filter((r) => r.model === "pYQ").map((r) => r.id)))];
const genIds = [...new Set(entries.flatMap((e) => e.rows.filter((r) => r.model === "generatedQuestion").map((r) => r.id)))];
const needles = entries.map((e) => JSON.stringify([{ filename: e.ref }]));

const pyqs = pyqIds.length
  ? await prisma.pYQ.findMany({ where: { id: { in: pyqIds } }, select: { id: true } })
  : [];
const gens = genIds.length
  ? await prisma.generatedQuestion.findMany({ where: { id: { in: genIds } }, select: { id: true } })
  : [];

let mocks = [];
try {
  mocks = await prisma.$queryRaw`
    SELECT t.id AS template_id, elem->>'id' AS question_id
    FROM "MockTestTemplate" t, jsonb_array_elements(t.questions) AS elem
    WHERE EXISTS (
      SELECT 1 FROM unnest(${needles}::jsonb[]) AS n(needle)
      WHERE COALESCE(elem->'images', '[]'::jsonb) @> n.needle
    ) LIMIT 100`;
} catch (e) {
  console.error(`✖ mock query FAILED — this would break /admin/reports:\n  ${e.message}\n`);
}

const report = (label, found, expected) => {
  const ok = found > 0 || expected === 0;
  console.log(`${ok ? "✓" : "✖"} ${label.padEnd(22)} ${found}/${expected} resolved`);
};

report("PYQ", pyqs.length, pyqIds.length);
report("GeneratedQuestion", gens.length, genIds.length);
report("Mock questions", mocks.length, "≤100");

const total = pyqs.length + gens.length + mocks.length;
console.log(`\n→ /admin/reports should show ~${total} "Dark Image" rows.`);
if (total === 0) {
  console.log("\n  0 means the worklist was built against a DIFFERENT database than this one.");
  console.log("  Re-run scripts/audit-dark-images.mjs against the DB the app reads.\n");
}

await prisma.$disconnect();
