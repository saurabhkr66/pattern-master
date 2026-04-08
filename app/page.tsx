// app/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import PatternTable from "@/components/patterns/PatternTable";
import { unstable_cache } from "next/cache";

// Cache pattern list for 60 seconds (patterns rarely change)
const getCachedPatterns = unstable_cache(
  async (userId: string | null) => {
    return prisma.pattern.findMany({
      include: {
        questions: {
          include: {
            attempts: {
              where: userId ? { user_id: userId } : { user_id: "none" },
              orderBy: { created_at: "desc" },
              take: 1,
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { topic_name: "asc" },
    });
  },
  ["patterns-list"],
  { revalidate: 60, tags: ["patterns"] }
);

export default async function Home({ searchParams }: { searchParams: Promise<{ patternId?: string }> }) {
  const { patternId } = await searchParams;
  const { userId } = await auth();

  let patterns: any[] = [];
  let dbError = false;

  try {
    patterns = await getCachedPatterns(userId);
  } catch (err) {
    console.error("Database connection failed:", err);
    dbError = true;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">PREP TRACKER</h1>
        <p className="text-gray-400 font-medium">Master every GATE topic with laser-focused AI questions.</p>
      </header>

      {dbError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <p className="text-red-400 font-bold text-lg mb-2">⚠️ Database Unreachable</p>
          <p className="text-red-300/70 text-sm">Could not connect to the database. Please check your internet connection and refresh the page.</p>
        </div>
      ) : (
        <PatternTable patterns={patterns} highlightPatternId={patternId} />
      )}
    </div>
  );
}