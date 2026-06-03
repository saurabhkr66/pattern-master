import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { Card, PageHead, StatCard, Pill, display, mono } from "@/components/coaching/ui";

export const dynamic = "force-dynamic";

const MONTH_LABEL = (d: Date) => d.toLocaleString("en-US", { month: "short" });

export default async function CoachingAdminHome() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-10">
        <PageHead title="Super Admin" sub="You aren't scoped to a coaching." />
        <p className="text-slate-400">
          Manage coachings from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>
          .
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [students, tests, submissionsThisMonth, coaching, monthly, recentAttempts, recentStudents, recentTests] =
    await Promise.all([
      prisma.student.count({ where: { coaching_id: coachingId, active: true } }),
      prisma.coachingTest.count({ where: { coaching_id: coachingId } }),
      prisma.testAttempt.count({
        where: { coaching_id: coachingId, status: "submitted", submitted_at: { gte: monthStart } },
      }),
      prisma.coaching.findUnique({ where: { id: coachingId }, select: { price_per_test: true } }),
      prisma.$queryRaw<{ month: Date; submissions: number }[]>`
        SELECT date_trunc('month', submitted_at) AS month, count(*)::int AS submissions
        FROM "TestAttempt"
        WHERE coaching_id = ${coachingId} AND status = 'submitted' AND submitted_at IS NOT NULL
        GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,
      prisma.testAttempt.findMany({
        where: { coaching_id: coachingId, status: "submitted" },
        select: { id: true, score: true, max_score: true, submitted_at: true, student: { select: { name: true } }, test: { select: { title: true } } },
        orderBy: { submitted_at: "desc" },
        take: 4,
      }),
      prisma.student.findMany({
        where: { coaching_id: coachingId },
        select: { id: true, name: true, phone: true, joined_at: true },
        orderBy: { joined_at: "desc" },
        take: 4,
      }),
      prisma.coachingTest.findMany({
        where: { coaching_id: coachingId },
        select: { id: true, title: true, status: true, created_at: true },
        orderBy: { created_at: "desc" },
        take: 3,
      }),
    ]);

  const price = coaching?.price_per_test ?? 0;
  const amountDue = submissionsThisMonth * price;

  // Build a 6-month series (oldest → newest), zero-filling gaps.
  const buckets: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const hit = monthly.find((m) => {
      const md = new Date(m.month);
      return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth();
    });
    buckets.push({ label: MONTH_LABEL(d), count: hit?.submissions ?? 0 });
  }
  const series = buckets.map((b) => b.count);

  // Activity feed: merge submissions, joins, publishes; newest first.
  type Act = { t: string; s: string; tone: string; when: number };
  const acts: Act[] = [
    ...recentAttempts.map((a) => ({
      t: `${a.student.name} submitted`,
      s: `${a.test.title} · ${a.score ?? 0}/${a.max_score ?? 0}`,
      tone: "success",
      when: a.submitted_at?.getTime() ?? 0,
    })),
    ...recentStudents.map((s) => ({
      t: "New student joined",
      s: `${s.name} · ${s.phone}`,
      tone: "amber",
      when: s.joined_at.getTime(),
    })),
    ...recentTests.map((t) => ({
      t: `Test ${t.status === "active" ? "published" : "created"}`,
      s: t.title,
      tone: "slate",
      when: t.created_at.getTime(),
    })),
  ]
    .sort((a, b) => b.when - a.when)
    .slice(0, 6);

  return (
    <div className="p-10">
      <PageHead title="Dashboard" sub={`Snapshot for ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`} />

      <div className="flex flex-col gap-5 sm:flex-row">
        <StatCard label="Active Students" value={students} accent spark={series} />
        <StatCard label="Tests" value={tests} spark={series} />
        <StatCard label="Submissions (this month)" value={submissionsThisMonth} spark={series} />
        <StatCard label="Amount Due (this month)" value={`₹${amountDue}`} />
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        {/* Submissions chart */}
        <Card className="lg:flex-[1.6]">
          <div className="px-6 py-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: display }}>
                Submissions over time
              </h2>
              <Pill tone="slate">Last 6 months</Pill>
            </div>
            <AreaChart values={series} />
            <div className="mt-3 flex justify-between text-xs text-slate-500" style={{ fontFamily: mono }}>
              {buckets.map((b, i) => (
                <span key={i}>{b.label}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="lg:flex-1">
          <div className="px-6 py-5">
            <h2 className="mb-4 text-lg font-bold text-white" style={{ fontFamily: display }}>
              Recent activity
            </h2>
            {acts.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No activity yet.</p>
            ) : (
              acts.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 py-3"
                  style={{ borderBottom: i < acts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: a.tone === "success" ? "#34d399" : a.tone === "amber" ? "#ff8f00" : "#6b7290" }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{a.t}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">{a.s}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Inline area chart for the 6-month series.
function AreaChart({ values }: { values: number[] }) {
  const W = 560;
  const H = 150;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const pts = values.map((v, i) => [i * step, H - 14 - (v / max) * (H - 34)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(0)} ${y.toFixed(0)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <svg width="100%" height="150" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" x2={W} y1={12 + i * 42} y2={12 + i * 42} stroke="rgba(255,255,255,0.05)" />
      ))}
      <defs>
        <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8f00" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff8f00" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#dashArea)" />
      <path d={line} stroke="#ffab33" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={Math.min(W - 3, Math.max(3, x))} cy={y} r="3.5" fill="#06060c" stroke="#ffab33" strokeWidth="2" />
      ))}
    </svg>
  );
}
