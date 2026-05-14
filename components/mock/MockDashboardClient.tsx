"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Trophy, Users, Activity, Clock, ArrowLeft } from "lucide-react";
import { BE } from "@/lib/theme";
import {
  getPusherClient,
  mockChannel,
  PUSHER_EVENTS,
} from "@/lib/pusher-client";
import LiveLeaderboard from "./LiveLeaderboard";
import ScoreDistribution from "./ScoreDistribution";

interface MockMeta {
  id: string;
  title: string;
  exam_type: string;
  branch: string | null;
  total_questions: number;
  max_score: number;
  duration_secs: number;
}

export interface LeaderboardEntry {
  rank: number;
  sessionId: string;
  name: string;
  score: number;
  maxScore: number;
  timeTakenSecs: number | null;
  submittedAt: number;
}

interface Stats {
  submitted: number;
  active: number;
  distribution: Record<string, number>;
}

interface SubmitEvent {
  sessionId: string;
  name: string;
  score: number;
  maxScore: number;
  time: number | null;
  at: number;
  bucket: string;
}

interface Props {
  mock: MockMeta;
  initialLeaderboard: LeaderboardEntry[];
  initialStats: Stats;
}

function compositeScore(score: number, time: number | null): number {
  return score * 1_000_000 - (time ?? 999999);
}

function fmtTime(secs: number | null): string {
  if (secs == null) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function MockDashboardClient({
  mock,
  initialLeaderboard,
  initialStats,
}: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(
    initialLeaderboard
  );
  const [stats, setStats] = useState<Stats>(initialStats);
  const [pulseRow, setPulseRow] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getPusherClient>>["subscribe"]
  > | null>(null);

  // Subscribe to Pusher channel for this mock.
  useEffect(() => {
    const client = getPusherClient();
    if (!client) return;

    const channel = client.subscribe(mockChannel(mock.id));
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", () => setConnected(true));
    channel.bind("pusher:subscription_error", () => setConnected(false));

    channel.bind(PUSHER_EVENTS.SUBMIT, (data: SubmitEvent) => {
      setLeaderboard((prev) => {
        // Replace if same sessionId already exists; otherwise insert.
        const without = prev.filter((e) => e.sessionId !== data.sessionId);
        const merged: LeaderboardEntry[] = [
          ...without,
          {
            rank: 0, // reassigned below
            sessionId: data.sessionId,
            name: data.name,
            score: data.score,
            maxScore: data.maxScore,
            timeTakenSecs: data.time,
            submittedAt: data.at,
          },
        ];
        merged.sort(
          (a, b) =>
            compositeScore(b.score, b.timeTakenSecs) -
            compositeScore(a.score, a.timeTakenSecs)
        );
        return merged.slice(0, 100).map((e, idx) => ({ ...e, rank: idx + 1 }));
      });

      setStats((prev) => ({
        ...prev,
        submitted: prev.submitted + 1,
        active: Math.max(0, prev.active - 1),
        distribution: {
          ...prev.distribution,
          [data.bucket]: (prev.distribution[data.bucket] ?? 0) + 1,
        },
      }));

      // Flash the new row briefly.
      setPulseRow(data.sessionId);
      setTimeout(() => setPulseRow((r) => (r === data.sessionId ? null : r)), 1500);
    });

    channel.bind(PUSHER_EVENTS.ACTIVE, (data: { delta: number }) => {
      setStats((prev) => ({
        ...prev,
        active: Math.max(0, prev.active + (data.delta ?? 0)),
      }));
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(mockChannel(mock.id));
      channelRef.current = null;
    };
  }, [mock.id]);

  // Periodic re-sync of active count (handles drift from expired drafts).
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await fetch(`/api/mock/${mock.id}/leaderboard`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.stats) setStats(data.stats);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(sync, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mock.id]);

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const rest = useMemo(() => leaderboard.slice(3), [leaderboard]);

  return (
    <div
      className="be-screen min-h-screen"
      style={{ background: "var(--bg-base)" }}
    >
      <main className="max-w-6xl mx-auto w-full p-6 md:p-10 space-y-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="space-y-2">
          <Link
            href="/test"
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: BE.textMute, letterSpacing: "0.04em" }}
          >
            <ArrowLeft size={12} /> ALL MOCKS
          </Link>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1
                style={{
                  fontFamily: BE.serif,
                  fontSize: 32,
                  fontWeight: 700,
                  color: BE.text,
                  lineHeight: 1.1,
                }}
              >
                {mock.title}
              </h1>
              <div
                className="mt-2 flex items-center gap-2 text-xs"
                style={{ color: BE.textMute }}
              >
                <span>{mock.exam_type}</span>
                {mock.branch && <span>· {mock.branch}</span>}
                <span>· {mock.total_questions} questions</span>
                <span>· Max {mock.max_score}</span>
              </div>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: connected ? BE.goodSoft : BE.warnSoft,
                color: connected ? BE.good : BE.warn,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: connected ? BE.good : BE.warn,
                  animation: connected ? "pulse 1.6s ease-in-out infinite" : undefined,
                }}
              />
              {connected ? "LIVE" : "CONNECTING…"}
            </div>
          </div>
        </header>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Trophy size={16} />}
            label="Submitted"
            value={stats.submitted.toLocaleString()}
            color={BE.accent}
          />
          <StatCard
            icon={<Activity size={16} />}
            label="Taking now"
            value={stats.active.toLocaleString()}
            color={BE.good}
          />
          <StatCard
            icon={<Users size={16} />}
            label="Top score"
            value={
              leaderboard[0]
                ? `${leaderboard[0].score.toFixed(1)} / ${leaderboard[0].maxScore}`
                : "—"
            }
            color={BE.text}
          />
          <StatCard
            icon={<Clock size={16} />}
            label="Fastest"
            value={
              leaderboard[0]?.timeTakenSecs != null
                ? fmtTime(leaderboard[0].timeTakenSecs)
                : "—"
            }
            color={BE.textDim}
          />
        </section>

        {/* ── Score distribution ─────────────────────────────────────── */}
        <section className="be-card p-6">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: BE.textMute,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 16,
            }}
          >
            Score Distribution
          </div>
          <ScoreDistribution distribution={stats.distribution} />
        </section>

        {/* ── Leaderboard ────────────────────────────────────────────── */}
        <section className="be-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: BE.textMute,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Top 100 Leaderboard
            </div>
            <div style={{ fontSize: 11, color: BE.textMute }}>
              Updates live · ranked by score then time
            </div>
          </div>
          {leaderboard.length === 0 ? (
            <div
              className="py-10 text-center"
              style={{ color: BE.textMute, fontSize: 13 }}
            >
              No submissions yet. Be the first to take the test.
            </div>
          ) : (
            <LiveLeaderboard
              topThree={topThree}
              rest={rest}
              pulseRow={pulseRow}
            />
          )}
        </section>
      </main>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        borderColor: BE.line,
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div
        className="flex items-center gap-1.5 mb-2"
        style={{
          color,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {icon} {label}
      </div>
      <div
        style={{
          fontFamily: BE.mono,
          fontSize: 22,
          fontWeight: 700,
          color: BE.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
