// scripts/telegram/config.ts
//
// Central config for the Telegram daily-PYQ auto-poster.
//
// One Telegram *supergroup with Topics enabled* holds one Topic per exam.
// The poster drops each exam's daily question into that exam's Topic thread.
//
// Fill TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env, then run
//   npx tsx --env-file=.env scripts/telegram/discover.ts
// to print the message_thread_id of each Topic, and paste them below.

import { toSlug } from "@/lib/seo";

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
// The supergroup id — a negative number like -1002345678901.
export const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

export const SITE = "https://battleexam.com";

export interface ExamTopic {
  /** Canonical exam_slug as stored on Pattern.exam_slug (see stats.ts output). */
  examSlug: string;
  /**
   * For branched exams (GATE) the Pattern.branch_slug — e.g. "cse", "ece".
   * Omit for branchless exams (JEE Main, NEET). The site link becomes
   * `${examSlug}-${branchSlug}` (e.g. gate-cse), matching the public URL.
   */
  branchSlug?: string;
  /** Human label shown in the post header. */
  label: string;
  /** Emoji badge for the card + caption. */
  emoji: string;
  /**
   * message_thread_id of this exam's Topic in the supergroup.
   * Get it from discover.ts. Leave 0 to post to the group's General thread.
   */
  threadId: number;
}

// EDIT ME: one entry per Topic you create. GATE gets one entry PER BRANCH.
// Run stats.ts to see which exam/branch combos have enough questions.
export const EXAM_TOPICS: ExamTopic[] = [
  { examSlug: "jee-main", label: "JEE Main", emoji: "🧪", threadId: 2 },
  { examSlug: "gate", branchSlug: "cse", label: "GATE CS/IT", emoji: "💻", threadId: 3 },
  { examSlug: "gate", branchSlug: "ce", label: "GATE Civil", emoji: "🏗️", threadId: 4 },
  { examSlug: "gate", branchSlug: "ece", label: "GATE ECE", emoji: "📡", threadId: 5 },
  { examSlug: "gate", branchSlug: "ee", label: "GATE Electrical", emoji: "⚡", threadId: 6 },
  { examSlug: "gate", branchSlug: "pi", label: "GATE Production & Ind.", emoji: "🏭", threadId: 7 },
];

/** The public URL slug for an exam (+branch), e.g. "gate-cse" or "jee-main". */
export function linkSlug(t: Pick<ExamTopic, "examSlug" | "branchSlug">): string {
  return t.branchSlug ? `${t.examSlug}-${t.branchSlug}` : t.examSlug;
}

function utm(slug: string): string {
  return new URLSearchParams({
    utm_source: "telegram",
    utm_medium: "daily_pyq",
    utm_campaign: slug,
  }).toString();
}

/** Public deep link into the exam's PYQ practice page (fallback / "browse"). */
export function practiceLink(t: Pick<ExamTopic, "examSlug" | "branchSlug">): string {
  const slug = linkSlug(t);
  return `${SITE}/${slug}/pyq?${utm(slug)}`;
}

/**
 * Deep link to the *specific* question. The /[exam]/[subject]/[topic]/pyq-<id>
 * route 308-redirects to that question's topic page anchored on it — so the
 * user lands on the exact question's full solution AND sees more from the topic.
 */
export function questionLink(
  t: Pick<ExamTopic, "examSlug" | "branchSlug">,
  q: { id: string; subject: string; topic: string },
): string {
  const slug = linkSlug(t);
  const path = `${slug}/${toSlug(q.subject) || "general"}/${toSlug(q.topic) || "topic"}/pyq-${q.id}`;
  return `${SITE}/${path}?${utm(slug)}`;
}

export function assertConfigured(): void {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set in .env");
  if (!CHAT_ID) throw new Error("TELEGRAM_CHAT_ID is not set in .env");
}
