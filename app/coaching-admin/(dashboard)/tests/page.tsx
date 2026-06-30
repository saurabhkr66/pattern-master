import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import TestsClient from "@/components/coaching/TestsClient";

export const dynamic = "force-dynamic";

export default async function TestsPage() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to manage its tests.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;
  const [tests, coaching] = await Promise.all([
    prisma.coachingTest.findMany({
      // Timed tests only — untimed assignments live under the Homework tab.
      where: { coaching_id: coachingId, mode: "test" },
      select: {
        id: true,
        title: true,
        status: true,
        duration_secs: true,
        start_at: true,
        end_at: true,
        questions: true,
        pool_size: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    }),
    prisma.coaching.findUnique({
      where: { id: coachingId },
      select: { name: true, slug: true, join_code: true },
    }),
  ]);
  if (!coaching) notFound();

  return (
    <TestsClient
      initialTests={tests.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        duration_secs: t.duration_secs,
        start_at: t.start_at?.toISOString() ?? null,
        end_at: t.end_at?.toISOString() ?? null,
        questionCount: Array.isArray(t.questions) ? t.questions.length : 0,
        // Pooled tests give each student a random subset, so a fixed total
        // doesn't exist — null makes the share message fall back to question count.
        total_marks:
          t.pool_size == null && Array.isArray(t.questions)
            ? (t.questions as { marks?: number }[]).reduce((s, q) => s + (q?.marks ?? 1), 0)
            : null,
        submissions: t._count.attempts,
      }))}
      coaching={{ name: coaching.name, slug: coaching.slug, joinCode: coaching.join_code }}
    />
  );
}
