import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { extractQuestions, cropQuestionImage, type UploadImage, type ImportQType } from "@/lib/coachingImport";
import { pdfPageRenderer } from "@/lib/pdfRaster";

// sharp + Gemini SDK need the Node runtime (not edge).
export const runtime = "nodejs";
// Vision extraction + translation can take a while for a full paper.
export const maxDuration = 300;

const MAX_IMAGES = 25;

async function fileToUpload(file: File): Promise<UploadImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  return { mimeType: file.type || "application/octet-stream", base64: buf.toString("base64") };
}

// POST /api/coaching/questions/import  (multipart)
//   fields: exam, set, topics? (comma-separated), images (0..N files), pdf (1 file)
// Returns parsed (UNSAVED) bilingual questions for the review step. No DB writes.
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  // Gated to super admins for now (AI extraction is the costly path).
  if (!actor.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const exam = String(form.get("exam") ?? "").trim();
  const set = String(form.get("set") ?? "").trim();
  if (!exam || !set) {
    return NextResponse.json({ error: "exam and set are required" }, { status: 400 });
  }
  // Admin pre-declares what the paper contains so the extraction prompt is
  // focused; "mixed" keeps per-question auto-detection.
  const qtypeRaw = String(form.get("qtype") ?? "mixed");
  const qtype: ImportQType = ["objective", "subjective", "mixed"].includes(qtypeRaw)
    ? (qtypeRaw as ImportQType)
    : "mixed";

  const imageFiles = form.getAll("images").filter((f): f is File => f instanceof File).slice(0, MAX_IMAGES);
  const pdfEntry = form.get("pdf");
  const pdfFile = pdfEntry instanceof File ? pdfEntry : null;
  if (imageFiles.length === 0 && !pdfFile) {
    return NextResponse.json({ error: "upload at least one image or a PDF" }, { status: 400 });
  }

  // The exam's section catalog (global + this coaching's) constrains Gemini.
  const sectionRows = await prisma.examSection.findMany({
    where: { exam, OR: [{ coaching_id: null }, { coaching_id: coachingId }] },
    select: { name: true },
    orderBy: { sort_order: "asc" },
  });
  const sections = [...new Set(sectionRows.map((r) => r.name))];

  // The exam's syllabus catalog (global + this coaching's), grouped by section.
  // Present for CBSE classes (fixed syllabus); empty for exams not yet seeded —
  // in which case we fall back to the admin-typed topic list below.
  const topicRows = await prisma.syllabusTopic.findMany({
    where: { exam, OR: [{ coaching_id: null }, { coaching_id: coachingId }] },
    select: { section: true, name: true },
    orderBy: { sort_order: "asc" },
  });
  const topicsBySection: Record<string, string[]> = {};
  for (const r of topicRows) {
    const list = (topicsBySection[r.section] ??= []);
    if (!list.includes(r.name)) list.push(r.name);
  }
  const hasCatalog = topicRows.length > 0;

  const topicsRaw = String(form.get("topics") ?? "").trim();
  const topics = topicsRaw ? topicsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const images = await Promise.all(imageFiles.map(fileToUpload));
  const pdf = pdfFile ? await fileToUpload(pdfFile) : undefined;

  let questions;
  try {
    questions = await extractQuestions({
      images,
      pdf,
      sections,
      qtype,
      // Catalog wins when present (school classes); else the typed list.
      topicsBySection: hasCatalog ? topicsBySection : undefined,
      topics: hasCatalog ? undefined : topics,
      // Stop firing Gemini calls (and burning the rate-limited quota) the moment
      // the client navigates away — a page refresh aborts the fetch, but the
      // handler would otherwise run every batch to completion for nothing.
      signal: req.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "extraction failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Client already gone — skip the figure cropping / ImageKit uploads too; the
  // response will be discarded anyway.
  if (req.signal.aborted) {
    return NextResponse.json({ error: "client disconnected" }, { status: 499 });
  }

  // Snapshot figure questions to an image (rasterized PDF page or source image) and
  // crop legacy diagrams. Best-effort per question. One renderer per PDF (pages cached).
  let renderer: ReturnType<typeof pdfPageRenderer> | null = null;
  if (pdf) {
    try {
      renderer = pdfPageRenderer(Buffer.from(pdf.base64, "base64"));
    } catch {
      renderer = null; // unreadable PDF → fall back to image-only cropping
    }
  }
  const cropCtx = { images, renderer };
  // Diagnostics: figures the MODEL flagged vs. crops we actually produced. If
  // flagged>0 but cropped==0 the crop step is broken (renderer/sharp/bbox); if
  // flagged==0 the model isn't identifying the figures (prompt/model side).
  let flagged = 0;
  let cropped = 0;
  for (const q of questions) {
    const hasBox = Array.isArray(q.crop_box) && q.crop_box.length === 4;
    if (q.is_figure || hasBox || q.has_diagram) flagged++;
    q.images = await cropQuestionImage(cropCtx, q, coachingId);
    if (q.images?.length) cropped++;
    // Figure MCQs have their choices inside the image, so option text is empty —
    // which the validator would drop. Use each option's label as its text so the
    // A/B/C/D choices survive and render as selectable buttons next to the figure.
    if (q.images?.length && q.question_type === "mcq" && Array.isArray(q.options)) {
      q.options = q.options.map((o) => ({ label: o.label, text: (o.text ?? "").trim() || o.label }));
    }
    // Drop transit-only hints from the payload returned to the client.
    delete q.number;
    delete q.is_figure;
    delete q.page;
    delete q.crop_box;
    delete q.has_diagram;
    delete q.bbox;
    delete q.source_image;
  }
  console.log(
    `[import] figures: ${flagged} flagged by model, ${cropped} cropped ` +
      `(source: ${pdf ? (renderer ? "PDF+renderer" : "PDF, renderer FAILED") : `${images.length} image(s)`})`
  );

  return NextResponse.json({ exam, set, sections, topicsBySection, questions });
});
