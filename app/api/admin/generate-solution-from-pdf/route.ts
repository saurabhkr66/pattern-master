import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/admin";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ─────────────────────────────────────────────────────────────────────────────
// HYBRID STRATEGY: PDF sent once, streaming output parsed question-by-question.
// PDF is uploaded once → single API call with all questions → streamed response
// is parsed in real-time → each answer saved to DB as soon as its block ends.
// Best of all worlds: 1× PDF cost, no truncation risk, real-time progress.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  if (!isAdmin(user?.emailAddresses?.[0]?.emailAddress?.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!genAI) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  // ── Parse multipart form ──────────────────────────────────────────────────
  const formData = await req.formData();
  const mockTestId = formData.get("mockTestId") as string | null;
  const pdfFile = formData.get("pdf") as File | null;

  if (!mockTestId || !pdfFile) {
    return NextResponse.json({ error: "mockTestId and pdf are required" }, { status: 400 });
  }

  // ── Fetch the mock test template ──────────────────────────────────────────
  const template = await prisma.mockTestTemplate.findUnique({ where: { id: mockTestId } });
  if (!template) {
    return NextResponse.json({ error: "Mock test not found" }, { status: 404 });
  }

  const allQuestions = (template.questions as any[]) || [];
  const missingQuestions = allQuestions.filter(
    (q) => !q.explanation || q.explanation.trim() === ""
  );

  if (missingQuestions.length === 0) {
    return NextResponse.json({
      message: "All questions already have explanations.",
      total: 0, fixed: 0, failed: 0,
    });
  }

  // ── Upload PDF ONCE via Files API ─────────────────────────────────────────
  let pdfFileUri: string;
  let pdfMimeType: string;
  try {
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfBytes);
    const uploadResult = await fileManager.uploadFile(pdfBuffer, {
      mimeType: "application/pdf",
      displayName: pdfFile.name || "reference-solution.pdf",
    });
    pdfFileUri = uploadResult.file.uri;
    pdfMimeType = uploadResult.file.mimeType;
    console.log(`[PDF-SOLUTION] ✅ PDF uploaded → ${pdfFileUri} (${(pdfBytes.byteLength / 1024).toFixed(0)} KB)`);
  } catch (uploadErr: any) {
    console.error("[PDF-SOLUTION] File upload failed:", uploadErr);
    return NextResponse.json({ error: `Failed to upload PDF: ${uploadErr.message}` }, { status: 500 });
  }

  // ── Stream NDJSON progress back to the client ─────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      send({ type: "start", total: missingQuestions.length, title: template.title });

      // ── Build label maps (Q1..QN) over ALL missing questions ──────────────
      // Labels are stable across batches so the client's progress index lines up.
      const indexToId: Record<string, string> = {};
      const indexToLetter: Record<string, string> = {};

      const formatQuestion = (q: any, label: string) => {
        indexToId[label] = q.id;
        const options: string[] = Array.isArray(q.options) ? q.options : [];
        const rawAnswer = q.correct_answer ?? "";
        let correctLetter = "";
        if (/^[A-D]$/i.test(String(rawAnswer))) {
          correctLetter = String(rawAnswer).toUpperCase();
        } else {
          const oIdx = options.indexOf(rawAnswer);
          if (oIdx >= 0) correctLetter = String.fromCharCode(65 + oIdx);
        }
        indexToLetter[label] = correctLetter;

        return [
          `LABEL: ${label}`,
          `QUESTION: ${q.question_text || ""}`,
          `OPTIONS: ${options.map((o, oIdx) => `${String.fromCharCode(65 + oIdx)}. ${o}`).join(" | ")}`,
          `CORRECT_OPTION: ${correctLetter || "(see PDF)"}`,
        ].join("\n");
      };

      // Pre-populate label maps so client progress events have stable indexes.
      missingQuestions.forEach((q, i) => formatQuestion(q, `Q${i + 1}`));

      const buildBatchPrompt = (questionsText: string) =>
        `The attached PDF is the official answer key / solution booklet for this exam paper.

Your workflow for EACH question:
  STEP 1 → Scan the PDF and locate the solution for that question number.
  STEP 2 → Understand the approach, method, and key steps shown in the PDF.
  STEP 3 → Write the explanation in your OWN words based on what you read. Do NOT copy from the PDF verbatim.

STRICT RULES:
1. Your explanation MUST be derived from the PDF solution whenever it is present in the PDF.
2. If a question's solution cannot be found in the PDF, write a brief 3-line explanation using standard textbook concepts.
3. The CORRECT_OPTION field tells you which answer is correct. Your explanation must lead logically to it.
4. LENGTH LIMIT: Maximum 100 words per explanation. Stop after the key insight is clear. Do not add extra context, history, or background.
5. Use LaTeX for all math: inline $...$ and block $$...$$.  e.g. $\\frac{n}{2}$ or $$\\sum_{i=1}^{n} i$$
6. Do NOT state "Therefore option X is correct" or similar at the end.
7. Do NOT open with filler like "The question asks..." or "We need to find...".
8. The SOURCE line is REQUIRED and must be the FIRST line inside every block:
     - "SOURCE: PDF"      → you found this question's solution in the PDF and rewrote it
     - "SOURCE: FALLBACK" → solution NOT in the PDF; you used general/textbook knowledge

OUTPUT FORMAT — output this block for EVERY question, using its exact label:
===START:Q1===
SOURCE: PDF
<your 4-6 line explanation>
===END:Q1===

QUESTIONS:
${questionsText}`;

      let fixed = 0;
      let failed = 0;
      let cumInput = 0;
      let cumOutput = 0;
      let cumThoughts = 0;

      // Pro requires thinking; cap at 4096 — enough for 5-question batches without runaway.
      const model = genAI!.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0,
          // @ts-ignore — Pro requires thinkingBudget ≥ 128; cap so it can't starve output on a 5-Q batch
          thinkingConfig: { thinkingBudget: 4096 },
        },
      });

      // ── Chunk into batches of 5; PDF fileUri is reused across calls ──────
      const BATCH_SIZE = 5;
      const batches: any[][] = [];
      for (let i = 0; i < missingQuestions.length; i += BATCH_SIZE) {
        batches.push(missingQuestions.slice(i, i + BATCH_SIZE));
      }
      console.log(`[PDF-SOLUTION] Processing ${missingQuestions.length} questions in ${batches.length} batches of ${BATCH_SIZE}`);

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const batchLabels = batch.map((_, i) => `Q${batchIdx * BATCH_SIZE + i + 1}`);
        const questionsText = batch
          .map((q, i) => {
            const label = batchLabels[i];
            // Re-format to ensure label maps are populated (idempotent).
            return formatQuestion(q, label);
          })
          .join("\n\n");

        const batchPrompt = buildBatchPrompt(questionsText);
        console.log(`[PDF-SOLUTION] Batch ${batchIdx + 1}/${batches.length}: labels ${batchLabels.join(", ")}`);

        try {
          const streamResult = await model.generateContentStream({
            contents: [{
              role: "user",
              parts: [
                { fileData: { fileUri: pdfFileUri, mimeType: pdfMimeType } },
                { text: batchPrompt },
              ],
            }],
          });

          let textBuffer = "";
          let fullRawText = "";
          const processedLabels = new Set<string>();

          for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            textBuffer += chunkText;
            fullRawText += chunkText;

            // ── Parse completed blocks as they arrive ──────────────────────────
            // Invariant: only trim the buffer AFTER successfully consuming a block,
            // otherwise an incomplete ===START: marker gets corrupted.
            let lastConsumed = 0;

            while (true) {
              const startIdx = textBuffer.indexOf("===START:", lastConsumed);
              if (startIdx === -1) break;

              const labelClose = textBuffer.indexOf("===", startIdx + 9);
              if (labelClose === -1) break;

              const label = textBuffer.substring(startIdx + 9, labelClose).trim().replace(/\s/g, "");
              if (!label || processedLabels.has(label)) {
                lastConsumed = labelClose + 3;
                continue;
              }

              const endMarker = `===END:${label}===`;
              const endIdx = textBuffer.indexOf(endMarker, labelClose + 3);
              if (endIdx === -1) break;

              const blockContent = textBuffer.substring(labelClose + 3, endIdx).trim();
              const afterEnd = endIdx + endMarker.length;

              const realId = indexToId[label];
              if (realId && blockContent) {
                const qData = missingQuestions.find(q => q.id === realId);
                send({
                  type: "progress",
                  index: Object.keys(indexToId).indexOf(label),
                  questionId: realId,
                  questionText: (qData?.question_text || "").substring(0, 100),
                });

                try {
                  // Parse and strip the leading SOURCE marker.
                  let pdfSourced = true; // default: assume PDF unless marker says FALLBACK
                  let bodyText = blockContent;
                  const sourceMatch = blockContent.match(/^\s*SOURCE:\s*(PDF|FALLBACK)\s*\r?\n/i);
                  if (sourceMatch) {
                    pdfSourced = sourceMatch[1].toUpperCase() === "PDF";
                    bodyText = blockContent.slice(sourceMatch[0].length);
                  }

                  const cleanExplanation = bodyText
                    .replace(/(Therefore|Hence|So|Thus),?\s*(the)?\s*(correct)?\s*(option|answer)\s*(is)?\s*:?\s*[A-D]\.?/gi, "")
                    .replace(/Correct (option|answer) is\s*[A-D]\.?/gi, "")
                    .replace(/(Option|Answer)\s*[A-D]\s*is\s*(correct|the right answer)\.?/gi, "")
                    .replace(/^```(markdown|latex)?\s*/i, "")
                    .replace(/```\s*$/, "")
                    .trim();

                  const aiDetectedAnswer = indexToLetter[label] || null;
                  const isMismatch = false;

                  const patchJson = JSON.stringify({
                    explanation: cleanExplanation,
                    ai_answer_mismatch: isMismatch,
                    ai_detected_answer: aiDetectedAnswer,
                    pdf_sourced: pdfSourced,
                  });

                  await prisma.$executeRaw`
                    UPDATE "MockTestTemplate"
                    SET questions = (
                      SELECT jsonb_agg(
                        CASE WHEN elem->>'id' = ${realId}
                        THEN elem || ${patchJson}::jsonb
                        ELSE elem
                        END
                      )
                      FROM jsonb_array_elements(questions) AS elem
                    )
                    WHERE id = ${mockTestId}
                  `;

                  fixed++;
                  send({
                    type: "result",
                    questionId: realId,
                    status: "ok",
                    explanation: cleanExplanation,
                    isMismatch,
                    aiDetectedAnswer,
                    pdfSourced,
                    fixed,
                    failed,
                  });
                } catch (saveErr: any) {
                  failed++;
                  console.error(`[PDF-SOLUTION] DB save failed for ${label}:`, saveErr);
                  send({ type: "result", questionId: realId, status: "fail", error: saveErr.message, fixed, failed });
                }
                processedLabels.add(label);
                lastConsumed = afterEnd;
              } else {
                lastConsumed = afterEnd;
              }
            }

            if (lastConsumed > 0) {
              textBuffer = textBuffer.substring(lastConsumed);
            }
          }

          // ── Per-batch token usage ─────────────────────────────────────────
          const finalUsage = (await streamResult.response).usageMetadata;
          const thoughtsTokens = (finalUsage as any)?.thoughtsTokenCount || 0;
          cumInput += finalUsage?.promptTokenCount || 0;
          cumOutput += finalUsage?.candidatesTokenCount || 0;
          cumThoughts += thoughtsTokens;
          console.log(
            `[PDF-SOLUTION] Batch ${batchIdx + 1} done — processed ${processedLabels.size}/${batch.length} | ` +
            `tokens In: ${finalUsage?.promptTokenCount}, Out: ${finalUsage?.candidatesTokenCount}, Thoughts: ${thoughtsTokens}`
          );

          // Stream cumulative totals after each batch so the UI updates live.
          send({
            type: "batch_tokens",
            tokens: { input: cumInput, output: cumOutput, thoughts: cumThoughts },
          });

          // Any label in this batch that didn't produce a block → mark failed
          for (const q of batch) {
            const label = batchLabels[batch.indexOf(q)];
            if (!processedLabels.has(label)) {
              failed++;
              console.warn(`[PDF-SOLUTION] No block produced for ${label} (id=${q.id})`);
              send({ type: "result", questionId: q.id, status: "fail", error: "No explanation produced for this question", fixed, failed });
            }
          }

        } catch (batchErr: any) {
          console.error(`[PDF-SOLUTION] Batch ${batchIdx + 1} failed:`, batchErr);
          // Mark every question in this batch as failed but keep going to next batch
          for (const q of batch) {
            failed++;
            send({ type: "result", questionId: q.id, status: "fail", error: batchErr.message, fixed, failed });
          }
        }
      } // end batches loop

      // ── Clean up the uploaded file ─────────────────────────────────────────
      try {
        const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
        const fileName = pdfFileUri.split("/").slice(-2).join("/");
        await fileManager.deleteFile(fileName);
        console.log(`[PDF-SOLUTION] 🗑️  Cleaned up: ${fileName}`);
      } catch {
        // Non-fatal
      }

      send({ type: "done", fixed, failed, total: missingQuestions.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
