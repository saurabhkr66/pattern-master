"use client";

import { Trophy, Medal, Award } from "lucide-react";
import { BE } from "@/lib/theme";
import type { LeaderboardEntry } from "./MockDashboardClient";

function fmtTime(secs: number | null): string {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const PODIUM_ICONS = [
  { icon: Trophy, color: "#FFD700" },
  { icon: Medal, color: "#C0C0C0" },
  { icon: Award, color: "#CD7F32" },
];

interface Props {
  topThree: LeaderboardEntry[];
  rest: LeaderboardEntry[];
  pulseRow: string | null;
}

export default function LiveLeaderboard({ topThree, rest, pulseRow }: Props) {
  return (
    <div className="space-y-6">
      {/* ── Podium ─────────────────────────────────────────────────── */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topThree.map((e, i) => {
            const { icon: Icon, color } = PODIUM_ICONS[i];
            const isPulsing = pulseRow === e.sessionId;
            return (
              <div
                key={e.sessionId}
                className="p-4 rounded-xl border flex items-center gap-3 transition-all"
                style={{
                  borderColor: isPulsing ? color : BE.line,
                  background: isPulsing
                    ? `${color}15`
                    : "rgba(255,255,255,0.02)",
                  transform: isPulsing ? "scale(1.02)" : "scale(1)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${color}22`, color }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{ fontSize: 14, fontWeight: 700, color: BE.text }}
                  >
                    {e.name}
                  </div>
                  <div
                    style={{
                      fontFamily: BE.mono,
                      fontSize: 11,
                      color: BE.textMute,
                    }}
                  >
                    {fmtTime(e.timeTakenSecs)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    style={{
                      fontFamily: BE.mono,
                      fontSize: 18,
                      fontWeight: 800,
                      color: BE.text,
                    }}
                  >
                    {e.score.toFixed(1)}
                  </div>
                  <div
                    style={{
                      fontFamily: BE.mono,
                      fontSize: 10,
                      color: BE.textMute,
                    }}
                  >
                    / {e.maxScore}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table (rank 4-100) ─────────────────────────────────────── */}
      {rest.length > 0 && (
        <div>
          <div
            className="grid items-center gap-4 px-3 py-2 text-xs font-semibold"
            style={{
              gridTemplateColumns: "3rem 1fr 6rem 6rem",
              color: BE.textMute,
              borderBottom: `1px solid ${BE.line}`,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Time</span>
            <span className="text-right">Score</span>
          </div>
          <div>
            {rest.map((e) => {
              const isPulsing = pulseRow === e.sessionId;
              return (
                <div
                  key={e.sessionId}
                  className="grid items-center gap-4 px-3 py-2.5 transition-all"
                  style={{
                    gridTemplateColumns: "3rem 1fr 6rem 6rem",
                    borderBottom: `1px solid ${BE.lineSoft}`,
                    background: isPulsing
                      ? "rgba(255,143,0,0.08)"
                      : "transparent",
                  }}
                >
                  <span
                    style={{
                      fontFamily: BE.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: BE.textMute,
                    }}
                  >
                    #{e.rank}
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: BE.text }}
                    className="truncate"
                  >
                    {e.name}
                  </span>
                  <span
                    className="text-right"
                    style={{
                      fontFamily: BE.mono,
                      fontSize: 12,
                      color: BE.textDim,
                    }}
                  >
                    {fmtTime(e.timeTakenSecs)}
                  </span>
                  <span
                    className="text-right"
                    style={{
                      fontFamily: BE.mono,
                      fontSize: 13,
                      fontWeight: 700,
                      color: BE.text,
                    }}
                  >
                    {e.score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
