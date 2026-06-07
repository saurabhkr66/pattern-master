import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from "sharp";
import ImageKit, { toFile } from "@imagekit/nodejs";

// Gemini-powered bulk import: extract questions from photos / a PDF, translate to
// the other language, and crop any diagrams. The admin supplies Exam + Set (applied
// to every row) and we feed Gemini the exam's SECTION list so it classifies each
// question into one of those exact names (never invents one).

const MODEL = process.env.COACHING_IMPORT_MODEL || "gemini-3.1-flash-lite";

const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

export type UploadImage = { mimeType: string; base64: string };
type StoredImage = { index: number; filename: string };
type BBox = { x: number; y: number; w: number; h: number };

export type ParsedQuestion = {
  question_type: "mcq" | "nat" | "subjective";
  question_text: string;
  question_text_hindi?: string | null;
  options?: { label: string; text: string }[];
  options_hindi?: { label: string; text: string }[];
  correct_answer?: string;
  max_marks?: number;
  nat_tolerance?: number | null;
  solution?: string | null;
  solution_hindi?: string | null;
  section?: string | null;
  topic?: string | null;
  images?: StoredImage[] | null;
  // Transit-only hints from Gemini (never stored):
  has_diagram?: boolean;
  bbox?: BBox | null;
  source_image?: number;
  confidence?: number;
};

function buildPrompt(sections: string[], topics?: string[]): string {
  const sectionList = sections.length
    ? `Assign each question a "section" — it MUST be EXACTLY one of: ${JSON.stringify(
        sections
      )}. If none fits, use null. Do NOT invent new section names.`
    : `Leave "section" as null.`;
  const topicList =
    topics && topics.length
      ? `Also assign "topic" — EXACTLY one of: ${JSON.stringify(topics)}, or null if none fits.`
      : `Leave "topic" as null.`;
  return [
    "You extract exam questions from the attached images/PDF and return STRICT JSON.",
    "Return a JSON array; each element is one question with these fields:",
    `{
  "question_text": string,            // English. LaTeX inline as \\( ... \\), display as \\[ ... \\]
  "question_text_hindi": string,      // Hindi translation (translate if the source is English; keep LaTeX/numbers identical)
  "question_type": "mcq" | "nat" | "subjective",
  "options": [{"label":"A","text":string}, ...],        // English (mcq only)
  "options_hindi": [{"label":"A","text":string}, ...],  // Hindi, same labels/order (mcq only)
  "correct_answer": string,           // option label for mcq, number for nat, "" for subjective
  "max_marks": number,
  "nat_tolerance": number | null,
  "solution": string | null,          // English
  "solution_hindi": string | null,    // Hindi
  "section": string | null,
  "topic": string | null,
  "has_diagram": boolean,             // true if the question has a figure/diagram
  "bbox": {"x":number,"y":number,"w":number,"h":number} | null,  // figure box in PIXELS of source_image
  "source_image": number,             // index of the image the question came from (0-based; 0 for PDF)
  "confidence": number                // 0..1 extraction confidence
}`,
    "Preserve the source language verbatim and faithfully translate the other side; keep math/numbers identical across languages.",
    sectionList,
    topicList,
    "Output ONLY the JSON array, no prose.",
  ].join("\n");
}

/** Call Gemini to extract + translate questions from the uploaded media. */
export async function extractQuestions(opts: {
  images?: UploadImage[];
  pdf?: UploadImage;
  sections: string[];
  topics?: string[];
}): Promise<ParsedQuestion[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: buildPrompt(opts.sections, opts.topics) },
  ];
  if (opts.pdf) parts.push({ inlineData: { mimeType: opts.pdf.mimeType, data: opts.pdf.base64 } });
  for (const img of opts.images ?? []) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const res = await model.generateContent({ contents: [{ role: "user", parts }] });
  const text = res.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini did not return valid JSON");
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : [];
  return arr as ParsedQuestion[];
}

/**
 * If a parsed question has a diagram bbox, crop it out of its source image and
 * upload the crop to ImageKit. Returns the `images` array to store, or null.
 * Image uploads only (PDFs have no source bitmap to crop). Best-effort: any
 * failure returns null so the question is still imported (just without the image).
 */
export async function cropDiagram(
  images: UploadImage[],
  q: ParsedQuestion,
  coachingId: string
): Promise<StoredImage[] | null> {
  if (!q.has_diagram || !q.bbox || images.length === 0) return null;
  const src = images[q.source_image ?? 0];
  if (!src) return null;
  try {
    const buf = Buffer.from(src.base64, "base64");
    const meta = await sharp(buf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    const left = Math.max(0, Math.round(q.bbox.x));
    const top = Math.max(0, Math.round(q.bbox.y));
    const width = Math.min(imgW - left, Math.round(q.bbox.w));
    const height = Math.min(imgH - top, Math.round(q.bbox.h));
    if (width <= 1 || height <= 1) return null;

    const cropped = await sharp(buf).extract({ left, top, width, height }).png().toBuffer();
    const fileName = `q-${globalThis.crypto.randomUUID()}.png`;
    const file = await toFile(cropped, fileName);
    const result = await ik.files.upload({
      file,
      fileName,
      folder: `/pattern-master/coaching/${coachingId}`,
      useUniqueFileName: true,
    });
    if (!result.url) return null;
    // getImageUrl() passes full http(s) URLs through unchanged.
    return [{ index: 0, filename: result.url }];
  } catch {
    return null;
  }
}
