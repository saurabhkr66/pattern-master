import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { extractQuestions, cropQuestionImage, cropSolutionImage, verifyAnswers, reviewSubjectiveAnswers, generateComparisonSolutions, resetTokenUsage, getTokenUsage, logTokenUsage, mapLimit, FIGURE_CROP_CONCURRENCY, type UploadImage, type ImportQType } from "@/lib/coachingImport";
import { pdfPageRenderer } from "@/lib/pdfRaster";
import sharp from "sharp";

// sharp + Gemini SDK need the Node runtime (not edge).
export const runtime = "nodejs";
// Vision extraction + translation can take a while for a full paper.
export const maxDuration = 300;

const MAX_IMAGES = 25;

// Longest-edge cap for an uploaded page photo. Exam pages are text and line art, so
// 2200px keeps small print legible for OCR while cutting the payload by roughly an
// order of magnitude against a modern phone's 12MP original.
const MAX_IMAGE_EDGE = Number(process.env.COACHING_IMPORT_MAX_IMAGE_EDGE) || 2200;
// Warn past this much inlined base64 — the request body limit is around 20MB.
const INLINE_WARN_BYTES = 15_000_000;

async function fileToUpload(file: File): Promise<UploadImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  return { mimeType: file.type || "application/octet-stream", base64: buf.toString("base64") };
}

/**
 * Downscale + re-encode an uploaded page photo before it is inlined.
 *
 * Every extraction call re-sends the FULL media prefix — that's deliberate, it's what
 * keeps Gemini's implicit context cache warm — and at BATCH_SIZE=1 that means one
 * re-upload per question. So 25 raw 12MP photos base64'd is tens of MB on every
 * request and trips the ~20MB body limit as an opaque "fetch failed". PDFs dodge this
 * via the File API; inlined images have no equivalent, so they get shrunk here.
 * Falls back to the original bytes when sharp can't read the file (it may still be a
 * format Gemini accepts) or when the re-encode doesn't actually save anything.
 */
async function imageToUpload(file: File): Promise<UploadImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const out = await sharp(buf)
      .rotate() // honour EXIF orientation before resizing
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    if (out.length < buf.length) return { mimeType: "image/jpeg", base64: out.toString("base64") };
  } catch {
    /* unreadable by sharp — send the original through */
  }
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

  // Independent answer verification is the costly pass — it runs the (Pro-class)
  // verify model on every objective question. Opt-in per import: off by default
  // since flash-lite extraction is reliable on easy papers, and the admin flips
  // it on only for hard papers where a wrong answer key is expensive.
  const wantVerify = String(form.get("verify") ?? "") === "1";

  // Which model runs the (opt-in) verify/review pass — the super admin picks it in
  // the modal. Validated against the allowlist server-side (resolveVerifyModel), so
  // an unknown/missing value just falls back to the default.
  const verifyModel = String(form.get("verifyModel") ?? "").trim() || undefined;

  // Which model derives answers + writes worked solutions (Pass 2). Super admin picks
  // it; re-validated server-side (resolveGenerationModel) against the allowlist.
  const answerModel = String(form.get("answerModel") ?? "").trim() || undefined;


  // Hindi translation is opt-in (default OFF). Most coaching papers are English-
  // only, and translating every field roughly doubles output tokens/cost — so the
  // admin flips this on per import only for bilingual papers.
  const bilingual = String(form.get("hindi") ?? "") === "1";

  const imageFiles = form.getAll("images").filter((f): f is File => f instanceof File).slice(0, MAX_IMAGES);
  const pdfEntry = form.get("pdf");
  const pdfFile = pdfEntry instanceof File ? pdfEntry : null;
  if (imageFiles.length === 0 && !pdfFile) {
    return NextResponse.json({ error: "upload at least one image or a PDF" }, { status: 400 });
  }

  // The exam's section catalog (global + this coaching's) constrains Gemini.
  // Match the exam name case-insensitively: the field is free-typed in the modal,
  // and a stray case/spacing difference from the seeded key would otherwise return
  // zero sections (the paper imports unsectioned).
  const sectionRows = await prisma.examSection.findMany({
    where: { exam: { equals: exam, mode: "insensitive" }, OR: [{ coaching_id: null }, { coaching_id: coachingId }] },
    select: { name: true },
    orderBy: { sort_order: "asc" },
  });
  const sections = [...new Set(sectionRows.map((r) => r.name))];

  // The exam's syllabus catalog (global + this coaching's), grouped by section.
  // Present for CBSE classes (fixed syllabus); empty for exams not yet seeded —
  // in which case we fall back to the admin-typed topic list below.
  const topicRows = await prisma.syllabusTopic.findMany({
    where: { exam: { equals: exam, mode: "insensitive" }, OR: [{ coaching_id: null }, { coaching_id: coachingId }] },
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

  const images = await Promise.all(imageFiles.map(imageToUpload));
  const pdf = pdfFile ? await fileToUpload(pdfFile) : undefined;
  if (images.length) {
    const inlineBytes = images.reduce((n, i) => n + i.base64.length, 0);
    console.log(`[import] ${images.length} image(s) inlined ≈ ${(inlineBytes / 1e6).toFixed(1)}MB per request`);
    if (inlineBytes > INLINE_WARN_BYTES) {
      console.warn(
        `[import] ⚠ inlined images are ≈${(inlineBytes / 1e6).toFixed(1)}MB — close to the request body limit; expect "fetch failed". Lower COACHING_IMPORT_MAX_IMAGE_EDGE or upload fewer pages.`
      );
    }
  }

  // The extraction below (Gemini passes + cropping) routinely runs past 100s,
  // which is Cloudflare's hard origin-response cap — it would 524 before we ever
  // respond. So we stream the response as NDJSON: one JSON object per line. The
  // status is committed to 200 the moment the stream opens, so progress events,
  // the final payload, AND failures all travel in the body (the client switches
  // on each line's `t` field). A bare "\n" heartbeat keeps idle proxies awake
  // between Gemini calls and is skipped as an empty line by the client parser.
  let beat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      // Emit one NDJSON event line. Safe to call repeatedly (unlike the old
      // single-shot `send`): the stream stays open until `finish()`.
      const write = (ev: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
        } catch {
          /* stream torn down (client gone) */
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        if (beat) clearInterval(beat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      beat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode("\n"));
        } catch {
          /* closed */
        }
      }, 15000);

      try {
        // Fresh per-model token tallies for this import (cost summary below).
        resetTokenUsage();
        const questions = await extractQuestions({
          images,
          pdf,
          sections,
          qtype,
          bilingual,
          answerModel,
          // Catalog wins when present (school classes); else the typed list.
          topicsBySection: hasCatalog ? topicsBySection : undefined,
          topics: hasCatalog ? undefined : topics,
          // Stop firing Gemini calls (and burning the rate-limited quota) the moment
          // the client navigates away — a page refresh aborts the fetch, but the
          // handler would otherwise run every batch to completion for nothing.
          signal: req.signal,
          // Forward live progress (phases + per-batch questions) straight to the client.
          onEvent: write,
        });

        // Client already gone — skip the figure cropping / ImageKit uploads too;
        // the response will be discarded anyway.
        if (req.signal.aborted) {
          write({ t: "error", error: "client disconnected" });
          finish();
          return;
        }
        write({ t: "phase", phase: "cropping", total: questions.length });

        // Snapshot figure questions to an image (rasterized PDF page or source image)
        // and crop legacy diagrams. Best-effort per question. One renderer per PDF.
        let renderer: ReturnType<typeof pdfPageRenderer> | null = null;
        if (pdf) {
          try {
            renderer = pdfPageRenderer(Buffer.from(pdf.base64, "base64"));
          } catch {
            renderer = null; // unreadable PDF → fall back to image-only cropping
          }
        }
        const cropCtx = { images, renderer };
        const apiKey = process.env.GEMINI_API_KEY ?? "";
        // Diagnostics: figures the MODEL flagged vs. crops we actually produced. If
        // flagged>0 but cropped==0 the detection step is broken; if flagged==0 the
        // model isn't identifying the figures (prompt/model side).
        let flagged = 0;
        let cropped = 0;
        let noPage = 0; // flagged figure questions a PDF can't locate (no page index)
        // Cropping runs FIGURE_CROP_CONCURRENCY questions at a time. It used to be a
        // serial for-loop — the only serial stage in the pipeline — and on a
        // figure-heavy paper its up-to-6 vision calls per question dominated the whole
        // import's wall clock. Each question's work is independent (it only mutates its
        // own `q`), and the counters below are safe because single-threaded JS makes
        // `cropped++` indivisible. The renderer is safe to share: its render() is
        // synchronous and memoised per page, so concurrent callers can't interleave
        // inside it and a shared page still rasterizes only once.
        await mapLimit(questions, FIGURE_CROP_CONCURRENCY, async (q) => {
          // Stop starting new work once the client is gone (the old loop walked every
          // remaining question, relying on the inner calls to no-op).
          if (req.signal.aborted) return;
          if (q.is_figure || q.has_diagram || q.options_are_figures) {
            flagged++;
            if (pdf && typeof q.page !== "number") noPage++;
          }
          q.images = await cropQuestionImage(cropCtx, q, coachingId, apiKey, req.signal);
          if (q.images?.length) cropped++;
          // Capture figure(s) drawn inside the worked SOLUTION (tagged type:"explanation"
          // so they render with the solution, not the question). Appended to the same
          // images array — the renderer filters by type. Best-effort like the question crop.
          const solImgs = await cropSolutionImage(cropCtx, q, coachingId, apiKey, req.signal);
          if (solImgs?.length) {
            const imgs = q.images ?? [];
            q.images = [...imgs, ...solImgs.map((im, k) => ({ ...im, index: imgs.length + k }))];
          } else if (q.solution_has_diagram) {
            // A solution figure was expected but none came out — flag for review so the
            // admin pastes it (or confirms the solution is text-only) before saving.
            q.solution_figure_missing = true;
          }
          // Figure MCQs have their choices inside the image, so option text is empty —
          // which the validator would drop. Use each option's label as its text so the
          // A/B/C/D choices survive and render as selectable buttons next to the figure.
          if (q.images?.length && q.question_type === "mcq" && Array.isArray(q.options)) {
            q.options = q.options.map((o) => ({ label: o.label, text: (o.text ?? "").trim() || o.label }));
          }
          // A figure was expected (drawn diagram or picture-options) but no image
          // came out — flag it so the reviewer adds the figure or confirms it's
          // actually text-only, instead of a broken question slipping through silently.
          if ((q.is_figure || q.has_diagram || q.options_are_figures) && !q.images?.length) {
            q.figure_missing = true;
          }
        });
        console.log(
          `[import] figures: ${flagged} flagged, ${cropped} cropped, ${Math.max(0, flagged - cropped)} missed` +
            (noPage ? ` (${noPage} miss(es) had NO page index — unlocatable in the PDF)` : "") +
            ` (source: ${pdf ? (renderer ? "PDF+renderer" : "PDF, renderer FAILED") : `${images.length} image(s)`})`
        );

        // Blind cross-check (always): V4 Pro solves every question from scratch (never
        // shown the answer); the review UI compares its answer to the recorded one (and
        // the verify model's, when on). After cropping so figures feed the solve.
        if (!req.signal.aborted) {
          await generateComparisonSolutions({
            questions,
            // Defaults to V4 Pro (text-based blind solve); the answer-key pass above
            // stays on Gemini because it must read the page images.
            bilingual,
            signal: req.signal,
            onEvent: write,
          });
        }

        // Independent answer verification: re-solve each objective question blind
        // (no answer key shown) and flag any whose answer disagrees with what we
        // captured, so the human reviewer focuses on the questionable ones. Runs
        // after cropping so figure questions carry their figure into the solve.
        // Best-effort — never blocks the import. Skip if the client already left.
        if (wantVerify && !req.signal.aborted) {
          // Objective answers: blind re-solve + disagreement check.
          await verifyAnswers({ questions, model: verifyModel, signal: req.signal, onEvent: write });
          // Subjective model answers: independent quality review (correct/complete?).
          if (!req.signal.aborted) {
            await reviewSubjectiveAnswers({ questions, model: verifyModel, signal: req.signal, onEvent: write });
          }
        }

        // Drop transit-only hints from the payload returned to the client (kept
        // until now so the verify pass could label/locate each question).
        for (const q of questions) {
          delete q.number;
          delete q.is_figure;
          delete q.page;
          delete q.has_diagram;
          delete q.source_image;
          delete q.solution_has_diagram;
          delete q.solution_page;
        }

        // Per-model token/cost summary for this import — logged server-side and
        // sent to the client so the admin sees roughly what the run cost.
        logTokenUsage();
        write({ t: "usage", rows: getTokenUsage() });

        write({ t: "done", exam, set, sections, topicsBySection, questions });
        finish();
      } catch (e) {
        write({ t: "error", error: e instanceof Error ? e.message : "extraction failed" });
        finish();
      }
    },
    cancel() {
      if (beat) clearInterval(beat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Tell any buffering proxy (and Caddy) not to hold the heartbeats back.
      "X-Accel-Buffering": "no",
    },
  });
});
