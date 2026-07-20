import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getImageUrl } from "@/lib/imageUtils";

// Shared helpers for /admin/mock-images — the repair UI for mock questions whose
// ImageKit file is gone (see scripts/audit-mock-images.mjs, which produces the
// worklist this reads).
//
// Split of responsibilities: the WORKLIST (which mocks are affected) comes from
// the committed audit JSON, because re-checking all ~9k refs on page load would
// take minutes. The PER-MOCK detail is re-verified live on open — a single mock
// is a few dozen images, so it's fast and never shows an already-fixed image as
// still broken.

export type MockImageRef = {
  qIndex: number;
  imgIndex: number;
  ref: string;
  url: string;
  missing: boolean;
};

export type MockQuestionDetail = {
  qIndex: number;
  questionId: string | null;
  text: string;
  subject: string | null;
  options: string[];
  /** Why this question looks like it genuinely needs a figure; empty = safe to strip. */
  figureReasons: string[];
  images: MockImageRef[];
};

/**
 * Heuristics for "does this question actually need its image?".
 *
 * Most broken refs are vestigial: the cracku scrape attached a screenshot of the
 * question it had just scraped as text, named after the question's own opening
 * words. Those should be removed, not replaced. But a real minority are load-
 * bearing, so flag the tell-tales and keep flagged questions out of bulk removal.
 *
 * Returns reasons (empty = no figure signal). Deliberately errs toward flagging:
 * a false flag costs one manual look, a false clear silently destroys a figure.
 */
export function figureSignals(text: string, options: string[], refs: string[]): string[] {
  const reasons: string[] = [];

  if (/\b(figure|fig\b|fig\.|diagram|shown below|shown in|as shown|adjoining|given below|graph of|circuit)\b/i.test(text)) {
    reasons.push("text refers to a figure");
  }
  if (text.trim().length < 60) {
    reasons.push("question text too short to stand alone");
  }
  // Option images: the answer choices ARE the figures, so the stem reading fine
  // proves nothing.
  if (refs.some((r) => /optfix|_opt\d|option/i.test(r))) {
    reasons.push("images are answer options");
  }
  const meaningful = options.filter(
    (o) => o.trim().length > 3 && !/^[([]?[A-D1-4][)\].]?$/.test(o.trim())
  ).length;
  if (options.length > 0 && meaningful < options.length) {
    reasons.push("some options have no text (likely image options)");
  }
  return reasons;
}

function optionTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      const s = r.text ?? r.option ?? r.value;
      return typeof s === "string" ? s : "";
    }
    return "";
  });
}

export type AuditedMock = {
  mockId: string;
  title: string;
  exam_type: string;
  branch: string | null;
  count: number;
};

type AuditFile = {
  summary: Record<string, number>;
  mocks: (AuditedMock & { refs: string[] })[];
};

/** The committed audit worklist. Empty (not an error) if the audit never ran. */
export async function loadAuditWorklist(): Promise<AuditedMock[]> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "mock-missing-images.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw) as AuditFile;
    return (parsed.mocks ?? []).map(({ mockId, title, exam_type, branch, count }) => ({
      mockId,
      title,
      exam_type,
      branch,
      count,
    }));
  } catch {
    return [];
  }
}

/**
 * Mock questions store images as [{ index, filename, type? }]
 * (prisma/seed_mock_from_json.ts:58). Read filename/url/src/path ONLY — never
 * arbitrary fields like `type`, which would surface "explanation" as a path.
 */
export function refOf(img: unknown): string | null {
  if (typeof img === "string") return img;
  if (img && typeof img === "object") {
    const o = img as Record<string, unknown>;
    const ref = o.filename ?? o.url ?? o.src ?? o.path;
    return typeof ref === "string" ? ref : null;
  }
  return null;
}

/** Write a replacement ref back into an image entry, preserving its other fields. */
export function withRef(img: unknown, next: string): unknown {
  if (typeof img === "string" || img == null) return next;
  const o = { ...(img as Record<string, unknown>) };
  // Overwrite whichever key held the ref, so we don't leave a stale one behind.
  for (const k of ["filename", "url", "src", "path"]) {
    if (typeof o[k] === "string") o[k] = next;
  }
  if (!["filename", "url", "src", "path"].some((k) => typeof o[k] === "string")) {
    o.filename = next;
  }
  return o;
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.status === 200;
  } catch {
    return false; // network error — treat as broken, the UI can retry
  }
}

/** HEAD-check a list of URLs with bounded concurrency. */
async function checkAll(urls: string[], concurrency = 12): Promise<boolean[]> {
  const out = new Array<boolean>(urls.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
      while (cursor < urls.length) {
        const i = cursor++;
        out[i] = await headOk(urls[i]);
      }
    })
  );
  return out;
}

/**
 * Re-verify one mock's images live and return only the questions that still have
 * at least one broken image, with every image on those questions (so the admin
 * can see the good ones for context).
 */
export async function verifyMockImages(
  questions: unknown[]
): Promise<MockQuestionDetail[]> {
  type Pending = { q: MockQuestionDetail; img: MockImageRef };
  const pending: Pending[] = [];
  const details: MockQuestionDetail[] = [];

  questions.forEach((raw, qIndex) => {
    const q = (raw ?? {}) as Record<string, unknown>;
    const images = Array.isArray(q.images) ? q.images : [];
    if (!images.length) return;

    const options = optionTexts(q.options);
    const refs = images.map(refOf).filter((r): r is string => !!r);

    const detail: MockQuestionDetail = {
      qIndex,
      questionId: typeof q.id === "string" ? q.id : null,
      options,
      figureReasons: [],
      // Mock questions store the stem as `question_text` (verified against the DB);
      // `question`/`text` are fallbacks for any older-shaped rows.
      text:
        typeof q.question_text === "string"
          ? q.question_text
          : typeof q.question === "string"
            ? q.question
            : typeof q.text === "string"
              ? q.text
              : "",
      subject: typeof q.subject === "string" ? q.subject : null,
      images: [],
    };
    detail.figureReasons = figureSignals(detail.text, options, refs);

    images.forEach((img, imgIndex) => {
      const ref = refOf(img);
      if (!ref) return;
      const entry: MockImageRef = { qIndex, imgIndex, ref, url: getImageUrl(ref), missing: false };
      detail.images.push(entry);
      pending.push({ q: detail, img: entry });
    });
    if (detail.images.length) details.push(detail);
  });

  const results = await checkAll(pending.map((p) => p.img.url));
  pending.forEach((p, i) => {
    p.img.missing = !results[i];
  });

  return details.filter((d) => d.images.some((i) => i.missing));
}
