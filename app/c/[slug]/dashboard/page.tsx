import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug, getCachedActiveTests } from "@/lib/coachingCache";
import { testWindowState } from "@/lib/coachingTestRuntime";
import StudentHeader from "@/components/coaching/StudentHeader";
import RememberCoaching from "@/components/coaching/RememberCoaching";
import TrendChart from "@/components/coaching/TrendChart";
import { Card, AMBER_GRAD, AMBER_GLOW, display, mono } from "@/components/coaching/ui";
import { ClipboardList, Inbox, TrendingUp, Trophy } from "lucide-react";

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
  // The two are independent → fetch in parallel.
  const [tests, attempts] = await Promise.all([
    getCachedActiveTests(coaching.id),
    prisma.testAttempt.findMany({
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
      take: 50, // cap to prevent unbounded fetch as test history grows
    }),
  ]);

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

  // Performance trend: per-test % chronologically (attempts come newest-first),
  // capped to the last 8 so the chart's x-labels stay legible. Same shape as the
  // admin student-detail page so both views tell the same story.
  const pctOf = (score: number | null, max: number | null) =>
    max != null && max > 0 ? Math.round(((score ?? 0) / max) * 100) : 0;
  const chrono = [...past].reverse();
  const trendPoints = chrono
    .slice(-8)
    .map((a, i) => ({ label: `Test ${chrono.length - Math.min(chrono.length, 8) + i + 1}`, pct: pctOf(a.score, a.max_score) }));
  const percents = past.map((a) => pctOf(a.score, a.max_score));
  const avgPct = percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : 0;
  const bestPct = percents.length ? Math.max(...percents) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <RememberCoaching slug={slug} name={coaching.name} />
      <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />

      <main className="relative grid gap-6 p-5 sm:gap-8 sm:p-12 lg:grid-cols-[1.3fr_1fr]">
        {/* Greeting */}
        <div className="flex items-center justify-between lg:col-span-2">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: display }}>
              Hello, {student.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">Ready for your next test?</p>
          </div>
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-500/15 text-lg font-bold text-amber-400"
            style={{ fontFamily: display }}
          >
            {student.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Available tests */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: display }}>
            Available tests
          </h2>
          <div className="space-y-4">
            {available.length === 0 ? (
              <Card>
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-slate-500">
                    <Inbox className="h-7 w-7" />
                  </span>
                  <p className="mt-4 font-semibold text-white">No tests available</p>
                  <p className="mt-1 text-sm text-slate-500">New tests show up here when your tutor assigns them.</p>
                </div>
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
                            {/* Explicit IST: server renders in the VPS timezone (UTC),
                                which would otherwise shift the displayed time. */}
                            <span>
                              opens{" "}
                              {new Date(t.startAt).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {t.windowState === "before" ? (
                      // Pre-start is ENTERABLE: the test page is a waiting room
                      // that prefetches the paper and auto-starts at T-0. Getting
                      // students in here early is what flattens the start spike.
                      <Link
                        href={`/c/${slug}/test/${t.id}`}
                        className="grid h-11 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 text-[15px] font-bold text-amber-400"
                      >
                        Waiting room
                      </Link>
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
          {/* Performance trend — needs ≥2 submitted tests to be a trend. */}
          {trendPoints.length >= 2 && (
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: display }}>
                <TrendingUp className="h-5 w-5 text-amber-400" /> Performance trend
              </h2>
              <Card>
                <div className="px-5 pt-4 sm:px-6">
                  <div className="flex gap-5 text-[13px] text-slate-400" style={{ fontFamily: mono }}>
                    <span>
                      Tests <span className="font-bold text-white">{past.length}</span>
                    </span>
                    <span>
                      Average <span className="font-bold text-white">{avgPct}%</span>
                    </span>
                    <span>
                      Best <span className="font-bold text-amber-400">{bestPct}%</span>
                    </span>
                  </div>
                  <div className="pb-2 pt-3">
                    <TrendChart points={trendPoints} height={140} />
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: display }}>
              Past results
            </h2>
            {past.length > 0 && (
              <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {past.length}
              </span>
            )}
          </div>
          <div className="space-y-4">
            {past.length === 0 ? (
              <Card>
                <p className="px-6 py-8 text-center text-sm text-slate-500">No completed tests yet.</p>
              </Card>
            ) : (
              past.map((a) => {
                const max = a.max_score ?? 0;
                const pct = max > 0 ? Math.round(((a.score ?? 0) / max) * 100) : 0;
                const ringColor = pct >= 66 ? "#34d399" : pct >= 33 ? "#fbbf24" : "#f87171";
                return (
                  // Two sibling links inside one card (never nested — invalid HTML):
                  // the body opens the result, the footer opens the leaderboard.
                  <Card key={a.id}>
                    <Link href={`/c/${slug}/result/${a.id}`} className="block">
                      <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
                        <Ring pct={pct} color={ringColor} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[16px] font-bold text-white">{a.test.title}</div>
                          <div className="mt-1 text-xs text-slate-400" style={{ fontFamily: mono }}>
                            {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="font-bold text-white" style={{ fontFamily: display, fontSize: 24 }}>
                            {a.score ?? 0}
                          </span>
                          <span className="text-[15px] text-slate-400"> / {max}</span>
                        </div>
                      </div>
                    </Link>
                    <Link
                      href={`/c/${slug}/leaderboard/${a.test_id}`}
                      className="flex items-center justify-center gap-1.5 border-t py-2.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/[0.06]"
                      style={{ borderColor: "rgba(255,255,255,0.07)" }}
                    >
                      <Trophy className="h-3.5 w-3.5" /> Leaderboard
                    </Link>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Circular progress ring for a result score (mobile redesign).
function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-white">{pct}%</span>
    </div>
  );
}
