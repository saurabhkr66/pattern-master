import "server-only";
import type { QuestionRef } from "@/lib/resolveQuestions";

/**
 * Deterministic per-student test assembly. The page (rendering) and the submit
 * endpoint (grading) BOTH call buildStudentQuestionRefs with the same inputs,
 * so a student is always shown — and graded on — the exact same question set
 * and order, stable across reloads/resumes. Nothing needs to be persisted.
 *
 * Seed = `${studentId}:${testId}`. Same student + same test ⇒ same sequence.
 *
 * v1 scope: question ORDER shuffle + pool sampling. Option-order shuffle is
 * deferred to the anti-cheating task (it requires remapping correct_answer,
 * which only matters server-side at grading).
 */

// Deterministic 32-bit string hash → PRNG seed.
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG — small, fast, deterministic.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const rng = mulberry32(hashSeed(seed));
  const out = [...arr];
  // Fisher–Yates with the seeded PRNG.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface RuntimeTest {
  id: string;
  questions: unknown; // stored JSON: QuestionRef[]
  shuffle: boolean;
  pool_size: number | null;
  // Optional — carried in the cached config so the submit/finalize paths can
  // compute the server-side deadline (min(started_at + duration, end_at))
  // without a DB read. May arrive as an ISO string after a Redis round-trip.
  duration_secs?: number;
  end_at?: string | Date | null;
}

/**
 * Returns the ordered question refs this student should see, applying pool
 * sampling then (optionally) shuffling. Pure + deterministic given the seed.
 */
export function buildStudentQuestionRefs(test: RuntimeTest, studentId: string): QuestionRef[] {
  const all: QuestionRef[] = Array.isArray(test.questions)
    ? (test.questions as QuestionRef[])
    : [];
  const seed = `${studentId}:${test.id}`;

  let refs = all;

  // Pool: deterministically sample pool_size of them. Sample by shuffling the
  // full set with the seed and slicing — stable for this student.
  if (test.pool_size && test.pool_size > 0 && test.pool_size < all.length) {
    refs = seededShuffle(all, `${seed}:pool`).slice(0, test.pool_size);
  }

  // Order shuffle (applied after pool so the slice is still seed-stable).
  if (test.shuffle) {
    refs = seededShuffle(refs, `${seed}:order`);
  }

  return refs;
}

/**
 * Deterministic per-student option permutation for one MCQ question.
 * Returns an array `perm` where `perm[displayPos] = originalIndex` — i.e. the
 * option shown in display slot i is the original option at index perm[i].
 *
 * The page reorders options for display with this; the submit endpoint uses the
 * SAME permutation to map the student's chosen display letter back to the
 * original option letter before grading. Seeded per (student, test, question)
 * so it's stable across reloads and reproducible at grading time.
 */
export function optionPermutation(seed: string, n: number): number[] {
  const rng = mulberry32(hashSeed(seed));
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Seed string for a question's option permutation. */
export const optionSeed = (studentId: string, testId: string, questionId: string) =>
  `${studentId}:${testId}:opt:${questionId}`;

/** Current open/closed state of a scheduled test, given its window. */
export function testWindowState(
  startAt: Date | null,
  endAt: Date | null,
  now = new Date()
): "before" | "open" | "after" {
  if (startAt && now < startAt) return "before";
  if (endAt && now > endAt) return "after";
  return "open";
}
