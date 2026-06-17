import Link from "next/link";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { getCoachingInsights } from "@/lib/coachingInsights";
import { PageHead } from "@/components/coaching/ui";
import InsightsBoard from "@/components/coaching/InsightsBoard";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const actor = await resolveCoachingAdmin();

  if (actor?.isSuperAdmin && !actor.coachingId) {
    return (
      <div className="p-10">
        <PageHead title="Insights" sub="You aren't scoped to a coaching." />
        <p className="text-slate-400">
          Pick a coaching from the{" "}
          <Link href="/admin/coachings" className="text-amber-400 hover:underline">
            super-admin panel
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const coachingId = actor!.coachingId!;
  const { weak, improving, absent } = await getCoachingInsights(coachingId);

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <PageHead title="Insights" sub="Who needs attention, who's improving, who's missing tests" />
      <InsightsBoard data={{ weak, improving, absent }} />
    </div>
  );
}
