import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// OG card for a DPP challenge link.
//
// Public and exempted from Clerk in middleware.ts — WhatsApp/Twitter/Slack
// crawlers carry no session, and a link with no preview card converts far worse.
// This is the loop's conversion surface, not decoration.
//
// The run code is the access key (same model as app/api/share-card/route.tsx).
// A guessed code renders a first name and a score — nothing else, and no
// question content ever.

export const runtime = "nodejs"; // Prisma
export const dynamic = "force-dynamic";

const C = {
  bg: "#0a0a0b",
  card: "#141416",
  line: "#26262b",
  text: "#f4f4f5",
  dim: "#a1a1aa",
  mute: "#71717a",
  accent: "#ff8f00",
};

function fmtTime(secs: number | null): string | null {
  if (!secs || secs < 1) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("run") ?? "";

  let name = "A student";
  let score = 0;
  let maxScore = 0;
  let dppName = "Daily Practice Problems";
  let topic = "";
  let questionCount = 0;
  let time: string | null = null;
  let found = false;

  if (code && code.length <= 32) {
    const run = await prisma.dppRun.findFirst({
      where: { share_code: code, status: "submitted" },
      select: {
        user_id: true,
        score: true,
        max_score: true,
        time_taken_secs: true,
        dpp: {
          select: {
            name: true,
            is_public: true,
            status: true,
            pattern: { select: { topic_name: true, exam_type: true } },
            _count: { select: { questions: true } },
          },
        },
      },
    });

    if (run && run.dpp.is_public && run.dpp.status === "ready") {
      found = true;
      score = run.score ?? 0;
      maxScore = run.max_score ?? 0;
      dppName = run.dpp.name;
      topic = `${run.dpp.pattern.exam_type} · ${run.dpp.pattern.topic_name}`;
      questionCount = run.dpp._count.questions;
      time = fmtTime(run.time_taken_secs);

      // Derived at render time, never stored on the run — so nothing
      // attacker-controlled reaches this image.
      // An empty id just misses, which keeps the "A student" fallback below —
      // run.user_id is only ever null for an unclaimed run, and an unclaimed
      // run has no share_code to have been looked up by in the first place.
      const u = await prisma.user.findUnique({
        where: { id: run.user_id ?? "" },
        select: { email: true },
      });
      const handle = u?.email?.split("@")[0] ?? "";
      if (handle) name = handle.charAt(0).toUpperCase() + handle.slice(1, 18);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: C.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
              color: "#1a1205",
            }}
          >
            B
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>BattleExam</div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          {found ? (
            <>
              <div style={{ fontSize: 30, color: C.dim, display: "flex" }}>
                {name} challenged you
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
                <div style={{ fontSize: 132, fontWeight: 800, color: C.accent, lineHeight: 1 }}>
                  {score}
                </div>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: C.dim,
                    lineHeight: 1.4,
                    marginLeft: 6,
                  }}
                >
                  /{maxScore}
                </div>
                {time && (
                  <div style={{ fontSize: 28, color: C.mute, lineHeight: 2.6, marginLeft: 26 }}>
                    in {time}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, color: C.text, marginTop: 18 }}>
                {dppName}
              </div>
              <div style={{ fontSize: 26, color: C.dim, marginTop: 8, display: "flex" }}>
                {topic}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, fontWeight: 800, color: C.text, display: "flex" }}>
                Daily Practice Problems
              </div>
              <div style={{ fontSize: 30, color: C.dim, marginTop: 14, display: "flex" }}>
                Short curated sets. Beat your friends.
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${C.line}`,
            paddingTop: 22,
          }}
        >
          <div style={{ fontSize: 24, color: C.mute, display: "flex" }}>
            {found ? `${questionCount} questions · no negative marking` : "battleexam.com"}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1a1205",
              background: C.accent,
              padding: "12px 24px",
              borderRadius: 10,
              display: "flex",
            }}
          >
            {found ? "Can you beat it?" : "Start free"}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // A submitted run is immutable, so this can be cached hard — one render
        // per shared link no matter how many times it is previewed.
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
