"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BE } from "@/lib/theme";

// The mode picker's two actions.
//
// Test  → POSTs /start, which creates the DppRun (and resolves the challenge
//         code into challenged_from_id), then navigates to the runner. If an
//         attempt is already under way the route hands that run back instead of
//         minting a second one, so `resumeMinsLeft` relabels the button to match
//         what will actually happen.
// Practice → a plain link, and LOCKED until this student has submitted a run.
//         It creates no row and produces no share code (a reveal-as-you-go score
//         is not comparable to a timed one, so ranking it would be dishonest),
//         but it does show the answers — so it is a review tool that opens after
//         the attempt, never a way to read the key beforehand. The lock is
//         enforced server-side in the practice route; `practiceUnlocked` only
//         decides which of the two tiles below renders.

export default function DppStartButtons({
  dppId,
  questionCount,
  durationMins,
  challengeCode,
  via,
  practiceUnlocked,
  resumeMinsLeft,
}: {
  dppId: string;
  questionCount: number;
  durationMins: number;
  challengeCode: string | null;
  via: string | null;
  practiceUnlocked: boolean;
  /** Minutes left on an attempt already in progress, or null if there is none. */
  resumeMinsLeft: number | null;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startTest() {
    setErr(null);
    setStarting(true);
    try {
      const res = await fetch(`/api/dpp/${dppId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: challengeCode ?? undefined, via: via ?? undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? `Could not start (${res.status})`);
        return;
      }
      router.push(`/dpp/run/${j.runId}`);
    } catch {
      setErr("Network error — check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button
        onClick={startTest}
        disabled={starting}
        style={{
          textAlign: "left",
          padding: "16px 18px",
          borderRadius: 14,
          border: "none",
          background: starting ? BE.line : BE.accent,
          color: starting ? BE.textMute : "#1a1205",
          cursor: starting ? "not-allowed" : "pointer",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800 }}>
          {starting
            ? resumeMinsLeft !== null
              ? "Resuming…"
              : "Starting…"
            : resumeMinsLeft !== null
            ? "Resume test"
            : "Take as Test"}
        </div>
        <div style={{ fontSize: 12.5, marginTop: 3, opacity: 0.85 }}>
          {resumeMinsLeft !== null
            ? `You have an attempt in progress · ${resumeMinsLeft} min left · your answers are still there`
            : `${durationMins} min · ${questionCount} questions · scored, and you can challenge a friend`}
        </div>
      </button>

      {/* Unlocked: a plain link, not a POST — practice creates no run row and
          mints no share code, so there is nothing to start server-side. */}
      {practiceUnlocked ? (
        <Link
          href={`/dpp/${dppId}/practice`}
          style={{
            display: "block",
            textAlign: "left",
            padding: "16px 18px",
            borderRadius: 14,
            border: `1px solid ${BE.line}`,
            background: "transparent",
            color: BE.text,
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800 }}>Practise the questions</div>
          <div style={{ fontSize: 12.5, marginTop: 3, color: BE.textDim }}>
            Untimed · see each answer as you go · not scored or shared
          </div>
        </Link>
      ) : (
        // Locked. The copy says WHY and what opens it, so it reads as a next step
        // rather than an arbitrary restriction — and never hints that the lock is
        // there to stop you reading the answer key early.
        <div
          aria-disabled
          style={{
            textAlign: "left",
            padding: "16px 18px",
            borderRadius: 14,
            border: `1px dashed ${BE.line}`,
            background: "transparent",
            color: BE.textMute,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            Practice <span style={{ fontSize: 12, fontWeight: 600 }}>· locked</span>
          </div>
          <div style={{ fontSize: 12.5, marginTop: 3 }}>
            Take the test once, then come back to work through the questions untimed
            with full solutions.
          </div>
        </div>
      )}

      {err && (
        <div
          style={{
            color: BE.bad,
            background: BE.badSoft,
            border: `1px solid ${BE.bad}`,
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}
