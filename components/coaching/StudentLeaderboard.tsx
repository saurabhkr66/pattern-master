import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Card, AMBER_GRAD, AMBER_GLOW, display, mono } from "@/components/coaching/ui";
import type { LeaderboardEntry } from "@/lib/coachingLeaderboard";

// Server component — a static ranked snapshot, no interactivity. Reuses the
// student-facing dark/amber theme (see the dashboard). The current student's row
// is highlighted, and their rank is summarised up top so they don't have to scan.

const MEDAL: Record<number, { ring: string; bg: string; label: string }> = {
  1: { ring: "#fcd34d", bg: "rgba(252,211,77,0.12)", label: "🥇" },
  2: { ring: "#cbd5e1", bg: "rgba(203,213,225,0.10)", label: "🥈" },
  3: { ring: "#d8a06b", bg: "rgba(216,160,107,0.12)", label: "🥉" },
};

function fmtTime(secs: number | null): string {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function pctOf(score: number, max: number): number {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

export default function StudentLeaderboard({
  testTitle,
  entries,
  currentStudentId,
  dashboardHref,
}: {
  testTitle: string;
  entries: LeaderboardEntry[];
  currentStudentId: string;
  dashboardHref: string;
}) {
  const me = entries.find((e) => e.studentId === currentStudentId);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />

      <main className="relative mx-auto w-full max-w-2xl p-5 sm:p-10">
        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
            style={{ background: AMBER_GRAD, boxShadow: AMBER_GLOW }}
          >
            <Trophy className="h-6 w-6 text-[#1a1205]" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: display }}>
              Leaderboard
            </h1>
            <p className="mt-0.5 truncate text-sm text-slate-400">{testTitle}</p>
          </div>
        </div>

        {/* Your rank summary */}
        {me && (
          <div className="mt-5">
            <Card glow>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="text-sm text-slate-400">Your rank</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-amber-400" style={{ fontFamily: display, fontSize: 26 }}>
                    #{me.rank}
                  </span>
                  <span className="text-sm text-slate-400">of {entries.length}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Ranked list */}
        <div className="mt-5 space-y-2.5">
          {entries.length === 0 ? (
            <Card>
              <p className="px-6 py-10 text-center text-sm text-slate-500">
                No submissions yet — be the first to take this test.
              </p>
            </Card>
          ) : (
            entries.map((e) => {
              const isMe = e.studentId === currentStudentId;
              const medal = MEDAL[e.rank];
              const pct = pctOf(e.score, e.maxScore);
              return (
                <div
                  key={e.studentId}
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 sm:px-5"
                  style={{
                    borderColor: isMe ? "rgba(255,143,0,0.45)" : "rgba(255,255,255,0.07)",
                    background: isMe ? "rgba(255,143,0,0.08)" : "rgba(255,255,255,0.025)",
                  }}
                >
                  {/* Rank / medal */}
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold"
                    style={
                      medal
                        ? { background: medal.bg, color: medal.ring, fontFamily: display }
                        : { background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontFamily: display }
                    }
                  >
                    {medal ? medal.label : e.rank}
                  </span>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-white">
                      {e.name}
                      {isMe && <span className="ml-2 text-xs font-medium text-amber-400">You</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500" style={{ fontFamily: mono }}>
                      {pct}% · {fmtTime(e.timeTakenSecs)}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <span className="font-bold text-white" style={{ fontFamily: display, fontSize: 19 }}>
                      {e.score}
                    </span>
                    <span className="text-[13px] text-slate-500"> / {e.maxScore}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
