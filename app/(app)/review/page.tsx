import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import FlashcardDeck from "@/components/review/FlashcardDeck";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review – PatternMaster",
  description: "Flashcard review of questions you got wrong.",
};

export default async function ReviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const wrongAttempts = await prisma.attempt.findMany({
    where: { user_id: userId, is_correct: false },
    include: {
      question: { include: { pattern: true } },
      pyq: { include: { pattern: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const seen = new Set<string>();
  const cards = wrongAttempts
    .filter((a) => {
      const key = a.question_id ?? a.pyq_id ?? a.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => {
      const q = a.question ?? a.pyq;
      const pattern = a.question?.pattern ?? a.pyq?.pattern;
      if (!q || !pattern) return null;
      return {
        id: a.question_id ?? a.pyq_id ?? a.id,
        question_text: q.question_text,
        options: (q.options as string[]) ?? [],
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        topic_name: pattern.topic_name,
        subject: pattern.subject,
        patternId: pattern.id,
        ispyq: !!a.pyq_id,
        year: "year" in q ? (q.year as number) : undefined,
      };
    })
    .filter(Boolean) as any[];

  return (
    <div className="max-w-3xl mx-auto py-8 md:py-12 px-4">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
            Flashcard Review
          </h1>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-600/10 text-indigo-600 uppercase tracking-widest">
            {cards.length} cards
          </span>
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Tap a card to reveal the answer. Use Prev / Next to navigate.
        </p>
      </header>

      <FlashcardDeck cards={cards} />
    </div>
  );
}
