import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BE } from "@/lib/theme";
import { randomCode } from "@/lib/shortCode";
import { isUniqueViolation } from "@/lib/dbHttp";
import { writeDppAttempts } from "@/lib/dppAttempts";
import type { DppBreakdownItem } from "@/lib/dppResult";

// Where an anonymous DppRun becomes a real, owned one.
//
// The runId is the access key — an unguessable UUID nobody but the visitor who
// just took the sheet was ever shown (see the nullability note on
// DppRun.user_id in prisma/schema/dpprun.prisma). Two different things happen
// here depending on whether the visitor already has a session:
//   • signed in  → attach user_id + mint share_code, then go straight to the
//                  real result page. This is the ONLY place either happens for
//                  a run that was taken anonymously.
//   • signed out → show the score right here (safe: there is no question
//                  content on this page) with a sign-up CTA that redirects
//                  back to this exact URL, closing the loop.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DppClaimPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  const run = await prisma.dppRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      dpp_id: true,
      user_id: true,
      status: true,
      share_code: true,
      score: true,
      max_score: true,
      // Needed only on the claim branch below, to back-fill the Attempt rows a
      // run taken while signed out could not write at submit time.
      answers: true,
      dpp: { select: { name: true, pattern: { select: { topic_name: true } } } },
    },
  });
  if (!run) notFound();

  // Not finished yet — nothing to claim. Send them back to actually take it.
  if (run.status !== "submitted") redirect(`/dpp/${run.dpp_id}`);

  const { userId } = await auth();

  // Already claimed.
  if (run.user_id !== null) {
    if (userId === run.user_id && run.share_code) redirect(`/dpp/r/${run.share_code}`);
    // Someone else's claimed run, or a stale link — nothing to show here.
    redirect(`/dpp/${run.dpp_id}`);
  }

  // Still unclaimed and signed out → the score reveal + sign-up CTA. This is
  // the ONLY place a not-yet-signed-in visitor sees their DPP score.
  if (!userId) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 16px", color: BE.text }}>
        <div
          style={{
            background: BE.surface,
            border: `1px solid ${BE.line}`,
            borderRadius: 18,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, color: BE.textDim }}>You scored</div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: BE.accent,
              lineHeight: 1.1,
              margin: "10px 0 2px",
            }}
          >
            {run.score ?? 0}
            <span style={{ fontSize: 26, color: BE.textDim }}>/{run.max_score ?? 0}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700 }}>{run.dpp.name}</div>
          <div style={{ fontSize: 13, color: BE.textDim, marginTop: 3 }}>
            {run.dpp.pattern.topic_name}
          </div>

          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(`/dpp/claim/${run.id}`)}`}
            style={{
              display: "block",
              marginTop: 22,
              padding: "14px 18px",
              borderRadius: 12,
              background: BE.accent,
              color: "#1a1205",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Sign up to save this &amp; challenge back
          </Link>
          <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 10 }}>
            Free. Takes 10 seconds.
          </div>
        </div>
      </div>
    );
  }

  // Signed in — claim it.
  let shareCode: string | null = null;
  for (let attempt = 0; attempt < 3 && !shareCode; attempt++) {
    const candidate = randomCode(8);
    const clash = await prisma.dppRun.findUnique({
      where: { share_code: candidate },
      select: { id: true },
    });
    if (!clash) shareCode = candidate;
  }
  // Exhausted retries — vanishingly rare. Reload rather than fail hard.
  if (!shareCode) redirect(`/dpp/claim/${runId}`);

  let updated = 0;
  try {
    updated = await prisma.$executeRaw`
      UPDATE "DppRun"
         SET user_id = ${userId}, share_code = ${shareCode}
       WHERE id = ${runId} AND user_id IS NULL`;
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    // Collision on the mint — try again with a fresh code rather than losing
    // the claim entirely.
    redirect(`/dpp/claim/${runId}`);
  }

  if (updated === 0) {
    // Lost a race to claim the same run (e.g. a second tab). Read back
    // whatever won.
    const now = await prisma.dppRun.findUnique({
      where: { id: runId },
      select: { share_code: true },
    });
    redirect(now?.share_code ? `/dpp/r/${now.share_code}` : `/dpp/${run.dpp_id}`);
  }

  // The run is now owned, so its answers can finally become Attempt rows — the
  // submit route had no user to attribute them to. Guarded by `updated > 0`, so
  // only the request that actually won the claim writes them; a second tab
  // cannot duplicate the set. after() keeps the inserts off the redirect path
  // (and is where revalidateTag is legal — it must not run during render).
  const breakdown = (run.answers ?? []) as unknown as DppBreakdownItem[];
  if (breakdown.length > 0) {
    after(async () => {
      try {
        await writeDppAttempts(userId, breakdown);
      } catch (e) {
        console.error("DPP attempt back-fill failed at claim", { runId, error: e });
      }
    });
  }

  redirect(`/dpp/r/${shareCode}`);
}
