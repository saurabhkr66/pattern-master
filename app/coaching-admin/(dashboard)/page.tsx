import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Users, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { Card, PageHead, Pill, StatCard, display, mono } from "@/components/coaching/ui";

export const dynamic = "force-dynamic";

const MONTH_LABEL = (d: Date) => d.toLocaleString("en-US", { month: "short" });

function timeAgo(ms: number): string {
  if (!ms) return "";
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(ms).toLocaleDateString();
}

type Activity = { t: string; s: string; tone: string; when: number };
type DashboardData = {
  students: number;
  tests: number;
  submissionsThisMonth: number;
  // Billing is super-admin-only — the owner dashboard shows operational KPIs, not money.
  pendingApprovals: number;
  series: number[];
  buckets: { label: string; count: number }[];
  acts: Activity[];
};

// The dashboard is an at-a-glance overview, so its 8 aggregate queries are
// cached for 60s per coaching. Up-to-a-minute staleness is fine, and a warm
// cache absorbs exam-day dashboard refreshes instead of re-hitting Neon on each
// load. Time-based only (no submit-path invalidation) ON PURPOSE: during a
// batch's auto-submit spike the cache stays warm rather than being busted on
// every submission — which is exactly when the protection matters most.
//
// All Date columns are consumed into primitives (epoch ms / strings) HERE,
// before unstable_cache JSON-serializes the result, so the rendered output
// never calls .getTime() on a post-cache string.
const getDashboardData = (coachingId: string) =>
  unstable_cache(
    async (): Promise<DashboardData> => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [students, tests, submissionsThisMonth, pendingApprovals, monthly, recentAttempts, recentStudents, recentTests] =
        await Promise.all([
          prisma.student.count({ where: { coaching_id: coachingId, active: true } }),
          prisma.coachingTest.count({ where: { coaching_id: coachingId } }),
          prisma.testAttempt.count({
            where: { coaching_id: coachingId, status: "submitted", submitted_at: { gte: monthStart } },
          }),
          // Owner-actionable KPI in place of the (super-admin-only) billing tile:
          // how many code-joined students are waiting for the owner to approve.
          prisma.student.count({
            where: { coaching_id: coachingId, active: true, status: "pending" },
          }),
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
      const acts: Activity[] = [
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

      return {
        students,
        tests,
        submissionsThisMonth,
        pendingApprovals,
        series,
        buckets,
        acts,
      };
    },
    // coachingId is a closure, not an arg — it MUST be in the key parts, or all
    // coachings would share one cache entry.
    ["coaching-dashboard", coachingId],
    { revalidate: 60, tags: [`coaching-dash:${coachingId}`] }
  )();

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

  const { students, tests, submissionsThisMonth, pendingApprovals, series, buckets, acts } =
    await getDashboardData(coachingId);

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <PageHead title="Dashboard" sub={`Snapshot · ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`} />

      {/* KPI tiles — 2×2 on mobile, a row on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={<Users className="h-[22px] w-[22px]" />} iconColor="#f59e0b" value={students} label="Active Students" spark={series} />
        <StatCard icon={<ClipboardList className="h-[22px] w-[22px]" />} iconColor="#3b82f6" value={tests} label="Tests" spark={series} />
        <StatCard icon={<CheckCircle2 className="h-[22px] w-[22px]" />} iconColor="#22c55e" value={submissionsThisMonth} label="Submissions" sub="this month" spark={series} />
        <StatCard icon={<Clock className="h-[22px] w-[22px]" />} iconColor="#fbbf24" value={pendingApprovals} label="Pending Approvals" sub="awaiting you" />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:gap-5">
        {/* Submissions chart — desktop only; mobile keeps to tiles + feed (per design) */}
        <Card className="hidden lg:block lg:flex-[1.6]">
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
          <div className="px-5 py-5 sm:px-6">
            <h2 className="mb-3 text-base font-bold text-white sm:text-lg" style={{ fontFamily: display }}>
              Recent activity
            </h2>
            {acts.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ul>
                {acts.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 py-2.5"
                    style={{ borderBottom: i < acts.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: a.tone === "success" ? "#34d399" : a.tone === "amber" ? "#ff8f00" : "#6b7290" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">
                        <span className="font-semibold">{a.t}</span>{" "}
                        <span className="text-slate-400">{a.s}</span>
                      </p>
                      <span className="text-xs text-slate-500">{timeAgo(a.when)}</span>
                    </div>
                  </li>
                ))}
              </ul>
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
