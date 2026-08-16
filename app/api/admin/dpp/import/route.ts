import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";
import { adaptToDppQuestion } from "@/lib/dppAdapter";
import {
  extractQuestions,
  cropQuestionImage,
  cropSolutionImage,
  verifyAnswers,
  generateComparisonSolutions,
  resetTokenUsage,
  getTokenUsage,
  logTokenUsage,
  mapLimit,
  FIGURE_CROP_CONCURRENCY,
  type UploadImage,
} from "@/lib/coachingImport";
import { pdfPageRenderer } from "@/lib/pdfRaster";
import sharp from "sharp";

// PDF/image import into an existing DPP. A near-copy of
// app/api/coaching/questions/import/route.ts — see docs/dpp-implementation-plan.md §2b.
//
// Three differences from the coaching route:
//   1. Auth is isAdminRequest() (Clerk session EMAIL, never userId).
//   2. The target is a DPP, so there is no exam/set/section catalog — the parent
//      Pattern supplies the topic, and qtype is forced to objective.
//   3. It WRITES the extracted rows straight to DppQuestion as unreviewed, then
//      the admin reviews them in the editor. The coaching flow keeps review state
//      in React, where a refresh discards a 300-second extraction; persisting is
//      what makes that impossible here.

// sharp + Gemini SDK need the Node runtime (not edge).
export const runtime = "nodejs";
// Vision extraction over a full sheet routinely runs into minutes.
export const maxDuration = 300;

const MAX_IMAGES = 25;
const MAX_IMAGE_EDGE = Number(process.env.COACHING_IMPORT_MAX_IMAGE_EDGE) || 2200;
const INLINE_WARN_BYTES = 15_000_000;

async function fileToUpload(file: File): Promise<UploadImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  return { mimeType: file.type || "application/octet-stream", base64: buf.toString("base64") };
}

/** Downscale a page photo before inlining — see the coaching route for why the
 *  full media prefix is re-sent on every extraction call. */
async function imageToUpload(file: File): Promise<UploadImage> {
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const out = await sharp(buf)
      .rotate()
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

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const dppId = String(form.get("dppId") ?? "").trim();
  if (!dppId) return NextResponse.json({ error: "dppId is required" }, { status: 400 });

  const dpp = await prisma.dpp.findUnique({
    where: { id: dppId },
    select: {
      id: true,
      name: true,
      pattern: { select: { topic_name: true, subject: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!dpp) return NextResponse.json({ error: "DPP not found" }, { status: 404 });

  const wantVerify = String(form.get("verify") ?? "") === "1";
  // Every requested model is re-validated server-side against its allowlist
  // (resolveVerifyModel / resolveGenerationModel / resolveCompareModel), so an
  // unknown or hostile id falls back to the default rather than being trusted.
  const verifyModel = String(form.get("verifyModel") ?? "").trim() || undefined;
  const answerModel = String(form.get("answerModel") ?? "").trim() || undefined;
  const compareModel = String(form.get("compareModel") ?? "").trim() || undefined;
  const allowDeepSeek = String(form.get("deepseek") ?? "1") !== "0";
  const bilingual = String(form.get("hindi") ?? "") === "1";

  const imageFiles = form
    .getAll("images")
    .filter((f): f is File => f instanceof File)
    .slice(0, MAX_IMAGES);
  const pdfEntry = form.get("pdf");
  const pdfFile = pdfEntry instanceof File ? pdfEntry : null;
  if (imageFiles.length === 0 && !pdfFile) {
    return NextResponse.json({ error: "upload at least one image or a PDF" }, { status: 400 });
  }

  const images = await Promise.all(imageFiles.map(imageToUpload));
  const pdf = pdfFile ? await fileToUpload(pdfFile) : undefined;
  if (images.length) {
    const inlineBytes = images.reduce((n, i) => n + i.base64.length, 0);
    if (inlineBytes > INLINE_WARN_BYTES) {
      console.warn(
        `[dpp-import] ⚠ inlined images ≈${(inlineBytes / 1e6).toFixed(1)}MB — near the body limit`,
      );
    }
  }

  // NDJSON stream: the extraction runs well past Cloudflare's 100s origin cap, so
  // the status is committed to 200 immediately and progress, the final payload AND
  // failures all travel in the body. A bare "\n" heartbeat keeps proxies awake.
  let beat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;
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
        resetTokenUsage();
        const questions = await extractQuestions({
          images,
          pdf,
          // No section catalog for a DPP — the parent Pattern is the whole scope.
          sections: [],
          // A DPP has no subjective questions; DppQuestion has no rubric columns
          // and the adapter rejects them, so constrain the prompt up front.
          qtype: "objective",
          bilingual,
          answerModel,
          topics: [dpp.pattern.topic_name],
          signal: req.signal,
          onEvent: write,
        });

        if (req.signal.aborted) {
          write({ t: "error", error: "client disconnected" });
          finish();
          return;
        }

        write({ t: "phase", phase: "cropping", total: questions.length });

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
        // Figures land in their own folder, separate from coaching imports.
        const imageFolder = `dpp/${dppId}`;

        await Promise.all([
          (async () => {
            await mapLimit(questions, FIGURE_CROP_CONCURRENCY, async (q) => {
              if (req.signal.aborted) return;
              q.images = await cropQuestionImage(cropCtx, q, imageFolder, apiKey, req.signal);
              const solImgs = await cropSolutionImage(cropCtx, q, imageFolder, apiKey, req.signal);
              if (solImgs?.length) {
                const imgs = q.images ?? [];
                q.images = [...imgs, ...solImgs.map((im, k) => ({ ...im, index: imgs.length + k }))];
              }
              // Figure MCQs carry their choices inside the image, so option text is
              // empty — which the validator would drop. Fall back to the label so
              // the choices survive as selectable buttons beside the figure.
              if (
                q.images?.length &&
                (q.question_type === "mcq" || q.question_type === "msq") &&
                Array.isArray(q.options)
              ) {
                q.options = q.options.map((o) => ({
                  label: o.label,
                  text: (o.text ?? "").trim() || o.label,
                }));
              }
              if ((q.is_figure || q.has_diagram || q.options_are_figures) && !q.images?.length) {
                q.figure_missing = true;
              }
            });
          })(),
          (async () => {
            if (!req.signal.aborted) {
              await generateComparisonSolutions({
                questions,
                primaryModel: compareModel,
                allowDeepSeek,
                bilingual,
                signal: req.signal,
                onEvent: write,
                phase: "text-only",
              });
            }
          })(),
        ]);

        if (!req.signal.aborted) {
          await generateComparisonSolutions({
            questions,
            primaryModel: compareModel,
            allowDeepSeek,
            bilingual,
            signal: req.signal,
            onEvent: write,
            phase: "post-crop",
          });
        }

        if (wantVerify && !req.signal.aborted) {
          await verifyAnswers({
            questions,
            model: verifyModel,
            allowDeepSeek,
            signal: req.signal,
            onEvent: write,
          });
        }

        logTokenUsage();
        write({ t: "usage", rows: getTokenUsage() });

        // ── Persist ────────────────────────────────────────────────────────────
        // Unlike the coaching flow, rows go to the DB now rather than back to a
        // React review step: a refresh must not discard a 300-second extraction.
        // They land unreviewed, carrying their flags, and the editor is the review
        // surface.
        write({ t: "phase", phase: "saving", total: questions.length });

        const start = dpp._count.questions;
        let saved = 0;
        const skipped: { index: number; error: string }[] = [];

        for (let i = 0; i < questions.length; i++) {
          if (req.signal.aborted) break;
          const q = questions[i];
          const { error, data } = adaptToDppQuestion(q as unknown as Record<string, unknown>);
          if (error || !data) {
            // A single unusable row must not sink an expensive extraction — record
            // it and keep the rest. (The paste path is all-or-nothing because it's
            // cheap to resubmit; a 300-second AI run is not.)
            skipped.push({ index: i, error: error ?? "invalid" });
            continue;
          }
          await prisma.dppQuestion.create({
            data: {
              ...data,
              dpp_id: dppId,
              order: start + saved + 1,
              source: "pdf_import",
              reviewed: false,
              // Re-asserted after the adapter spread: these are the evidence the
              // reviewer adjudicates a disputed answer with, and verify_answer in
              // particular is what answer_disputed is raised from.
              answer_disputed: q.answer_disputed ?? null,
              blind_answer: q.blind_answer ?? null,
              verify_answer: q.verify_answer ?? null,
              figure_missing: q.figure_missing ?? null,
            },
            select: { id: true },
          });
          saved++;
        }

        await prisma.dpp.update({ where: { id: dppId }, data: { updated_at: new Date() } });
        // Question set changed → drop the cached answer-free paper (lib/dppPaper).
        revalidateTag(`dpp-${dppId}`, "max");

        write({ t: "done", saved, skipped, total: questions.length, dppId });
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
}
