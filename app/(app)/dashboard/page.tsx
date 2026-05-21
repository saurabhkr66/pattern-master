import { Suspense } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DashboardHeader from "./_components/DashboardHeader";
import SuggestedNextSection from "./_components/SuggestedNextSection";
import StatsSection from "./_components/StatsSection";
import HeatmapSection from "./_components/HeatmapSection";
import CriticalReviewSection from "./_components/CriticalReviewSection";
import RecentActivitySection from "./_components/RecentActivitySection";
import {
  SuggestedSkeleton,
  StatsSkeleton,
  HeatmapSkeleton,
  ReviewSkeleton,
  ActivitySkeleton,
} from "./_components/skeletons";

export const metadata: Metadata = {
  title: "Dashboard – BattleExam",
  description: "Track your GATE CSE prep progress, accuracy, streaks and review wrong answers.",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const firstName = clerkUser.firstName || clerkUser.username || "Learner";

  return (
    <div className="be-screen" style={{ minHeight: "100%" }}>
      <style>{`
        @media (max-width: 639px) {
          .db-wrap { padding: 16px 16px 100px !important; }
          .db-h1  { font-size: 20px !important; letter-spacing: -0.3px !important; }
          .db-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .db-stat-cell { padding: 12px 14px !important; }
          .db-stat-val  { font-size: 20px !important; }
          .db-review-grid { grid-template-columns: 1fr !important; }
          .db-hdr { margin-bottom: 18px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32 }} className="db-wrap flex-col lg:flex-row">
        <div style={{ flex: 1, minWidth: 0 }}>

          <DashboardHeader userId={userId} firstName={firstName} />

          <Suspense fallback={<SuggestedSkeleton />}>
            <SuggestedNextSection userId={userId} />
          </Suspense>

          <Suspense fallback={<StatsSkeleton />}>
            <StatsSection userId={userId} />
          </Suspense>

          <Suspense fallback={<HeatmapSkeleton />}>
            <HeatmapSection userId={userId} />
          </Suspense>

          <Suspense fallback={<ReviewSkeleton />}>
            <CriticalReviewSection userId={userId} />
          </Suspense>

          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivitySection userId={userId} />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
