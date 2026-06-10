import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import {
  getResolvedTestQuestions,
  studentQuestionsFromBase,
  getCachedTestConfig,
} from "@/lib/coachingQuestionCache";
import { isPastDeadline } from "@/lib/coachingFinalize";
import {
  isR2Configured,
  answerKey,
  answerKeyPrefix,
  presignAnswerPut,
  presignAnswerGets,
} from "@/lib/r2";
import { MAX_SUBJECTIVE_PHOTOS } from "@/lib/subjectiveTypes";

/**
 * Photo-answer uploads for SUBJECTIVE questions. Two actions on one route:
 *
 *  { action: "put", attemptId, questionId, index, contentType, sizeBytes }
 *    → presigned PUT URL + the object key. The browser uploads DIRECTLY to R2;
 *      the app server never proxies image bytes.
 *
 *  { action: "view", attemptId, keys: [...] }
 *    → short-lived signed GET URLs for the student's OWN photos (draft-resume
 *      thumbnails). Keys must sit under this attempt's R2 prefix.
 *
 * Keys are only ever minted under answers/{coaching}/{test}/{attempt}/, so a
 * student can never mint or view another attempt's objects. Submit re-checks
 * the prefix before storing, so foreign keys can't be smuggled in either.
 */

const ALLOWED_TYPES = new Set(["image/jpeg", "image/webp", "image/png"]);
const MAX_BYTES = 2_000_000; // client compresses to ~800KB; hard cap 2MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    // DB-verified session (single-session token) — presigning grants real
    // storage access, so the cheap cookie-only check isn't enough here.
    const student = await getCurrentStudent();
    if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "photo uploads are not configured" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const { action, attemptId } = body as { action?: string; attemptId?: string };
    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json({ error: "missing attemptId" }, { status: 400 });
    }

    // Ownership: the attempt must be this student's, on this test, this tenant.
    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: attemptId,
        test_id: testId,
        student_id: student.id,
        coaching_id: student.coaching_id,
      },
      select: { id: true, status: true, started_at: true },
    });
    if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });

    const prefix = answerKeyPrefix(student.coaching_id, testId, attemptId);

    if (action === "view") {
      const keys = Array.isArray((body as { keys?: unknown }).keys)
        ? ((body as { keys: unknown[] }).keys.filter(
            (k): k is string => typeof k === "string"
          ) as string[])
        : [];
      const own = keys.filter((k) => k.startsWith(prefix)).slice(0, 30);
      const urls = own.length ? await presignAnswerGets(own) : {};
      return NextResponse.json({ urls });
    }

    if (action !== "put") {
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }

    // Uploads only while the attempt is live and inside the deadline (+ the same
    // grace the submit endpoint allows).
    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "attempt already submitted" }, { status: 403 });
    }
    const test = await getCachedTestConfig(testId, student.coaching_id);
    if (!test) return NextResponse.json({ error: "test not found" }, { status: 404 });
    if (
      test.duration_secs != null &&
      isPastDeadline(attempt.started_at, test.duration_secs, test.end_at ?? null)
    ) {
      return NextResponse.json({ error: "time expired" }, { status: 403 });
    }

    const { questionId, index, contentType, sizeBytes } = body as {
      questionId?: string;
      index?: number;
      contentType?: string;
      sizeBytes?: number;
    };
    const idx = Number(index);
    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "missing questionId" }, { status: 400 });
    }
    if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_SUBJECTIVE_PHOTOS) {
      return NextResponse.json(
        { error: `up to ${MAX_SUBJECTIVE_PHOTOS} photos per question` },
        { status: 400 }
      );
    }
    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: "unsupported image type" }, { status: 400 });
    }
    const size = Number(sizeBytes);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      return NextResponse.json({ error: "image too large (max 2MB)" }, { status: 400 });
    }

    // The question must be subjective AND on THIS student's paper (Redis-warm).
    const base = await getResolvedTestQuestions(test, student.coaching_id);
    const mine = studentQuestionsFromBase(base, test, student.id);
    const q = mine.find((x) => x.id === questionId);
    if (!q || q.question_type !== "subjective") {
      return NextResponse.json({ error: "not a subjective question on this test" }, { status: 400 });
    }

    const key = answerKey(student.coaching_id, testId, attemptId, questionId, idx);
    const url = await presignAnswerPut(key, contentType, size);
    return NextResponse.json({ key, url });
  } catch (err) {
    console.error("upload-answer failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
