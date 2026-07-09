// scripts/telegram/pickQuestion.ts
//
// Picks one fresh, poll-friendly MCQ for an exam and remembers it so it is
// never posted twice. "Poll-friendly" = exactly 4 options and a single-letter
// A–D answer, so the Telegram quiz poll maps cleanly to the image.
//
// Dedupe store: Upstash Redis if configured (a set per exam), else a local
// JSON file. Either way it is idempotent and survives restarts.

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCloudinaryUrl } from "@/lib/cloudinary";

export interface PickedQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctLetter: string; // "A".."D"
  correctIndex: number; // 0..3
  year: number;
  marks: number;
  imageUrls: string[]; // question figures (ImageKit), rendered into the card
  subject: string; // pattern.subject — for the per-question deep link
  topic: string; // pattern.topic_name — for the per-question deep link
}

interface StoredImage {
  index: number;
  filename: string;
  type?: "question" | "explanation";
}

const LETTERS = ["A", "B", "C", "D"];
const POSTED_FILE = path.join(process.cwd(), "scripts", "telegram", ".posted.json");
// Text that implies a diagram. Only a problem when NO figure image is stored.
const FIGURE_HINT = /\b(figure|fig\.|diagram|shown (below|above|in the)|following (figure|diagram|circuit|graph))\b/i;

/** Question-type figure URLs (ImageKit) for a PYQ's images JSON. */
function questionImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as StoredImage[])
    .filter((im) => im && im.type !== "explanation" && im.filename)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((im) => getCloudinaryUrl(im.filename))
    .filter(Boolean);
}

// ---- dedupe store -----------------------------------------------------------

interface Store {
  has(exam: string, id: string): Promise<boolean>;
  add(exam: string, id: string): Promise<void>;
}

function fileStore(): Store {
  const read = (): Record<string, string[]> => {
    try {
      return JSON.parse(fs.readFileSync(POSTED_FILE, "utf8"));
    } catch {
      return {};
    }
  };
  return {
    async has(exam, id) {
      return (read()[exam] ?? []).includes(id);
    },
    async add(exam, id) {
      const data = read();
      data[exam] = [...new Set([...(data[exam] ?? []), id])];
      fs.writeFileSync(POSTED_FILE, JSON.stringify(data, null, 2));
    },
  };
}

async function makeStore(): Promise<Store> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    return {
      async has(exam, id) {
        return (await redis.sismember(`tg:posted:${exam}`, id)) === 1;
      },
      async add(exam, id) {
        await redis.sadd(`tg:posted:${exam}`, id);
      },
    };
  }
  return fileStore();
}

// ---- selection --------------------------------------------------------------

function normalizeOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const opts = raw.map((o) => String(o).trim()).filter(Boolean);
  return opts.length === 4 ? opts : null;
}

/**
 * Returns a fresh question for the exam, or null if the bank is exhausted /
 * empty. Marks the returned question as posted before returning — pass
 * markPosted=false (e.g. a dry-run) to select without recording it, so the
 * question stays available and the dedupe store is left untouched.
 */
export async function pickQuestion(
  examSlug: string,
  branchSlug?: string,
  markPosted = true,
): Promise<PickedQuestion | null> {
  const store = await makeStore();
  // Dedupe scope is per exam+branch so each Topic tracks its own history.
  const scope = branchSlug ? `${examSlug}-${branchSlug}` : examSlug;

  // Pull a generous, varied batch; filter to clean 4-option MCQs in JS since
  // options is JSON and can't be length-filtered in the query.
  const rows = await prisma.pYQ.findMany({
    where: {
      pattern: {
        exam_slug: examSlug,
        ...(branchSlug ? { branch_slug: branchSlug } : {}),
      },
      question_type: "MCQ",
    },
    select: {
      id: true,
      question_text: true,
      options: true,
      correct_answer: true,
      year: true,
      marks: true,
      images: true,
      pattern: { select: { subject: true, topic_name: true } },
    },
    orderBy: { year: "desc" },
    take: 400,
  });

  // Shuffle so the same recent questions aren't always tried first.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }

  for (const r of rows) {
    const letter = String(r.correct_answer ?? "").trim().toUpperCase();
    if (!LETTERS.includes(letter)) continue; // skip MSQ / NAT
    const options = normalizeOptions(r.options);
    if (!options) continue;
    const imageUrls = questionImageUrls(r.images);
    // Only skip when the text needs a figure but none is stored — those can't
    // be shown. Questions WITH a figure get it rendered into the card.
    if (imageUrls.length === 0 && FIGURE_HINT.test(r.question_text)) continue;
    if (await store.has(scope, r.id)) continue;

    if (markPosted) await store.add(scope, r.id);
    return {
      id: r.id,
      questionText: r.question_text,
      options,
      correctLetter: letter,
      correctIndex: LETTERS.indexOf(letter),
      year: r.year,
      marks: r.marks,
      imageUrls,
      subject: r.pattern?.subject ?? "",
      topic: r.pattern?.topic_name ?? "",
    };
  }
  return null;
}
