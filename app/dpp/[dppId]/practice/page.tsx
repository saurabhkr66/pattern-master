import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getDppPractice, hasSubmittedRun } from "@/lib/dppPractice";
import DppPracticeClient from "@/components/dpp/DppPracticeClient";

// Practice mode for one DPP: untimed review AFTER a scored attempt.
// Signed-in only and noindex, like every /dpp route.
//
// Practice creates no run and scores nothing, so there is no row to own — but it
// does hand the answer key to the browser, which makes the post-submission gate
// below load-bearing rather than cosmetic.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DppPracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ dppId: string }>;
  /** `q` = a DppQuestion id to open first, so the mistake room can send a student
   *  straight to the question they got wrong instead of to question 1. Unknown or
   *  absent ids fall back to the start of the sheet. */
  searchParams: Promise<{ q?: string }>;
}) {
  const { dppId } = await params;
  const { q: startQuestionId } = await searchParams;

  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/dpp/${dppId}/practice`)}`);
  }

  // ⚠️ THE gate, and it has to live here rather than only on the tile in the mode
  // picker. Hiding a link hides nothing: this URL is guessable from the sheet id,
  // and reaching it early would serve the answer key to someone who has not
  // attempted the sheet, letting them ace the "timed test" and poison the
  // challenge loop. Checked BEFORE loading, so an ungated request never even
  // pulls the answers into the process.
  //
  // Redirect (not notFound) to the mode picker: the sheet is real and the student
  // is one submitted run away from being allowed in, so the picker — which
  // explains the lock — is the honest destination.
  if (!(await hasSubmittedRun(dppId, userId))) redirect(`/dpp/${dppId}`);

  // Returns null for a missing, unreleased or empty sheet — same visibility rule
  // as the Test path, so practice can never be a back door into a draft.
  const dpp = await getDppPractice(dppId);
  if (!dpp) notFound();

  return (
    <DppPracticeClient
      dppId={dpp.dppId}
      patternId={dpp.patternId}
      title={dpp.name}
      topicName={dpp.topicName}
      questions={dpp.questions}
      startQuestionId={startQuestionId ?? null}
    />
  );
}
