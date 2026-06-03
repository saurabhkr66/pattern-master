// Bulk-insert questions into ONE coaching's question bank.
//
// Usage:
//   node --env-file=.env scripts/coaching/seed-coaching-questions.mjs <coaching-slug> <questions.json>
//
// Example:
//   node --env-file=.env scripts/coaching/seed-coaching-questions.mjs saurav-coaching-classes scripts/coaching/sample-questions.json
//
// Input is a JSON array of question objects (see sample-questions.json). Each is
// validated with the same rules as the admin "Add Question" form; invalid rows
// are skipped and reported, valid ones inserted. No transactions/upsert (the
// Neon HTTP adapter rejects both) — plain create() per row.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const [, , slug, file] = process.argv;
if (!slug || !file) {
  fail(
    "Usage: node --env-file=.env scripts/coaching/seed-coaching-questions.mjs <coaching-slug> <questions.json>"
  );
}

const url = process.env.DATABASE_URL;
if (!url) fail("DATABASE_URL not set. Run with: node --env-file=.env ...");

const prisma = new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}) });

// Normalize + validate one raw question into CoachingQuestion data, or return
// { error } describing why it's invalid.
function normalize(raw, i) {
  const type = String(raw.question_type ?? "mcq").toLowerCase();
  if (!["mcq", "nat", "subjective"].includes(type)) {
    return { error: `row ${i}: invalid question_type "${raw.question_type}"` };
  }
  if (!raw.question_text || !String(raw.question_text).trim()) {
    return { error: `row ${i}: missing question_text` };
  }
  const maxMarks = Number(raw.max_marks ?? 1);
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
    return { error: `row ${i}: invalid max_marks` };
  }

  let options = [];
  let correct = "";
  let natTol = null;

  if (type === "mcq") {
    // Accept options as ["text", ...] (auto-labelled) OR [{label,text}, ...].
    const rawOpts = Array.isArray(raw.options) ? raw.options : [];
    options = rawOpts
      .map((o, idx) =>
        typeof o === "string"
          ? { label: LETTERS[idx], text: o.trim() }
          : { label: String(o.label).trim(), text: String(o.text ?? "").trim() }
      )
      .filter((o) => o.text);
    if (options.length < 2) return { error: `row ${i}: mcq needs >=2 options` };
    correct = String(raw.correct_answer ?? "").trim().toUpperCase();
    if (!options.some((o) => o.label.toUpperCase() === correct)) {
      return { error: `row ${i}: correct_answer "${raw.correct_answer}" not among option labels` };
    }
  } else if (type === "nat") {
    correct = String(raw.correct_answer ?? "").trim();
    if (correct === "" || !Number.isFinite(Number(correct))) {
      return { error: `row ${i}: nat correct_answer must be a number` };
    }
    natTol = raw.nat_tolerance != null ? Number(raw.nat_tolerance) : 0;
    if (!Number.isFinite(natTol) || natTol < 0) return { error: `row ${i}: invalid nat_tolerance` };
  }
  // subjective: no options / correct answer.

  return {
    data: {
      question_text: String(raw.question_text).trim(),
      options,
      correct_answer: correct,
      solution: raw.solution ? String(raw.solution).trim() : null,
      question_type: type,
      max_marks: maxMarks,
      nat_tolerance: natTol,
      subject: raw.subject ? String(raw.subject).trim() : null,
      topic: raw.topic ? String(raw.topic).trim() : null,
      difficulty: raw.difficulty ? String(raw.difficulty).trim() : null,
    },
  };
}

async function main() {
  const coaching = await prisma.coaching.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!coaching) {
    const all = await prisma.coaching.findMany({ select: { slug: true }, take: 50 });
    fail(
      `No coaching with slug "${slug}". Available: ${all.map((c) => c.slug).join(", ") || "(none)"}`
    );
  }

  let rows;
  try {
    rows = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`Could not read/parse ${file}: ${e.message}`);
  }
  if (!Array.isArray(rows)) fail("JSON root must be an array of questions.");

  console.log(`\nSeeding ${rows.length} question(s) into "${coaching.name}" (${slug})…\n`);

  let inserted = 0;
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const { data, error } = normalize(rows[i], i + 1);
    if (error) {
      skipped.push(error);
      continue;
    }
    try {
      await prisma.coachingQuestion.create({
        data: { coaching_id: coaching.id, ...data },
      });
      inserted++;
    } catch (e) {
      skipped.push(`row ${i + 1}: DB error — ${e.message.split("\n")[0]}`);
    }
  }

  console.log(`✔ Inserted: ${inserted}`);
  if (skipped.length) {
    console.log(`✖ Skipped: ${skipped.length}`);
    skipped.forEach((s) => console.log(`   - ${s}`));
  }
  console.log("");
}

main()
  .catch((e) => fail(e.message))
  .finally(() => process.exit(0));
