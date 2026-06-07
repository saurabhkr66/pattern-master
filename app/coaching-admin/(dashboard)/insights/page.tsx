import Link from "next/link";
import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, UserX } from "lucide-react";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { getCoachingInsights } from "@/lib/coachingInsights";
import { Card, PageHead, Pill, display, mono } from "@/components/coaching/ui";

export const dynamic = "force-dynamic";

// Tone for a weak student's avg% — red if dire, amber if shaky.
function weakTone(avgPct: number): "danger" | "amber" {
  return avgPct < 40 ? "danger" : "amber";
}

export default async function InsightsPage() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-10">
        <PageHead title="Insights" sub="You aren't scoped to a coaching." />
        <p className="text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;
  const { weak, improving, absent } = await getCoachingInsights(coachingId);

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <PageHead title="Insights" sub="Who needs attention, who's improving, who's missing tests" />

      <div className="flex flex-col gap-5">
        {/* Needs attention (weak) */}
        <Section
          icon={<TrendingDown className="h-4 w-4" />}
          tone="bg-red-500/15 text-red-400"
          title="Needs attention"
          subtitle="Lowest average scores"
          empty={weak.length === 0 ? "No submitted tests yet." : null}
        >
          {weak.map((s, i) => (
            <Row key={s.id} id={s.id} name={s.name} last={i === weak.length - 1}>
              <span className="text-xs text-slate-500" style={{ fontFamily: mono }}>
                {s.testsTaken} test{s.testsTaken === 1 ? "" : "s"}
              </span>
              <Pill tone={weakTone(s.avgPct)}>{s.avgPct}% avg</Pill>
            </Row>
          ))}
        </Section>

        {/* Improving */}
        <Section
          icon={<TrendingUp className="h-4 w-4" />}
          tone="bg-emerald-500/15 text-emerald-400"
          title="Improving"
          subtitle="Biggest gain from first to latest test"
          empty={improving.length === 0 ? "Not enough test history yet." : null}
        >
          {improving.map((s, i) => (
            <Row key={s.id} id={s.id} name={s.name} last={i === improving.length - 1}>
              <span className="text-xs text-slate-500" style={{ fontFamily: mono }}>
                {s.from}% → {s.to}%
              </span>
              <Pill tone="success">+{s.delta}%</Pill>
            </Row>
          ))}
        </Section>

        {/* Absent */}
        <Section
          icon={<UserX className="h-4 w-4" />}
          tone="bg-amber-500/15 text-amber-400"
          title="Absent"
          subtitle="Active students who missed closed tests"
          empty={absent.length === 0 ? "Everyone has shown up — no missed tests." : null}
        >
          {absent.map((s, i) => (
            <Row key={s.id} id={s.id} name={s.name} last={i === absent.length - 1}>
              <span className="hidden max-w-[180px] truncate text-xs text-slate-500 sm:inline" title={s.lastMissedTitle}>
                last: {s.lastMissedTitle}
              </span>
              <Pill tone="amber">
                {s.missed} missed
              </Pill>
            </Row>
          ))}
        </Section>
      </div>
    </div>
  );
}

// A titled card with an icon badge; renders an empty state when there are no rows.
function Section({
  icon,
  tone,
  title,
  subtitle,
  empty,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  subtitle: string;
  empty: string | null;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>{icon}</span>
        <div>
          <h2 className="text-base font-bold text-white" style={{ fontFamily: display }}>
            {title}
          </h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {empty ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div>{children}</div>
      )}
    </Card>
  );
}

// A student row that links through to their detail page (deeper trend + history).
function Row({
  id,
  name,
  last,
  children,
}: {
  id: string;
  name: string;
  last: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/coaching-admin/students/${id}`}
      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.03] sm:px-6"
      style={{ borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-400">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-white">{name}</span>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
      <span className="shrink-0 text-slate-600">›</span>
    </Link>
  );
}
