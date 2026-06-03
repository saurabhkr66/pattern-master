import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug, getCachedActiveTests } from "@/lib/coachingCache";
import { testWindowState } from "@/lib/coachingTestRuntime";
import StudentHeader from "@/components/coaching/StudentHeader";
import RememberCoaching from "@/components/coaching/RememberCoaching";
import { Card, Pill, AMBER_GRAD, AMBER_GLOW, display, mono } from "@/components/coaching/ui";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const coaching = await getCachedCoachingBySlug(slug); // Redis-cached
  if (!coaching || !coaching.active) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);

  // Active-tests list is shared across all students → Redis-cached per coaching.
  // This student's own attempts stay a live read (must reflect a just-submitted
  // result immediately, and it's per-student so there's little to share).
  const tests = await getCachedActiveTests(coaching.id);

  const attempts = await prisma.testAttempt.findMany({
    where: { student_id: student.id, coaching_id: coaching.id },
    select: {
      id: true,
      test_id: true,
      status: true,
      score: true,
      max_score: true,
      submitted_at: true,
      test: { select: { title: true } },
    },
    orderBy: { submitted_at: "desc" },
  });

  const attemptByTest = new Map(attempts.map((a) => [a.test_id, a]));

  // Available = active test, window open or upcoming, not yet submitted.
  const available = tests
    .map((t) => {
      const startAt = t.start_at ? new Date(t.start_at) : null;
      const endAt = t.end_at ? new Date(t.end_at) : null;
      const ws = testWindowState(startAt, endAt);
      const att = attemptByTest.get(t.id);
      return {
        id: t.id,
        title: t.title,
        durationMins: Math.round(t.duration_secs / 60),
        questionCount: t.pool_size ?? t.question_count,
        windowState: ws,
        startAt,
        submitted: att?.status === "submitted",
        inProgress: att?.status === "in_progress",
        attemptId: att?.id,
      };
    })
    .filter((t) => !t.submitted && t.windowState !== "after");

  const past = attempts.filter((a) => a.status === "submitted");

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <RememberCoaching slug={slug} name={coaching.name} />
      <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />

      <main className="relative grid gap-8 p-6 sm:p-12 lg:grid-cols-[1.3fr_1fr]">
        {/* Available tests */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-white" style={{ fontFamily: display }}>
            Available tests
          </h2>
          <div className="space-y-4">
            {available.length === 0 ? (
              <Card>
                <p className="px-6 py-8 text-center text-sm text-slate-500">No tests available right now.</p>
              </Card>
            ) : (
              available.map((t) => (
                <Card key={t.id} glow>
                  <div className="flex items-center gap-4 px-6 py-5">
                    <div
                      className="grid h-13 w-13 shrink-0 place-items-center rounded-xl"
                      style={{ height: 52, width: 52, background: "rgba(255,143,0,0.14)", border: "1px solid rgba(255,143,0,0.3)" }}
                    >
                      <ClipboardList className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[17px] font-bold text-white">{t.title}</div>
                      <div className="mt-1.5 flex gap-3 text-[13px] text-slate-400" style={{ fontFamily: mono }}>
                        <span>{t.questionCount} questions</span>
                        <span>·</span>
                        <span>{t.durationMins} min</span>
                        {t.windowState === "before" && t.startAt && (
                          <>
                            <span>·</span>
                            <span>opens {new Date(t.startAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {t.windowState === "before" ? (
                      <span className="rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-slate-400">Not started</span>
                    ) : (
                      <Link
                        href={`/c/${slug}/test/${t.id}`}
                        className="grid h-11 place-items-center rounded-xl px-6 text-[15px] font-bold text-[#1a1205]"
                        style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
                      >
                        {t.inProgress ? "Resume" : "Start"}
                      </Link>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Past results */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-white" style={{ fontFamily: display }}>
            Past results
          </h2>
          <div className="space-y-4">
            {past.length === 0 ? (
              <Card>
                <p className="px-6 py-8 text-center text-sm text-slate-500">No completed tests yet.</p>
              </Card>
            ) : (
              past.map((a) => {
                const max = a.max_score ?? 0;
                const pct = max > 0 ? Math.round(((a.score ?? 0) / max) * 100) : 0;
                const tone = pct >= 66 ? "success" : pct >= 33 ? "amber" : "danger";
                return (
                  <Link key={a.id} href={`/c/${slug}/result/${a.id}`} className="block">
                    <Card>
                      <div className="flex items-center justify-between px-6 py-5">
                        <div>
                          <div className="text-[16px] font-bold text-white">{a.test.title}</div>
                          <div className="mt-1.5 text-[12.5px] text-slate-400" style={{ fontFamily: mono }}>
                            {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white" style={{ fontFamily: display, fontSize: 26 }}>
                            {a.score ?? 0}
                            <span className="text-[17px] text-slate-400"> / {max}</span>
                          </div>
                          <div className="mt-1">
                            <Pill tone={tone}>{pct}%</Pill>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.05]">
                        <div className="h-full" style={{ width: `${pct}%`, background: AMBER_GRAD }} />
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
