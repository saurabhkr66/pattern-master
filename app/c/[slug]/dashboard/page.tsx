import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug, getCachedActiveTests } from "@/lib/coachingCache";
import { studentInTestBatches } from "@/lib/coachingBatch";
import { testWindowState } from "@/lib/coachingTestRuntime";
import StudentHeader from "@/components/coaching/StudentHeader";
import RememberCoaching from "@/components/coaching/RememberCoaching";
import TrendChart from "@/components/coaching/TrendChart";
import { Card, Pill, AMBER_GRAD, AMBER_GLOW, display, mono } from "@/components/coaching/ui";
import { Calendar, ChevronRight, ClipboardList, Clock, FileText, Inbox, Receipt, TrendingUp, Trophy, XCircle } from "lucide-react";

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

  // Enrollment gate: a code-joined student is "pending" until the tutor approves.
  // Show a status screen (no tests) instead of the dashboard until then. The same
  // gate is enforced server-side on the test start/paper/submit routes.
  if (student.status !== "approved") {
    const rejected = student.status === "rejected";
    return (
      <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
        <div
          className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
          style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
        />
        <RememberCoaching slug={slug} name={coaching.name} />
        <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />
        <main className="relative grid place-items-center p-5 sm:p-12">
          <Card>
            <div className="flex max-w-md flex-col items-center px-8 py-12 text-center">
              <span
                className={`grid h-16 w-16 place-items-center rounded-2xl ${
                  rejected ? "bg-red-500/10 text-red-400" : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {rejected ? <XCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
              </span>
              <h1 className="mt-5 text-xl font-bold text-white" style={{ fontFamily: display }}>
                {rejected ? "Request declined" : "Awaiting approval"}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {rejected
                  ? `Your request to join ${coaching.name} was declined. Please check with your tutor.`
                  : `Your request to join ${coaching.name} is waiting for your tutor's approval. You'll be able to take tests once you're approved.`}
              </p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

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

  // Available = active test, window open or upcoming, not yet submitted, AND
  // (if the test targets specific batches) this student is in one of them. The
  // server start/paper routes enforce the same rule — this just hides what the
  // student can't open.
  const available = tests
    .filter((t) => studentInTestBatches(t.batch_ids, student.batch_id))
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

  // Contextual greeting subtitle: nudge toward the next action, or acknowledge a
  // clean slate when there's nothing pending.
  const subtitle =
    available.length > 0
      ? `You have ${available.length} test${available.length > 1 ? "s" : ""} ready to take.`
      : past.length > 0
        ? "You're all caught up — nice work."
        : "Ready for your next test?";

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <RememberCoaching slug={slug} name={coaching.name} />
      <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />

      <main className="relative mx-auto max-w-6xl px-5 py-7 sm:px-12 sm:py-10">
        {/* Greeting */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-white sm:text-[32px]" style={{ fontFamily: display, letterSpacing: "-0.02em" }}>
              Hello, {student.name} <span className="inline-block">👋</span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 sm:text-[15px]">{subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {coaching.fees_visible_to_students && (
                <Link
                  href={`/c/${slug}/fees`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                >
                  <Receipt className="h-4 w-4 text-amber-400" /> Fees &amp; receipts
                </Link>
              )}
              {coaching.attendance_visible_to_students && (
                <Link
                  href={`/c/${slug}/attendance`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                >
                  <Calendar className="h-4 w-4 text-amber-400" /> Attendance
                </Link>
              )}
            </div>
          </div>
          {/* Solid brand avatar (matches the mockup's filled chip, not an outline). */}
          <div
            className="grid shrink-0 place-items-center rounded-full font-extrabold text-white"
            style={{
              width: 52,
              height: 52,
              fontSize: 20,
              background: AMBER_GRAD,
              boxShadow: `${AMBER_GLOW}, 0 0 0 5px rgba(245,158,11,0.1)`,
              fontFamily: display,
            }}
          >
            {(student.name || "?").charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:gap-8">
          {/* Available tests */}
          <section>
            <h2 className="mb-4 flex items-center gap-2.5 text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: display }}>
              <FileText className="h-5 w-5 text-amber-400" /> Available tests
            </h2>
            <div className="space-y-4">
              {available.length === 0 ? (
                <Card>
                  <div className="relative flex flex-col items-center px-6 py-16 text-center sm:py-24">
                    <span className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: "rgba(255,255,255,0.025)" }}>
                      {/* sparkle rays above the box — small amber strokes, like the mockup */}
                      <svg className="absolute -top-1.5 h-5 w-12" viewBox="0 0 48 20" fill="none">
                        <path d="M10 16 L7 9" stroke="#ff8f00" strokeWidth="2" strokeLinecap="round" />
                        <path d="M24 14 L24 5" stroke="#ff8f00" strokeWidth="2" strokeLinecap="round" />
                        <path d="M38 16 L41 9" stroke="#ff8f00" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <Inbox className="h-9 w-9 text-slate-500" strokeWidth={1.5} />
                    </span>
                    <p className="mt-5 text-[18px] font-bold text-white" style={{ fontFamily: display }}>
                      No tests available
                    </p>
                    <p className="mt-1.5 max-w-[34ch] text-sm text-slate-500">
                      New tests will appear here when your tutor assigns them.
                    </p>
                  </div>
                </Card>
              ) : (
                available.map((t) => (
                  <Card key={t.id} glow className="transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
                      <div
                        className="grid shrink-0 place-items-center rounded-xl"
                        style={{ height: 52, width: 52, background: "rgba(255,143,0,0.14)", border: "1px solid rgba(255,143,0,0.3)" }}
                      >
                        <ClipboardList className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[17px] font-bold text-white">{t.title}</span>
                          {t.inProgress ? (
                            <Pill tone="amber" dot>In progress</Pill>
                          ) : t.windowState === "before" ? (
                            <Pill tone="slate" dot>Opens soon</Pill>
                          ) : (
                            <Pill tone="success" dot>Live</Pill>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-slate-400" style={{ fontFamily: mono }}>
                          <span>{t.questionCount} questions</span>
                          <span className="text-slate-600">·</span>
                          <span>{t.durationMins} min</span>
                          {t.windowState === "before" && t.startAt && (
                            <>
                              <span className="text-slate-600">·</span>
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
                          className="grid h-11 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 text-[15px] font-bold text-amber-400 transition hover:bg-amber-500/[0.16]"
                        >
                          Waiting room
                        </Link>
                      ) : (
                        <Link
                          href={`/c/${slug}/test/${t.id}`}
                          className="grid h-11 shrink-0 place-items-center rounded-xl px-6 text-[15px] font-bold text-[#1a1205] transition hover:brightness-110"
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

          {/* Trend + past results */}
          <section>
            {/* Performance trend + summary stats — shown once there's any history.
                The chart itself only renders with ≥2 points (a single test isn't a
                trend), but the stat strip is useful from the very first result. */}
            {past.length > 0 && (
              <div className="mb-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: display }}>
                    <TrendingUp className="h-5 w-5 text-amber-400" /> Performance trend
                  </h2>
                  {trendPoints.length >= 2 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-semibold text-slate-300">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> Last {trendPoints.length} tests
                    </span>
                  )}
                </div>
                <Card glow>
                  {/* Compact stat strip — colored left accents (blue / purple / green). */}
                  <div className="grid grid-cols-3 gap-2.5 px-4 pt-4 sm:gap-3 sm:px-5">
                    <MiniStat label="Tests" value={past.length} color="#3b82f6" />
                    <MiniStat label="Average" value={`${avgPct}%`} color="#a855f7" />
                    <MiniStat label="Best" value={`${bestPct}%`} color="#22c55e" />
                  </div>
                  {trendPoints.length >= 2 && (
                    <div className="px-3 pb-3 pt-3 sm:px-5">
                      <TrendChart points={trendPoints} height={168} showGrid />
                    </div>
                  )}
                </Card>
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white sm:text-2xl" style={{ fontFamily: display }}>
                  Past results
                </h2>
                {past.length > 0 && (
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                    {past.length}
                  </span>
                )}
              </div>
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
                    // The row body (ring + title + date + score) links to the result;
                    // the Leaderboard is a SIBLING link in the same right-hand column —
                    // never nested, since an anchor inside an anchor is invalid HTML.
                    <Card key={a.id} className="transition-transform duration-200 hover:-translate-y-0.5">
                      <div className="flex items-center gap-4 px-5 py-4 sm:px-6">
                        <Link href={`/c/${slug}/result/${a.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                          <Ring pct={pct} color={ringColor} />
                          <div className="min-w-0">
                            <div className="truncate text-[16px] font-bold text-white">{a.test.title}</div>
                            <div className="mt-1 text-xs text-slate-400" style={{ fontFamily: mono }}>
                              {a.submitted_at
                                ? new Date(a.submitted_at)
                                    .toLocaleString("en-IN", {
                                      timeZone: "Asia/Kolkata",
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })
                                    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase())
                                : ""}
                            </div>
                          </div>
                        </Link>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Link
                            href={`/c/${slug}/result/${a.id}`}
                            className="group flex items-center gap-1.5 leading-none"
                          >
                            <span className="font-bold text-white" style={{ fontFamily: display, fontSize: 24 }}>
                              {a.score ?? 0}
                            </span>
                            <span className="text-[15px] text-slate-400">/ {max}</span>
                            <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
                          </Link>
                          <Link
                            href={`/c/${slug}/leaderboard/${a.test_id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                          >
                            <Trophy className="h-3.5 w-3.5" /> Leaderboard
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// Compact stat tile with a colored left accent bar (mockup: Tests / Average / Best).
function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold leading-none text-white" style={{ fontFamily: display }}>
        {value}
      </div>
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
