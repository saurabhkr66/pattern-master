// scripts/telegram/postDaily.ts
//
// The daily cron entry point. For each configured exam Topic it:
//   1. picks a fresh 4-option MCQ,
//   2. renders it to a LaTeX-perfect PNG card,
//   3. posts the card + a native quiz poll into that exam's Topic,
//   4. drops a "full solution + practice more → site" CTA link.
//
// Idempotent per question (see pickQuestion dedupe). Safe to run once a day.
//
// Usage:
//   npx tsx --env-file=.env scripts/telegram/postDaily.ts
//   npx tsx --env-file=.env scripts/telegram/postDaily.ts --dry-run   # render+pick, no send
//   npx tsx --env-file=.env scripts/telegram/postDaily.ts --only jee-main

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  CHAT_ID,
  EXAM_TOPICS,
  assertConfigured,
  questionLink,
  linkSlug,
  type ExamTopic,
} from "./config";
import { pickQuestion, type PickedQuestion } from "./pickQuestion";
import { renderCard, closeBrowser } from "./render";
import { sendPhoto, sendQuizPoll, sendMessage } from "./telegram";

const DRY = process.argv.includes("--dry-run");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

async function postOne(topic: ExamTopic, q: PickedQuestion): Promise<void> {
  const png = await renderCard({
    emoji: topic.emoji,
    label: topic.label,
    year: q.year,
    marks: q.marks,
    questionText: q.questionText,
    options: q.options,
    images: q.imageUrls,
  });

  if (DRY) {
    const out = path.join(process.cwd(), "scripts", "telegram", `preview-${linkSlug(topic)}.png`);
    fs.writeFileSync(out, png);
    console.log(`  [dry-run] wrote ${out}`);
    console.log(`  [dry-run] link → ${questionLink(topic, q)}`);
    return;
  }

  const caption =
    `${topic.emoji} <b>${topic.label} — Daily PYQ (${q.year})</b>\n` +
    `Read the question, then vote in the poll 👇`;
  await sendPhoto({ chatId: CHAT_ID, threadId: topic.threadId, png, caption });

  await sendQuizPoll({
    chatId: CHAT_ID,
    threadId: topic.threadId,
    question: "Your answer? (see image above)",
    options: ["A", "B", "C", "D"],
    correctOptionId: q.correctIndex,
    explanation: `✅ Correct: ${q.correctLetter}. Full step-by-step solution on the site.`,
  });

  await sendMessage({
    chatId: CHAT_ID,
    threadId: topic.threadId,
    text:
      `📖 <b>Full solution + more like this</b>\n` +
      `➡️ ${questionLink(topic, q)}`,
  });

  console.log(`  ✅ posted PYQ ${q.id} to ${topic.label}`);
}

async function main() {
  if (!DRY) assertConfigured(); // dry-run only reads the DB + renders images
  // --only matches either an exam ("gate" = all its branches) or a specific
  // branch link slug ("gate-cse").
  const topics = ONLY
    ? EXAM_TOPICS.filter((t) => t.examSlug === ONLY || linkSlug(t) === ONLY)
    : EXAM_TOPICS;
  if (topics.length === 0) {
    console.error(ONLY ? `No topic configured for "${ONLY}"` : "No exam topics configured");
    process.exit(1);
  }

  for (const topic of topics) {
    console.log(`\n${topic.emoji} ${topic.label} (${topic.examSlug})`);
    try {
      const q = await pickQuestion(topic.examSlug, topic.branchSlug, !DRY);
      if (!q) {
        console.log("  ⚠️ no fresh question available (empty bank or exhausted)");
        continue;
      }
      await postOne(topic, q);
    } catch (err) {
      // One exam failing must not block the rest.
      console.error(`  ❌ ${topic.label}: ${(err as Error).message}`);
    }
  }

  await closeBrowser();
  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch(async (e) => {
  console.error(e);
  await closeBrowser();
  await prisma.$disconnect();
  process.exit(1);
});
