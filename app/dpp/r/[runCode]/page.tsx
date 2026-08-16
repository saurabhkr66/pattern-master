import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { BE } from "@/lib/theme";
import DppResultAnalysis from "@/components/dpp/DppResultAnalysis";
import TeaserCard, { type Teaser } from "@/components/dpp/TeaserCard";
import ChallengeStrip from "@/components/dpp/ChallengeStrip";
import ShareChallenge from "@/components/dpp/ShareChallenge";
import RematchBanner from "@/components/dpp/RematchBanner";
import { dppResultData, normalizeDppBreakdown } from "@/lib/dppResult";
import { compareLeaderboard } from "@/lib/coachingLeaderboard";

// One route, three faces — the share link IS the result link:
//
//   signed out (incl. WhatsApp's crawler) → teaser only, zero question content
//   signed in, not the owner              → teaser + "Take the challenge"
//   signed in, the owner                  → full analysis + share
//
// generateMetadata is ALWAYS public: a crawler cannot authenticate, and without
// an OG card a WhatsApp link converts far worse. It carries only the same four
// teaser facts.

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.battleexam.com";

type LoadedRun = NonNullable<Awaited<ReturnType<typeof loadRun>>>;

async function loadRun(code: string) {
  if (!code || code.length > 32) return null;

  const run = await prisma.dppRun.findFirst({
    where: { share_code: code, status: "submitted" },
    select: {
      id: true,
      user_id: true,
      score: true,
      max_score: true,
      correct_count: true,
      wrong_count: true,
      skipped_count: true,
      time_taken_secs: true,
      submitted_at: true,
      answers: true,
      share_code: true,
      challenged_from_id: true,
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

  // An unreleased DPP has no shareable challenge, even if an old code exists.
  if (!run || !run.dpp.is_public || run.dpp.status !== "ready") return null;
  return run;
}

/** Display name is derived from the User row at read time — never stored on the
 *  run — so nothing attacker-controlled reaches the teaser or the OG card.
 *  `userId` is null only for an unclaimed run, which never reaches any of this
 *  file's callers (loadRun only finds runs by share_code, and an unclaimed run
 *  has none) — accepted defensively rather than asserted away. */
async function displayNameFor(userId: string | null): Promise<string> {
  const u = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    : null;
  const handle = u?.email?.split("@")[0] ?? "";
  return handle ? handle.charAt(0).toUpperCase() + handle.slice(1, 18) : "A student";
}

function toTeaser(run: LoadedRun, name: string): Teaser {
  return {
    code: run.share_code!,
    displayName: name,
    score: run.score ?? 0,
    maxScore: run.max_score ?? 0,
    timeTakenSecs: run.time_taken_secs,
    dppId: run.dpp.id,
    dppName: run.dpp.name,
    topicName: run.dpp.pattern.topic_name,
    examType: run.dpp.pattern.exam_type,
    questionCount: run.dpp._count.questions,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ runCode: string }>;
}): Promise<Metadata> {
  const { runCode } = await params;
  const run = await loadRun(runCode);
  if (!run) return { title: "Challenge not found", robots: { index: false, follow: false } };

  const name = await displayNameFor(run.user_id);
  const title = `${name} scored ${run.score}/${run.max_score} on ${run.dpp.name}`;
  const description = `${run.dpp.pattern.topic_name} · ${run.dpp._count.questions} questions. Think you can beat it?`;
  const url = `${BASE}/dpp/r/${runCode}`;

  return {
    title,
    description,
    // noindex, but the OG tags still render — that is the whole point of this
    // page existing publicly.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      siteName: "BattleExam",
      type: "website",
      images: [
        {
          url: `${BASE}/api/dpp-card?run=${encodeURIComponent(runCode)}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE}/api/dpp-card?run=${encodeURIComponent(runCode)}`],
    },
  };
}

export default async function DppResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ runCode: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { runCode } = await params;
  const { via } = await searchParams;
  const run = await loadRun(runCode);
  if (!run) notFound();

  const { userId } = await auth();
  const ownerName = await displayNameFor(run.user_id);
  const isOwner = Boolean(userId) && userId === run.user_id;

  // Faces 1 and 2: anyone who is not the owner gets the teaser and nothing else.
  if (!isOwner) {
    return (
      <TeaserCard teaser={toTeaser(run, ownerName)} signedIn={Boolean(userId)} via={via ?? null} />
    );
  }

  // Face 3 — the owner's full result.
  // Normalised, not cast: runs graded before the camelCase fix store
  // `question_text` / `question_type`, which buildResultData does not read.
  const breakdown = normalizeDppBreakdown(run.answers);
  const result = dppResultData(
    breakdown,
    {
      score: run.score ?? 0,
      maxScore: run.max_score ?? 0,
      correctCount: run.correct_count ?? 0,
      wrongCount: run.wrong_count ?? 0,
      skippedCount: run.skipped_count ?? 0,
    },
    run.time_taken_secs ?? 0,
  );

  // "You vs them", when this run came from someone's challenge link.
  let opponent: {
    name: string;
    score: number;
    maxScore: number;
    timeTakenSecs: number | null;
    submittedAt: Date | null;
  } | null = null;

  if (run.challenged_from_id) {
    const parent = await prisma.dppRun.findUnique({
      where: { id: run.challenged_from_id },
      select: {
        user_id: true,
        score: true,
        max_score: true,
        time_taken_secs: true,
        submitted_at: true,
      },
    });
    if (parent) {
      opponent = {
        name: await displayNameFor(parent.user_id),
        score: parent.score ?? 0,
        maxScore: parent.max_score ?? 0,
        timeTakenSecs: parent.time_taken_secs,
        submittedAt: parent.submitted_at,
      };
    }
  }

  // The other half of the loop: has anyone this owner challenged beaten them?
  // Only the single best challenger is surfaced — that's the one worth a
  // rematch, and showing every beater would just be noise.
  let rematch: { name: string; score: number; maxScore: number; shareCode: string } | null = null;
  const bestChild = await prisma.dppRun.findFirst({
    where: { challenged_from_id: run.id, status: "submitted", share_code: { not: null } },
    orderBy: [{ score: "desc" }, { time_taken_secs: "asc" }],
    select: {
      user_id: true,
      score: true,
      max_score: true,
      time_taken_secs: true,
      submitted_at: true,
      share_code: true,
    },
  });
  if (bestChild?.share_code) {
    const childBeatOwner =
      compareLeaderboard(
        {
          score: bestChild.score ?? 0,
          timeTakenSecs: bestChild.time_taken_secs,
          submittedAt: bestChild.submitted_at?.getTime() ?? Number.MAX_SAFE_INTEGER,
        },
        {
          score: run.score ?? 0,
          timeTakenSecs: run.time_taken_secs,
          submittedAt: run.submitted_at?.getTime() ?? Number.MAX_SAFE_INTEGER,
        },
      ) < 0;
    if (childBeatOwner) {
      rematch = {
        name: await displayNameFor(bestChild.user_id),
        score: bestChild.score ?? 0,
        maxScore: bestChild.max_score ?? 0,
        shareCode: bestChild.share_code,
      };
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 0", color: BE.text }}>
      <Link href="/dpp" style={{ color: BE.textDim, fontSize: 13, textDecoration: "none" }}>
        ← All DPPs
      </Link>

      <div style={{ marginTop: 14 }}>
        {opponent && (
          <ChallengeStrip
            you={{
              name: "You",
              score: run.score ?? 0,
              maxScore: run.max_score ?? 0,
              timeTakenSecs: run.time_taken_secs,
              submittedAt: run.submitted_at,
            }}
            them={opponent}
          />
        )}

        {rematch && (
          <RematchBanner
            dppId={run.dpp.id}
            name={rematch.name}
            score={rematch.score}
            maxScore={rematch.maxScore}
            shareCode={rematch.shareCode}
          />
        )}

        {run.share_code && (
          <ShareChallenge
            runCode={run.share_code}
            dppName={run.dpp.name}
            topicName={run.dpp.pattern.topic_name}
            score={run.score ?? 0}
            maxScore={run.max_score ?? 0}
          />
        )}

        {/* Submitting is exactly what unlocks practice mode, so this is where a
            student is standing when it opens — without a link here the unlock is
            invisible and nobody would find it. Kept visually secondary: sharing
            the challenge is the action this page exists to drive. */}
        <Link
          href={`/dpp/${run.dpp.id}/practice`}
          style={{
            display: "block",
            marginTop: 12,
            padding: "11px 14px",
            borderRadius: 11,
            border: `1px solid ${BE.line}`,
            color: BE.textDim,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <strong style={{ color: BE.text, fontWeight: 700 }}>Practise these questions</strong>{" "}
          · untimed, with full solutions
        </Link>
      </div>

      <DppResultAnalysis result={result} dppId={run.dpp.id} />
    </div>
  );
}
