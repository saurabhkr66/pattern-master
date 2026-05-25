import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FlashcardDeck from "@/components/review/FlashcardDeck";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review – PatternMaster",
  description: "Flashcard review of questions you got wrong.",
};

export default async function ReviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const now = new Date();

  // 1. Find only the LATEST attempt for each question that is WRONG.
  // If the latest attempt is correct, the question is removed from the review deck.
  // Capped at 100 (was 500) — each row carries options+explanation JSON, so
  // 500 cards = ~1.5MB egress per page load. Users rarely review more than
  // a few dozen in one sitting; the next 100 surface on next reload.
  const latestWrongRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT id, is_correct, created_at,
             ROW_NUMBER() OVER (
               PARTITION BY COALESCE(question_id, pyq_id)
               ORDER BY created_at DESC
             ) as rn
      FROM "Attempt"
      WHERE user_id = ${userId} AND mock_question_id IS NULL
    ) t
    WHERE rn = 1 AND is_correct = false
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const ids = latestWrongRows.map((r) => r.id);
  if (ids.length === 0) return (
    <div className="be-screen" style={{ minHeight: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="text-center">
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>All clear!</h1>
        <p style={{ color: 'var(--text-secondary)' }}>You have no uncorrected mistakes to review.</p>
        <Link href="/practice" className="mt-4 inline-block text-amber-500 font-bold">Go practice →</Link>
      </div>
    </div>
  );

  // Fetch wrong attempts first to get the question IDs, then fetch SRS states scoped to only those IDs
  const wrongAttempts = await prisma.attempt.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      question_id: true,
      pyq_id: true,
      created_at: true,
      question: {
        select: {
          question_text: true,
          options: true,
          correct_answer: true,
          explanation: true,
          images: true,
          pattern: { select: { id: true, topic_name: true, subject: true } },
        },
      },
      pyq: {
        select: {
          question_text: true,
          options: true,
          correct_answer: true,
          explanation: true,
          images: true,
          year: true,
          pattern: { select: { id: true, topic_name: true, subject: true } },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const qIds     = wrongAttempts.map(a => a.question_id).filter(Boolean) as string[];
  const pyqIds   = wrongAttempts.map(a => a.pyq_id).filter(Boolean) as string[];

  const srsStates = await prisma.flashcard.findMany({
    where: {
      user_id: userId,
      OR: [
        ...(qIds.length    ? [{ question_id:    { in: qIds    } }] : []),
        ...(pyqIds.length  ? [{ pyq_id:         { in: pyqIds  } }] : []),
      ],
    },
  });

  // Map SRS states by question/pyq id for quick lookup
  const srsMap = new Map<string, (typeof srsStates)[0]>();
  srsStates.forEach(s => {
    if (s.question_id)    srsMap.set(s.question_id, s);
    if (s.pyq_id)         srsMap.set(s.pyq_id, s);
  });

  const cards = wrongAttempts
    .map(a => {
      const q = a.question ?? a.pyq;
      const pattern = a.question?.pattern ?? a.pyq?.pattern ?? null;
      if (!q || !pattern) return null;

      const qId = a.question_id ?? a.pyq_id ?? a.id;
      const srs = srsMap.get(qId);

      return {
        id: qId,
        question_id:    a.question_id    ?? null,
        pyq_id:         a.pyq_id         ?? null,
        question_text:  q.question_text,
        options:        (q.options as string[]) ?? [],
        correct_answer: q.correct_answer,
        explanation:    q.explanation,
        images:         (q.images as any[]) ?? [],
        topic_name:     pattern.topic_name,
        subject:        pattern.subject,
        patternId:      pattern.id,
        ispyq:          !!a.pyq_id,
        year:           "year" in q ? (q.year as number) : undefined,
        // SRS state
        srs: srs ? {
          interval:    srs.interval,
          easeFactor:  srs.ease_factor,
          repetitions: srs.repetitions,
          nextReview:  srs.next_review.toISOString(),
          status:      srs.status,
          lastGrade:   srs.last_grade ?? null,
        } : null,
        isDue: !srs || srs.next_review <= now,
      };
    })
    .filter(Boolean) as any[];

  // Sort: due cards first (new + overdue), then future cards
  const sorted = [
    ...cards.filter((c: any) => c.isDue),
    ...cards.filter((c: any) => !c.isDue),
  ];

  const dueCount = sorted.filter((c: any) => c.isDue).length;
  const newCount = sorted.filter((c: any) => !c.srs).length;

  return (
    <div className="be-screen" style={{ minHeight: "100%" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 20px 100px" }}>
        <FlashcardDeck cards={sorted} dueCount={dueCount} newCount={newCount} />
      </div>
    </div>
  );
}
