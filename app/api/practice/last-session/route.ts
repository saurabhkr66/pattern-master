// app/api/practice/last-session/route.ts
// Returns the user's most recent practice session: the pattern (subtopic)
// they last practiced, how many questions were attempted in that session
// (last 24h window of that pattern), and their accuracy in that window.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Find the most recent attempt that belongs to a pattern (bank question or PYQ)
  const lastAttempt = await prisma.attempt.findFirst({
    where: {
      user_id: userId,
      OR: [{ question_id: { not: null } }, { pyq_id: { not: null } }],
    },
    orderBy: { created_at: "desc" },
    include: {
      question: { include: { pattern: { select: { id: true, topic_name: true, subject: true } } } },
      pyq:      { include: { pattern: { select: { id: true, topic_name: true, subject: true } } } },
    },
  });

  if (!lastAttempt) return NextResponse.json({ session: null });

  const pattern = lastAttempt.question?.pattern ?? lastAttempt.pyq?.pattern;
  if (!pattern) return NextResponse.json({ session: null });

  // 2. Find the session window: all attempts on this pattern in the last 48h
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const sessionAttempts = await prisma.attempt.findMany({
    where: {
      user_id: userId,
      created_at: { gte: since },
      OR: [
        { question: { pattern_id: pattern.id } },
        { pyq:      { pattern_id: pattern.id } },
      ],
    },
    select: { is_correct: true },
  });

  const total    = sessionAttempts.length;
  const correct  = sessionAttempts.filter(a => a.is_correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return NextResponse.json({
    session: {
      patternId:  pattern.id,
      topicName:  pattern.topic_name,
      subject:    pattern.subject,
      questions:  total,
      accuracy,
      lastAt:     lastAttempt.created_at,
    },
  });
}
