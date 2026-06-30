import Link from "next/link";
import { notFound } from "next/navigation";
import { NotebookPen, Plus, Clock, Users } from "lucide-react";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { Card, PageHead, Pill, display, mono } from "@/components/coaching/ui";

export const dynamic = "force-dynamic";

// Untimed homework (CoachingTest.mode = "assignment"). Separated from the Tests
// tab so tutors have a clear home for daily practice that students retry until
// they pass. Creation reuses the test wizard (?mode=assignment).
export default async function HomeworkPage() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-8 text-white">
        <h1 className="text-2xl font-semibold">Homework</h1>
        <p className="mt-2 text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          to manage its homework.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;
  const [assignments, reviewCounts, coaching] = await Promise.all([
    prisma.coachingTest.findMany({
      where: { coaching_id: coachingId, mode: "assignment" },
      select: {
        id: true, title: true, status: true, pass_pct: true, end_at: true,
        questions: true, pool_size: true, _count: { select: { attempts: true } },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    }),
    // Submissions locked for review whose subjective answers still need grading.
    prisma.testAttempt.groupBy({
      by: ["test_id"],
      where: {
        coaching_id: coachingId,
        status: "review_locked",
        grading_status: { in: ["awaiting_teacher", "review"] },
        test: { mode: "assignment" },
      },
      _count: { _all: true },
    }),
    prisma.coaching.findUnique({ where: { id: coachingId }, select: { name: true } }),
  ]);
  if (!coaching) notFound();

  const reviewByTest = new Map(reviewCounts.map((r) => [r.test_id, r._count._all]));

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <div className="flex items-start justify-between gap-4">
        <PageHead title="Homework" sub="Untimed practice — students retry until they pass." />
        <Link
          href="/coaching-admin/tests/new?mode=assignment"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#1a1205] transition hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#ffb43a,#ff8f00)" }}
        >
          <Plus className="h-4 w-4" /> New homework
        </Link>
      </div>

      {assignments.length === 0 ? (
        <Card className="mt-6">
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
              <NotebookPen className="h-8 w-8" />
            </span>
            <p className="mt-4 text-lg font-bold text-white" style={{ fontFamily: display }}>No homework yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Create an assignment students can practise at their own pace and retry until they hit
              your pass threshold.
            </p>
            <Link
              href="/coaching-admin/tests/new?mode=assignment"
              className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#1a1205]"
              style={{ background: "linear-gradient(135deg,#ffb43a,#ff8f00)" }}
            >
              <Plus className="h-4 w-4" /> New homework
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {assignments.map((a) => {
            const qCount = a.pool_size ?? (Array.isArray(a.questions) ? a.questions.length : 0);
            const toReview = reviewByTest.get(a.id) ?? 0;
            return (
              <Link key={a.id} href={`/coaching-admin/tests/${a.id}/results`} className="block">
                <Card className="transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/12 text-amber-400">
                      <NotebookPen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[16px] font-bold text-white">{a.title}</span>
                        <Pill tone={a.status === "active" ? "success" : a.status === "closed" ? "slate" : "amber"}>
                          {a.status}
                        </Pill>
                        {toReview > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            <Clock className="h-3 w-3" /> {toReview} to review
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400" style={{ fontFamily: mono }}>
                        <span>{qCount} questions</span>
                        <span className="text-slate-600">·</span>
                        <span>pass {a.pass_pct ?? 0}%</span>
                        <span className="text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {a._count.attempts} attempted</span>
                        {a.end_at && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span>due {new Date(a.end_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
