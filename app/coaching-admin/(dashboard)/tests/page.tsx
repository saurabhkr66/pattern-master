import Link from "next/link";
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
  const tests = await prisma.coachingTest.findMany({
    where: { coaching_id: coachingId },
    select: {
      id: true,
      title: true,
      status: true,
      duration_secs: true,
      start_at: true,
      end_at: true,
      questions: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

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
        submissions: t._count.attempts,
      }))}
    />
  );
}
