import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getResolvedTestQuestions, studentQuestionsFromBase } from "@/lib/coachingQuestionCache";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { studentInTestBatches } from "@/lib/coachingBatch";
import {
  isR2Configured,
  answerKey,
  answerKeyPrefix,
  presignAnswerPut,
  presignAnswerGets,
} from "@/lib/r2";
import { MAX_SUBJECTIVE_PHOTOS } from "@/lib/subjectiveTypes";

/**
 * Photo-answer uploads for SUBJECTIVE questions on an ASSIGNMENT. Same two
 * actions and the same R2-prefix ownership model as the test upload route, but
 * untimed: there is no per-attempt deadline (assignments aren't timed) — only the
 * assignment's due date (end_at) closes uploads, and the attempt must still be
 * retryable (in_progress, not review_locked).
 */

const ALLOWED_TYPES = new Set(["image/jpeg", "image/webp", "image/png"]);
const MAX_BYTES = 2_000_000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const student = await getCurrentStudent();
    if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!isR2Configured()) {
      return NextResponse.json({ error: "photo uploads are not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }
    const { action, attemptId } = body as { action?: string; attemptId?: string };
    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json({ error: "missing attemptId" }, { status: 400 });
    }

    const attempt = await prisma.testAttempt.findFirst({
      where: { id: attemptId, test_id: testId, student_id: student.id, coaching_id: student.coaching_id },
      select: { id: true, status: true },
    });
    if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });

    const prefix = answerKeyPrefix(student.coaching_id, testId, attemptId);

    if (action === "view") {
      const keys = Array.isArray((body as { keys?: unknown }).keys)
        ? ((body as { keys: unknown[] }).keys.filter((k): k is string => typeof k === "string") as string[])
        : [];
      const own = keys.filter((k) => k.startsWith(prefix)).slice(0, 30);
      const urls = own.length ? await presignAnswerGets(own) : {};
      return NextResponse.json({ urls });
    }

    if (action !== "put") {
      return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }

    // Uploads only while the attempt is still being worked on (not locked).
    if (attempt.status === "review_locked") {
      return NextResponse.json({ error: "already submitted for review" }, { status: 403 });
    }

    const test = await prisma.coachingTest.findFirst({
      where: { id: testId, coaching_id: student.coaching_id },
      select: { id: true, mode: true, status: true, batch_ids: true, end_at: true, questions: true, shuffle: true, pool_size: true },
    });
    if (!test || test.mode !== "assignment") {
      return NextResponse.json({ error: "assignment not found" }, { status: 404 });
    }
    if (test.status !== "active" || !studentInTestBatches(test.batch_ids, student.batch_id)) {
      return NextResponse.json({ error: "assignment not available" }, { status: 403 });
    }
    // Past the due date the assignment is read-only.
    if (testWindowState(null, test.end_at) === "after") {
      return NextResponse.json({ error: "assignment closed" }, { status: 410 });
    }

    const { questionId, index, contentType, sizeBytes } = body as {
      questionId?: string; index?: number; contentType?: string; sizeBytes?: number;
    };
    const idx = Number(index);
    if (!questionId || typeof questionId !== "string") {
      return NextResponse.json({ error: "missing questionId" }, { status: 400 });
    }
    if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_SUBJECTIVE_PHOTOS) {
      return NextResponse.json({ error: `up to ${MAX_SUBJECTIVE_PHOTOS} photos per question` }, { status: 400 });
    }
    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json({ error: "unsupported image type" }, { status: 400 });
    }
    const size = Number(sizeBytes);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      return NextResponse.json({ error: "image too large (max 2MB)" }, { status: 400 });
    }

    // The question must be subjective AND on THIS student's paper.
    const base = await getResolvedTestQuestions(test, student.coaching_id);
    const mine = studentQuestionsFromBase(base, test, student.id);
    const q = mine.find((x) => x.id === questionId);
    if (!q || q.question_type !== "subjective") {
      return NextResponse.json({ error: "not a subjective question on this assignment" }, { status: 400 });
    }

    const key = answerKey(student.coaching_id, testId, attemptId, questionId, idx);
    const url = await presignAnswerPut(key, contentType, size);
    return NextResponse.json({ key, url });
  } catch (err) {
    console.error("assignment upload-answer failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
