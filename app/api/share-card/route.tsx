// app/api/share-card/route.tsx
// Generates a shareable PNG progress card.
// URL: /api/share-card?userId=<db-user-id>
// Public endpoint — userId is a cuid and acts as the access key.

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Prisma requires Node.js runtime
export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

// ── Colour palette (matches app dark theme) ──────────────────────────────────
const C = {
  bg:       "#07070f",
  surface:  "#0f0f1c",
  border:   "#1c1c33",
  primary:  "#6366f1",
  priLight: "#818cf8",
  text:     "#eeeef8",
  muted:    "#5c5c8a",
  faint:    "#2e2e50",
  // heatmap greens
  h0: "#12121f",
  h1: "#14532d",
  h2: "#15803d",
  h3: "#16a34a",
  h4: "#22c55e",
  orange: "#f97316",
  amber:  "#f59e0b",
  green:  "#22c55e",
};

function heatColor(n: number) {
  if (n === 0)  return C.h0;
  if (n <= 2)   return C.h1;
  if (n <= 5)   return C.h2;
  if (n <= 10)  return C.h3;
  return C.h4;
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Build 12-week heatmap grid (columns = weeks, rows = Mon-Sun) ─────────────
function buildHeatmap(countByDate: Map<string, number>): number[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Go back 83 days so we have exactly 12 weeks (84 cells)
  const cells: number[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    cells.push(countByDate.get(toISO(d)) ?? 0);
  }

  // Split into 12 columns of 7
  const weeks: number[][] = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

// ── Streak (consecutive days ending today or yesterday) ──────────────────────
function computeStreak(dateSet: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);

  // Allow streak to extend from yesterday if nothing done today yet
  if (!dateSet.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(toISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Fonts ────────────────────────────────────────────────────────────────────
// Module-level singleton so the font is fetched only once per Lambda warm start.
let _font400: ArrayBuffer | null = null;
let _font900: ArrayBuffer | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; black: ArrayBuffer }> {
  if (!_font400 || !_font900) {
    const [r400, r900] = await Promise.all([
      fetch("https://fonts.bunny.net/inter/files/inter-latin-400-normal.woff2"),
      fetch("https://fonts.bunny.net/inter/files/inter-latin-900-normal.woff2"),
    ]);
    _font400 = await r400.arrayBuffer();
    _font900 = await r900.arrayBuffer();
  }
  return { regular: _font400, black: _font900 };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  // ── Fetch all data in parallel ───────────────────────────────────────────
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 84);

  const [user, attemptStats, activityRows, totalPatterns] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),

    prisma.attempt.groupBy({
      by: ["is_correct"],
      where: { user_id: userId },
      _count: true,
    }),

    prisma.$queryRaw<{ date: Date | string; count: bigint }[]>`
      SELECT DATE(created_at) AS date, COUNT(*)::bigint AS count
      FROM "Attempt"
      WHERE user_id = ${userId} AND created_at >= ${eightWeeksAgo}
      GROUP BY DATE(created_at)
    `,

    prisma.pattern.count({ where: { exam_type: "GATE", branch: "CSE" } }),
  ]);

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  // ── Derive stats ─────────────────────────────────────────────────────────
  const correctRow   = attemptStats.find((r) => r.is_correct === true);
  const incorrectRow = attemptStats.find((r) => r.is_correct === false);
  const correctCount = correctRow?._count ?? 0;
  const totalCount   = correctCount + (incorrectRow?._count ?? 0);
  const accuracy     = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // Build heatmap data
  const countByDate = new Map<string, number>();
  const dateSet     = new Set<string>();
  for (const row of activityRows) {
    const key = typeof row.date === "string"
      ? row.date.slice(0, 10)
      : toISO(new Date(row.date));
    const n = Number(row.count);
    countByDate.set(key, n);
    if (n > 0) dateSet.add(key);
  }

  const streak = computeStreak(dateSet);
  const weeks  = buildHeatmap(countByDate);

  // Display name: capitalise the part before @
  const handle      = user.email.split("@")[0];
  const displayName = handle.charAt(0).toUpperCase() + handle.slice(1, 18) + (handle.length > 18 ? "…" : "");
  const initial     = handle.charAt(0).toUpperCase();

  const accuracyColor = accuracy >= 70 ? C.green : C.amber;
  const streakColor   = streak > 0 ? C.orange : C.muted;

  // Cell geometry
  const CELL   = 22; // px per cell
  const CGAP   = 4;  // gap between cells
  const cellStep = CELL + CGAP;

  // ── Load fonts ────────────────────────────────────────────────────────────
  let fonts: { regular: ArrayBuffer; black: ArrayBuffer } | null = null;
  try {
    fonts = await loadFonts();
  } catch {
    // If font load fails, continue without — ImageResponse will use fallback
  }

  const fontOptions = fonts
    ? [
        { name: "Inter", data: fonts.regular, weight: 400 as const, style: "normal" as const },
        { name: "Inter", data: fonts.black,   weight: 900 as const, style: "normal" as const },
      ]
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          width:          W,
          height:         H,
          background:     C.bg,
          padding:        "40px 50px",
          fontFamily:     "Inter, sans-serif",
          position:       "relative",
        }}
      >
        {/* Ambient glow behind the heatmap area */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     280,
            background: "radial-gradient(ellipse at 50% 120%, #6366f120 0%, transparent 70%)",
          }}
        />

        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width:        34,
                height:       34,
                borderRadius: 8,
                background:   "linear-gradient(135deg, #4f46e5, #7c3aed)",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontSize:     18,
                color:        "white",
                fontWeight:   900,
              }}
            >
              B
            </div>
            <span style={{ color: C.text, fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>
              Battle<span style={{ color: C.priLight }}>Exam</span>
            </span>
          </div>

          {/* Track pill */}
          <div
            style={{
              background:   "#13132a",
              border:       `1px solid ${C.border}`,
              borderRadius: 8,
              padding:      "6px 16px",
              color:        C.priLight,
              fontSize:     12,
              fontWeight:   900,
              letterSpacing: 1.5,
            }}
          >
            GATE CSE
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, marginBottom: 22 }} />

        {/* ── User info row ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
          {/* Avatar circle */}
          <div
            style={{
              width:          56,
              height:         56,
              borderRadius:   "50%",
              background:     "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       24,
              fontWeight:     900,
              color:          "white",
              flexShrink:     0,
            }}
          >
            {initial}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.text, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
              {displayName}
            </span>
            <span style={{ color: C.muted, fontSize: 13 }}>
              GATE CSE Aspirant · battleexam.com
            </span>
          </div>
        </div>

        {/* ── Stats row (3 cards) ───────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
          {/* Questions answered */}
          <div
            style={{
              flex:         1,
              background:   C.surface,
              border:       `1px solid ${C.border}`,
              borderRadius: 14,
              padding:      "14px 18px",
              display:      "flex",
              flexDirection: "column",
              gap:          5,
            }}
          >
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Questions
            </span>
            <span style={{ color: C.text, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
              {totalCount}
            </span>
            <span style={{ color: C.faint, fontSize: 11 }}>answered total</span>
          </div>

          {/* Accuracy */}
          <div
            style={{
              flex:         1,
              background:   C.surface,
              border:       `1px solid ${C.border}`,
              borderRadius: 14,
              padding:      "14px 18px",
              display:      "flex",
              flexDirection: "column",
              gap:          5,
            }}
          >
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Accuracy
            </span>
            <span style={{ color: accuracyColor, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
              {accuracy}%
            </span>
            <span style={{ color: C.faint, fontSize: 11 }}>{correctCount} correct</span>
          </div>

          {/* Streak */}
          <div
            style={{
              flex:         1,
              background:   C.surface,
              border:       `1px solid ${C.border}`,
              borderRadius: 14,
              padding:      "14px 18px",
              display:      "flex",
              flexDirection: "column",
              gap:          5,
            }}
          >
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Streak
            </span>
            <span style={{ color: streakColor, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
              {streak}
            </span>
            <span style={{ color: C.faint, fontSize: 11 }}>day{streak !== 1 ? "s" : ""} in a row</span>
          </div>

          {/* Patterns explored */}
          <div
            style={{
              flex:         1,
              background:   C.surface,
              border:       `1px solid ${C.border}`,
              borderRadius: 14,
              padding:      "14px 18px",
              display:      "flex",
              flexDirection: "column",
              gap:          5,
            }}
          >
            <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Track
            </span>
            <span style={{ color: C.priLight, fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
              {totalPatterns}
            </span>
            <span style={{ color: C.faint, fontSize: 11 }}>total patterns</span>
          </div>
        </div>

        {/* ── Heatmap section ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Daily Practice — Last 12 Weeks
          </span>

          {/* Grid: columns = weeks, rows = days */}
          <div style={{ display: "flex", gap: CGAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: CGAP }}>
                {week.map((count, di) => (
                  <div
                    key={di}
                    style={{
                      width:        CELL,
                      height:       CELL,
                      borderRadius: 4,
                      background:   heatColor(count),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            marginTop:      "auto",
            paddingTop:     16,
          }}
        >
          <span style={{ color: C.faint, fontSize: 12 }}>battleexam.com</span>
          <span style={{ color: C.faint, fontSize: 12 }}>
            Crack GATE {new Date().getFullYear() + 1} — one pattern at a time
          </span>
        </div>
      </div>
    ),
    {
      width:  W,
      height: H,
      fonts:  fontOptions,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300", // 5-min cache
      },
    }
  );
}
