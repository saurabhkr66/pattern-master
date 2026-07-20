import { NextRequest, NextResponse } from "next/server";
import ImageKit, { toFile } from "@imagekit/nodejs";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";
import { invalidateMockTemplate } from "@/lib/mockTemplate";
import { getImageUrl } from "@/lib/imageUtils";
import { refOf, withRef, verifyMockImages } from "@/lib/mockImageAudit";

// ImageKit upload needs the Node runtime; the live HEAD re-check needs no cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // a pasted figure screenshot is tiny
const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

/** GET — the mock's questions that still have a broken image, re-verified live. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ mockId: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { mockId } = await ctx.params;

  const mock = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { id: true, title: true, exam_type: true, branch: true, questions: true },
  });
  if (!mock) return NextResponse.json({ error: "mock not found" }, { status: 404 });

  const questions = Array.isArray(mock.questions) ? (mock.questions as unknown[]) : [];
  const broken = await verifyMockImages(questions);

  return NextResponse.json({
    mock: { id: mock.id, title: mock.title, exam_type: mock.exam_type, branch: mock.branch },
    totalQuestions: questions.length,
    questions: broken,
  });
}

/**
 * DELETE — strip broken image refs from the mock, single or batch.
 * JSON body: { items: [{ qIndex, imgIndex, expectedRef }] }
 *
 * This is the COMMON repair: most broken refs are vestigial screenshots the
 * scraper attached to questions whose text already stands alone, so the fix is to
 * drop the ref rather than paste a duplicate of the stem.
 *
 * Every removal is verified against expectedRef before it happens, and removals
 * within a question are applied HIGHEST INDEX FIRST — splicing low-to-high would
 * shift the later indices and delete the wrong entries.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ mockId: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { mockId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as
    | { items?: { qIndex: number; imgIndex: number; expectedRef: string }[] }
    | null;
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "no items provided" }, { status: 400 });
  }

  const mock = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { questions: true },
  });
  if (!mock) return NextResponse.json({ error: "mock not found" }, { status: 404 });

  const questions = Array.isArray(mock.questions) ? [...(mock.questions as unknown[])] : [];

  // Group by question, then splice descending so earlier indices stay valid.
  const byQuestion = new Map<number, typeof items>();
  for (const it of items) {
    if (!Number.isInteger(it?.qIndex) || !Number.isInteger(it?.imgIndex)) {
      return NextResponse.json({ error: "bad qIndex/imgIndex" }, { status: 400 });
    }
    byQuestion.set(it.qIndex, [...(byQuestion.get(it.qIndex) ?? []), it]);
  }

  let removed = 0;
  for (const [qIndex, group] of byQuestion) {
    const question = questions[qIndex] as Record<string, unknown> | undefined;
    if (!question || !Array.isArray(question.images)) {
      return NextResponse.json({ error: `question ${qIndex} has no images` }, { status: 404 });
    }
    const images = [...(question.images as unknown[])];

    // Verify the whole group BEFORE mutating, so a stale entry can't leave the
    // question half-edited.
    for (const it of group) {
      if (it.imgIndex >= images.length) {
        return NextResponse.json({ error: `image index out of range on q${qIndex}` }, { status: 404 });
      }
      if (refOf(images[it.imgIndex]) !== it.expectedRef) {
        return NextResponse.json(
          { error: "images changed since you loaded the page — reload and retry" },
          { status: 409 }
        );
      }
    }

    for (const it of [...group].sort((a, b) => b.imgIndex - a.imgIndex)) {
      images.splice(it.imgIndex, 1);
      removed++;
    }
    questions[qIndex] = { ...question, images };
  }

  await prisma.mockTestTemplate.update({
    where: { id: mockId },
    data: { questions: questions as never },
  });
  await invalidateMockTemplate(mockId);

  return NextResponse.json({ ok: true, removed });
}

/**
 * POST — replace ONE broken image with a pasted screenshot.
 * multipart: image (File), qIndex (number), imgIndex (number), expectedRef (string)
 *
 * expectedRef is an optimistic-concurrency guard: the client sends the ref it
 * rendered, and the write is refused if the DB no longer matches. Without it, two
 * admins working the same mock (or one with a stale tab) would silently overwrite
 * each other, since the whole questions JSON is rewritten on every save.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ mockId: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { mockId } = await ctx.params;

  const form = await req.formData();
  const entry = form.get("image");
  const qIndex = Number(form.get("qIndex"));
  const imgIndex = Number(form.get("imgIndex"));
  const expectedRef = form.get("expectedRef");

  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "no image provided" }, { status: 400 });
  }
  if (!entry.type.startsWith("image/")) {
    return NextResponse.json({ error: "file must be an image" }, { status: 400 });
  }
  if (entry.size > MAX_BYTES) {
    return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
  }
  if (!Number.isInteger(qIndex) || !Number.isInteger(imgIndex) || qIndex < 0 || imgIndex < 0) {
    return NextResponse.json({ error: "bad qIndex/imgIndex" }, { status: 400 });
  }

  const mock = await prisma.mockTestTemplate.findUnique({
    where: { id: mockId },
    select: { questions: true, exam_type: true },
  });
  if (!mock) return NextResponse.json({ error: "mock not found" }, { status: 404 });

  const questions = Array.isArray(mock.questions) ? [...(mock.questions as unknown[])] : [];
  const question = questions[qIndex] as Record<string, unknown> | undefined;
  const images = Array.isArray(question?.images) ? [...(question!.images as unknown[])] : null;
  if (!question || !images || imgIndex >= images.length) {
    return NextResponse.json({ error: "question/image index out of range" }, { status: 404 });
  }

  const currentRef = refOf(images[imgIndex]);
  if (typeof expectedRef === "string" && expectedRef && currentRef !== expectedRef) {
    return NextResponse.json(
      { error: "image changed since you loaded the page — reload and retry", currentRef },
      { status: 409 }
    );
  }

  // Upload first: if this fails we haven't touched the DB.
  const ext = entry.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  let url: string | null = null;
  try {
    const fileName = `mock-${mockId}-q${qIndex}-${imgIndex}-${globalThis.crypto.randomUUID()}.${ext}`;
    const file = await toFile(Buffer.from(await entry.arrayBuffer()), fileName);
    const result = await ik.files.upload({
      file,
      fileName,
      folder: "/pattern-master/mock-repairs",
      useUniqueFileName: true,
    });
    url = result.url ?? null;
  } catch (e) {
    const err = e as { message?: string; status?: number; body?: unknown };
    console.error("[mock-images] upload failed:", {
      message: err?.message,
      status: err?.status,
      body: err?.body,
      privateKeyPresent: !!process.env.IMAGEKIT_PRIVATE_KEY,
    });
  }
  if (!url) return NextResponse.json({ error: "upload failed" }, { status: 502 });

  // Store the absolute ImageKit URL. getImageUrl() passes full https URLs through
  // untouched, so the repaired ref renders without needing the slug convention
  // that the original (now-missing) path followed.
  images[imgIndex] = withRef(images[imgIndex], url);
  questions[qIndex] = { ...question, images };

  await prisma.mockTestTemplate.update({
    where: { id: mockId },
    data: { questions: questions as never },
  });

  // The mock-template Redis cache has NO TTL — without this the app keeps serving
  // the broken ref indefinitely.
  await invalidateMockTemplate(mockId);

  return NextResponse.json({ ok: true, ref: url, url: getImageUrl(url) });
}
