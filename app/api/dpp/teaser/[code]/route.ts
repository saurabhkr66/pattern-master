import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

// The ONLY publicly readable DPP endpoint.
//
// Returns the four teaser facts a challenge link needs — challenger's name,
// their score, the topic, and the question count — and nothing else. No question
// text, no options, no explanations. This exists so a WhatsApp preview and the
// landing page can make the pitch before the sign-in wall.
//
// The run code is the access key, the same model app/api/share-card/route.tsx
// documents. A guessed code leaks a first name and a score.

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const { success } = await rateLimit(`dpp-teaser:${clientIp(req)}`, 60, 60);
  if (!success) return NextResponse.json({ error: "too many requests" }, { status: 429 });

  // Identical 404 for malformed and not-found, so enumeration learns nothing
  // from the difference.
  const notFound = () => NextResponse.json({ error: "not found" }, { status: 404 });
  if (!code || code.length > 32) return notFound();

  const run = await prisma.dppRun.findFirst({
    where: { share_code: code, status: "submitted" },
    select: {
      share_code: true,
      user_id: true,
      score: true,
      max_score: true,
      time_taken_secs: true,
      submitted_at: true,
      dpp: {
        select: {
          id: true,
          name: true,
          is_public: true,
          status: true,
          pattern: { select: { topic_name: true, subject: true, exam_type: true } },
          _count: { select: { questions: true } },
        },
      },
    },
  });

  // An unreleased DPP has no shareable challenge, even if a code exists from
  // before it was pulled.
  if (!run || !run.dpp.is_public || run.dpp.status !== "ready") return notFound();

  // Display name is derived, never stored on the run — so nothing
  // attacker-controlled reaches the teaser or the OG card. An empty id just
  // misses (falls back to "A student"): run.user_id is only null for an
  // unclaimed run, and an unclaimed run has no share_code to be found by here.
  const user = await prisma.user.findUnique({
    where: { id: run.user_id ?? "" },
    select: { email: true },
  });
  const handle = user?.email?.split("@")[0] ?? "";
  const displayName = handle
    ? handle.charAt(0).toUpperCase() + handle.slice(1, 18)
    : "A student";

  return NextResponse.json(
    {
      code: run.share_code,
      displayName,
      score: run.score,
      maxScore: run.max_score,
      timeTakenSecs: run.time_taken_secs,
      dppId: run.dpp.id,
      dppName: run.dpp.name,
      topicName: run.dpp.pattern.topic_name,
      subject: run.dpp.pattern.subject,
      examType: run.dpp.pattern.exam_type,
      questionCount: run.dpp._count.questions,
    },
    // Runs are immutable once submitted, so this is safely cacheable. Public:
    // there is no per-user content in the payload.
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
