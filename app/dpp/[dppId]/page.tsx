import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BE } from "@/lib/theme";
import { dppDurationSecs } from "@/lib/dppOptions";
import { hasSubmittedRun } from "@/lib/dppPractice";
import { findResumableRun } from "@/lib/dppRun";
import DppStartButtons from "@/components/dpp/DppStartButtons";

// Mode picker: take the DPP as a timed Test, or work it as untimed Practice.
//
// Signed-in OR anonymous — the sign-in wall gates the SCORE (at
// /dpp/claim/[runId], once they submit), not the attempt. See the DPP growth
// plan for why: a cold sign-up wall shown before anyone has invested anything
// converts far worse than one shown after they've already answered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DppModePage({
  params,
  searchParams,
}: {
  params: Promise<{ dppId: string }>;
  searchParams: Promise<{ c?: string; via?: string }>;
}) {
  const { dppId } = await params;
  const { c: challengeCode, via } = await searchParams;

  const { userId } = await auth();

  const dpp = await prisma.dpp.findFirst({
    where: { id: dppId, is_public: true, status: "ready" },
    select: {
      id: true,
      name: true,
      pattern: { select: { topic_name: true, subject: true, exam_type: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!dpp || dpp._count.questions === 0) notFound();

  // The score to beat, when arriving from a challenge link.
  let challenger: { name: string; score: number; maxScore: number } | null = null;
  if (challengeCode) {
    const parent = await prisma.dppRun.findFirst({
      where: { share_code: challengeCode, status: "submitted", dpp_id: dppId },
      select: { user_id: true, score: true, max_score: true },
    });
    if (parent) {
      // An empty id just misses (falls back to "A student"): parent.user_id is
      // only null for an unclaimed run, which has no share_code to have been
      // found by above.
      const u = await prisma.user.findUnique({
        where: { id: parent.user_id ?? "" },
        select: { email: true },
      });
      const handle = u?.email?.split("@")[0] ?? "";
      challenger = {
        name: handle ? handle.charAt(0).toUpperCase() + handle.slice(1, 18) : "A student",
        score: parent.score ?? 0,
        maxScore: parent.max_score ?? 0,
      };
    }
  }

  const durationSecs = dppDurationSecs(dpp._count.questions);
  const mins = Math.round(durationSecs / 60);

  // An attempt already under way. The start route resumes it either way — this
  // only makes that visible, so the button reads "Resume" instead of appearing
  // to start something new and silently dropping them back into a running clock.
  const resumable = await findResumableRun(dpp.id, userId, durationSecs);
  const resumeMinsLeft = resumable
    ? Math.max(1, Math.round((resumable.expiresAt.getTime() - Date.now()) / 60000))
    : null;

  // Practice is a post-attempt review tool — see the gate in
  // lib/dppPractice.ts. This only decides how the tile RENDERS; the practice
  // route re-checks server-side, because a hidden link is not a gate.
  // hasSubmittedRun looks up by Clerk user id, so an anonymous run (user_id:
  // null) can never satisfy it — practice stays locked until AFTER claiming,
  // same as for anyone else who hasn't submitted yet.
  const practiceUnlocked = userId ? await hasSubmittedRun(dpp.id, userId) : false;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 64px", color: BE.text }}>
      {/* Hidden while signed out: /dpp is signed-in only, so for an anonymous
          visitor this link is a bounce straight into the sign-in wall this page
          deliberately no longer shows. */}
      {userId && (
        <Link href="/dpp" style={{ color: BE.textDim, fontSize: 13, textDecoration: "none" }}>
          ← All DPPs
        </Link>
      )}

      {challenger && (
        <div
          style={{
            marginTop: 14,
            background: BE.accentSoft,
            border: `1px solid ${BE.accent}`,
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: BE.accent }}>
            {challenger.name} scored {challenger.score}/{challenger.maxScore}
          </div>
          <div style={{ fontSize: 12.5, color: BE.textDim, marginTop: 2 }}>
            Take it as a timed test to beat them.
          </div>
        </div>
      )}

      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "16px 0 4px" }}>{dpp.name}</h1>
      <div style={{ fontSize: 13, color: BE.textDim }}>
        {dpp.pattern.exam_type} · {dpp.pattern.subject} ·{" "}
        <strong>{dpp.pattern.topic_name}</strong>
      </div>
      <div style={{ fontSize: 12.5, color: BE.textMute, marginTop: 6, marginBottom: 22 }}>
        {dpp._count.questions} questions · no negative marking
      </div>

      <DppStartButtons
        dppId={dpp.id}
        questionCount={dpp._count.questions}
        durationMins={mins}
        challengeCode={challengeCode ?? null}
        via={via ?? null}
        practiceUnlocked={practiceUnlocked}
        resumeMinsLeft={resumeMinsLeft}
      />
    </div>
  );
}
