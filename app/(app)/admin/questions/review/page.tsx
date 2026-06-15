import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCoachingActor } from "@/lib/coachingAuth";
import AdminQuestionReview from "@/components/coaching/AdminQuestionReview";

export const dynamic = "force-dynamic";

export default async function AdminQuestionReviewPage() {
  const actor = await getCoachingActor();
  if (!actor?.isSuperAdmin) redirect("/");

  // The client reads its filters from the URL via useSearchParams, which must be
  // wrapped in Suspense.
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Loading…</p>}>
      <AdminQuestionReview />
    </Suspense>
  );
}
