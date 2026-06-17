import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { extractQuestions, cropQuestionImage, cropSolutionImage, verifyAnswers, reviewSubjectiveAnswers, resetTokenUsage, getTokenUsage, logTokenUsage, type UploadImage, type ImportQType } from "@/lib/coachingImport";
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

  // Independent answer verification is the costly pass — it runs the (Pro-class)
  // verify model on every objective question. Opt-in per import: off by default
  // since flash-lite extraction is reliable on easy papers, and the admin flips
  // it on only for hard papers where a wrong answer key is expensive.
  const wantVerify = String(form.get("verify") ?? "") === "1";

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
        for (const q of questions) {
          if (q.is_figure || q.has_diagram || q.options_are_figures) flagged++;
          q.images = await cropQuestionImage(cropCtx, q, coachingId, apiKey, req.signal);
          if (q.images?.length) cropped++;
          // Capture a figure drawn inside the worked SOLUTION (tagged type:"explanation"
          // so it renders with the solution, not the question). Appended to the same
          // images array — the renderer filters by type. Best-effort like the question crop.
          const solImg = await cropSolutionImage(cropCtx, q, coachingId, apiKey, req.signal);
          if (solImg) {
            const imgs = q.images ?? [];
            q.images = [...imgs, { ...solImg, index: imgs.length }];
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
        }
        console.log(
          `[import] figures: ${flagged} flagged by model, ${cropped} cropped ` +
            `(source: ${pdf ? (renderer ? "PDF+renderer" : "PDF, renderer FAILED") : `${images.length} image(s)`})`
        );

        // Independent answer verification: re-solve each objective question blind
        // (no answer key shown) and flag any whose answer disagrees with what we
        // captured, so the human reviewer focuses on the questionable ones. Runs
        // after cropping so figure questions carry their figure into the solve.
        // Best-effort — never blocks the import. Skip if the client already left.
        if (wantVerify && !req.signal.aborted) {
          // Objective answers: blind re-solve + disagreement check.
          await verifyAnswers({ questions, signal: req.signal, onEvent: write });
          // Subjective model answers: independent quality review (correct/complete?).
          if (!req.signal.aborted) {
            await reviewSubjectiveAnswers({ questions, signal: req.signal, onEvent: write });
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
