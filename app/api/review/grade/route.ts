import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type Grade = "again" | "hard" | "good" | "easy";

// SuperMemo-2 inspired algorithm
function computeSM2(
  interval: number,
  easeFactor: number,
  repetitions: number,
  grade: Grade
) {
  let newInterval = interval;
  let newEase = easeFactor;
  let newReps = repetitions;
  let status = "learning";

  switch (grade) {
    case "again":
      // Forgot — reset, show again soon
      newInterval = 0;
      newEase = Math.max(1.3, easeFactor - 0.2);
      newReps = 0;
      status = "lapsed";
      break;

    case "hard":
      // Struggled — small interval increase, lower ease
      newInterval = Math.max(1, Math.ceil(interval * 1.2));
      newEase = Math.max(1.3, easeFactor - 0.15);
      newReps = repetitions + 1;
      status = newReps >= 3 ? "review" : "learning";
      break;

    case "good":
      // Standard progression
      if (repetitions === 0) newInterval = 1;
      else if (repetitions === 1) newInterval = 6;
      else newInterval = Math.ceil(interval * easeFactor);
      newReps = repetitions + 1;
      status = newReps >= 3 ? "review" : "learning";
      break;

    case "easy":
      // Confident — big interval jump, boost ease
      if (repetitions === 0) newInterval = 4;
      else newInterval = Math.ceil(interval * easeFactor * 1.3);
      newEase = Math.min(3.0, easeFactor + 0.15);
      newReps = repetitions + 1;
      status = "review";
      break;
  }

  const nextReview = new Date();
  if (newInterval === 0) {
    // "Again" — show again in ~10 minutes within this session
    nextReview.setMinutes(nextReview.getMinutes() + 10);
  } else {
    nextReview.setDate(nextReview.getDate() + newInterval);
  }

  return { interval: newInterval, easeFactor: newEase, repetitions: newReps, nextReview, status };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { questionId, pyqId, grade } = body as {
      questionId?: string;
      pyqId?: string;
      grade: Grade;
    };

    if (!grade || !["again", "hard", "good", "easy"].includes(grade)) {
      return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
    }
    if (!questionId && !pyqId) {
      return NextResponse.json({ error: "No question ID provided" }, { status: 400 });
    }

    // Build the unique where clause
    const whereClause = questionId
      ? { user_id_question_id: { user_id: userId, question_id: questionId } }
      : { user_id_pyq_id: { user_id: userId, pyq_id: pyqId! } };

    // Fetch existing card state (or defaults for new card)
    let existing = await prisma.flashcard.findUnique({ where: whereClause as any });

    const prev = existing
      ? { interval: existing.interval, easeFactor: existing.ease_factor, repetitions: existing.repetitions }
      : { interval: 0, easeFactor: 2.5, repetitions: 0 };

    const { interval, easeFactor, repetitions, nextReview, status } = computeSM2(
      prev.interval,
      prev.easeFactor,
      prev.repetitions,
      grade
    );

    // Upsert the flashcard state
    const data = {
      user_id: userId,
      question_id: questionId ?? null,
      pyq_id: pyqId ?? null,
      interval,
      ease_factor: easeFactor,
      repetitions,
      next_review: nextReview,
      status,
      last_grade: grade,
    };

    const flashcard = await prisma.flashcard.upsert({
      where: whereClause as any,
      create: data,
      update: {
        interval,
        ease_factor: easeFactor,
        repetitions,
        next_review: nextReview,
        status,
        last_grade: grade,
      },
    });

    return NextResponse.json({
      ok: true,
      interval,
      nextReview,
      status,
      repetitions,
    }, { status: 200 });
  } catch (err) {
    console.error("[review/grade]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
