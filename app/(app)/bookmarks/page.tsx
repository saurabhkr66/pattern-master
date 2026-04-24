import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import BookmarkLog from "@/components/review/BookmarkLog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bookmarks – PatternMaster",
  description: "Revisit your saved questions and patterns.",
};

async function getCachedBookmarks(userId: string) {
  return unstable_cache(
    async () => {
      const bookmarks = await prisma.bookmark.findMany({
        where: { user_id: userId },
        include: {
          question: {
            include: {
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
            },
          },
          pyq: {
            include: {
              pattern: { select: { id: true, topic_name: true, subject: true, exam_type: true } },
            },
          },
          subject_pyq: {
            include: { subject_pattern: { select: { id: true, subject_name: true } } },
          },
        },
        orderBy: { created_at: "desc" },
      });

      return bookmarks.map((b) => {
        const q = b.question ?? b.pyq ?? b.subject_pyq;
        const sp = b.subject_pyq?.subject_pattern;
        const pattern =
          b.question?.pattern ??
          b.pyq?.pattern ??
          (sp
            ? { id: sp.id, topic_name: sp.subject_name, subject: sp.subject_name, exam_type: "GATE" }
            : null);
        
        if (!q || !pattern) return null;

        const qId = b.question_id ?? b.pyq_id ?? b.subject_pyq_id;

        return {
          id: qId,
          bookmarkId: b.id,
          question_text: q.question_text,
          options: (q.options as any[]) ?? [],
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          topic_name: pattern.topic_name,
          subject: pattern.subject,
          patternId: pattern.id,
          ispyq: !!b.pyq_id || !!b.subject_pyq_id,
          year: "year" in q ? (q.year as number) : undefined,
          created_at: b.created_at.toISOString(),
          practiceUrl: `/practice?patternId=${pattern.id}&questionId=${qId}&subject=${encodeURIComponent(pattern.subject)}`,
        };
      }).filter(Boolean);
    },
    [`bookmarks-v1-${userId}`],
    { revalidate: 60, tags: ["bookmarks"] }
  )();
}

export default async function BookmarksPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const cards = await getCachedBookmarks(userId);

  return (
    <div className="be-screen" style={{ minHeight: "100%" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 100px" }}>
        <BookmarkLog cards={cards as any[]} />
      </div>
    </div>
  );
}
