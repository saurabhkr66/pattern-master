import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Released DPPs for one topic, plus this user's best run on each.
//
// Backs the DPP tab in PatternRow, so it is fetched lazily when the tab is
// opened rather than loaded with every topic row. Returns sheet names and
// counts, never question content.
//
// PUBLIC: PatternRow renders this tab on public topic pages with no auth gate,
// and anonymous visitors can now take a DPP (the sign-in wall sits at
// /dpp/claim/[runId], after submit). 401ing here would show a signed-out
// student an error on the one surface that is meant to pull them in. The
// per-user best-run query is simply skipped when there is no session.

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patternId: string }> },
) {
  const { userId } = await auth();

  const { patternId } = await params;

  const dpps = await prisma.dpp.findMany({
    where: { pattern_id: patternId, is_public: true, status: "ready" },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      order: true,
      _count: { select: { questions: true } },
    },
  });

  if (dpps.length === 0) return NextResponse.json({ dpps: [] });

  // Best submitted run per DPP for this user — drives the "8/12 ✓" badge and
  // the Retake vs Start label. Skipped entirely when signed out: there is no
  // user to have runs, and an anonymous run is unclaimed (user_id: null) by
  // definition, so it could never match anyway.
  const runs = userId
    ? await prisma.dppRun.findMany({
        where: {
          user_id: userId,
          status: "submitted",
          dpp_id: { in: dpps.map((d) => d.id) },
        },
        orderBy: [{ score: "desc" }, { time_taken_secs: "asc" }],
        select: { dpp_id: true, score: true, max_score: true, share_code: true },
      })
    : [];

  const best = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!best.has(r.dpp_id)) best.set(r.dpp_id, r);

  return NextResponse.json(
    {
      dpps: dpps.map((d) => {
        const b = best.get(d.id);
        return {
          id: d.id,
          name: d.name,
          questionCount: d._count.questions,
          bestScore: b?.score ?? null,
          bestMaxScore: b?.max_score ?? null,
          bestRunCode: b?.share_code ?? null,
        };
      }),
    },
    // Signed in: per-user (run state), so browser-only — never a shared/CDN
    // cache. Signed out: every field is identical for every anonymous visitor
    // (no run state exists to personalise), so it is safe to share-cache — which
    // matters because this now fires from PUBLIC topic pages. Same split as the
    // guest branch in /api/patterns/[id]/questions.
    {
      headers: {
        "Cache-Control": userId
          ? "private, max-age=0, must-revalidate"
          : "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
