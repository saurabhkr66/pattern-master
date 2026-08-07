/**
 * Split a flat prepp-gate JEE paper into one file per subject.
 *
 * The scraper emits a JEE paper as a single 75-question array, ordered in three
 * contiguous 25-question blocks — one per subject. The block ORDER varies by
 * sitting (Sep 2020 papers run Chemistry→Mathematics→Physics; Jan 2020 papers
 * run Physics→Chemistry→Mathematics), so it is detected per file rather than
 * assumed.
 *
 * Why split at all: the scraper puts the SUBJECT in `topic_name` and emits no
 * `subject` field, and scripts/json-topics.ts overwrites `topic_name` with the
 * real topic — so nothing downstream can tell a Physics question from a Maths
 * one. Splitting recovers it from position, which also CORRECTS the handful of
 * questions Gemini tagged with another subject's topic. One file per subject is
 * also the shape prisma/seed_mock_from_json.ts already consumes for NEET
 * (`sections: [{name, file}, …]`), so no seeder changes are needed.
 *
 * Detection is a majority vote over each block's tagged topics, mapped back to
 * Pattern.subject. A block that isn't a clear majority is reported, not guessed.
 *
 * Questions whose topic disagrees with their block's subject get `topic_name`
 * reset to the subject name, which is exactly what json-topics.ts treats as
 * "needs tagging" — so re-running it re-tags them against the right topic list.
 *
 * Usage:
 *   npx tsx scripts/split-jee-paper.ts --dry
 *   npx tsx scripts/split-jee-paper.ts
 *   npx tsx scripts/split-jee-paper.ts --in scrapers/prepp-gate/output --out scrapers/prepp-gate/output/jee-split
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// Section names MUST match lib/examConfigs.ts JEE_MAIN sections exactly, or the
// test engine renders questions under the wrong tab.
const SUBJECTS = ["Physics", "Chemistry", "Mathematics"] as const;
type Subject = (typeof SUBJECTS)[number];
const FILE_SUFFIX: Record<Subject, string> = {
  Physics: "physics",
  Chemistry: "chemistry",
  Mathematics: "mathematics",
};

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
  };
  const inDir = path.resolve(arg("--in", "scrapers/prepp-gate/output"));
  const outDir = path.resolve(arg("--out", "scrapers/prepp-gate/output/jee-split"));
  const exam = arg("--exam", "JEE_MAIN");
  const isDry = args.includes("--dry");

  const patterns = await prisma.pattern.findMany({
    where: { exam_type: exam },
    select: { topic_name: true, subject: true },
  });
  const topicSubject = new Map<string, string>();
  const seenTwice = new Set<string>();
  for (const p of patterns) {
    const prev = topicSubject.get(p.topic_name);
    if (prev && prev !== (p.subject || "")) seenTwice.add(p.topic_name);
    topicSubject.set(p.topic_name, p.subject || "");
  }
  console.log(`${exam} patterns: ${patterns.length}${seenTwice.size ? ` (${seenTwice.size} ambiguous, ignored in voting)` : ""}`);

  // Vote: which subject do this block's topics point at?
  const voteSubject = (block: any[]): { subject: Subject | null; confidence: number } => {
    const tally: Record<string, number> = {};
    for (const q of block) {
      if (seenTwice.has(q.topic_name)) continue;
      const s = topicSubject.get(q.topic_name);
      if (s) tally[s] = (tally[s] || 0) + 1;
    }
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return { subject: null, confidence: 0 };
    const [name, n] = ranked[0];
    const total = ranked.reduce((s, [, v]) => s + v, 0);
    const match = SUBJECTS.find((s) => s === name || (s === "Mathematics" && name === "Maths"));
    return { subject: match ?? null, confidence: n / total };
  };

  const files = fs
    .readdirSync(inDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => e.name)
    .sort();

  if (!isDry) fs.mkdirSync(outDir, { recursive: true });

  let written = 0, retag = 0, problems = 0;

  for (const name of files) {
    const qs: any[] = JSON.parse(fs.readFileSync(path.join(inDir, name), "utf8"));
    if (!Array.isArray(qs) || !qs.length || !qs[0].question_text) {
      console.log(`  skip (not a flat question array): ${name}`);
      continue;
    }
    if (qs.length % 3 !== 0) {
      console.log(`  [!] ${name}: ${qs.length} questions — not divisible by 3, skipping`);
      problems++;
      continue;
    }

    const size = qs.length / 3;
    const blocks = [qs.slice(0, size), qs.slice(size, size * 2), qs.slice(size * 2)];
    const votes = blocks.map(voteSubject);

    const resolved = votes.map((v) => v.subject);
    const distinct = new Set(resolved.filter(Boolean));
    if (resolved.some((s) => !s) || distinct.size !== 3) {
      console.log(`  [!] ${name}: could not resolve 3 distinct subjects — got ${resolved.map((s) => s ?? "?").join(", ")}`);
      problems++;
      continue;
    }

    const order = votes
      .map((v, i) => `${resolved[i]}${v.confidence < 1 ? ` (${Math.round(v.confidence * 100)}%)` : ""}`)
      .join(" → ");
    const slug = name.replace(/\.json$/, "");
    let fileRetag = 0;

    for (let bi = 0; bi < 3; bi++) {
      const subject = resolved[bi]!;
      const block = blocks[bi].map((q) => {
        const tagged = topicSubject.get(q.topic_name);
        // Topic belongs to another subject (or is still a bare subject name) —
        // blank it back to the subject so json-topics.ts re-tags it correctly.
        const mismatched = !tagged || (tagged !== subject && !(subject === "Mathematics" && tagged === "Maths"));
        if (mismatched) fileRetag++;
        return { ...q, subject, topic_name: mismatched ? subject : q.topic_name };
      });
      const outPath = path.join(outDir, `${slug}_${FILE_SUFFIX[subject]}.json`);
      if (!isDry) fs.writeFileSync(outPath, JSON.stringify(block, null, 2), "utf-8");
      written++;
    }

    retag += fileRetag;
    console.log(`  ${slug.slice(0, 46).padEnd(48)} ${size}×3  ${order}${fileRetag ? `  [${fileRetag} to re-tag]` : ""}`);
  }

  console.log(
    isDry
      ? `\n[DRY RUN] Would write ${written} file(s) to ${outDir}; ${retag} question(s) flagged for re-tagging.`
      : `\nWrote ${written} file(s) to ${outDir}; ${retag} question(s) flagged for re-tagging.`
  );
  if (problems) console.log(`${problems} file(s) skipped — see [!] above.`);
  if (retag) console.log(`Next: npx tsx scripts/json-topics.ts --auto --dir ${path.relative(process.cwd(), outDir).replace(/\\/g, "/")} --exam ${exam}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
