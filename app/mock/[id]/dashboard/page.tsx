import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLeaderboard, getMockStats } from "@/lib/leaderboard";
import MockDashboardClient from "@/components/mock/MockDashboardClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const mock = await prisma.mockTestTemplate.findUnique({
    where: { id },
    select: { title: true, exam_type: true },
  }).catch(() => null);
  const title = mock?.title
    ? `${mock.title} — Live Leaderboard`
    : "Live Leaderboard";
  return {
    title,
    description: "Live mock test leaderboard, participant count, and score distribution.",
  };
}

export default async function MockDashboardPage({ params }: PageProps) {
  const { id } = await params;

  const mock = await prisma.mockTestTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      exam_type: true,
      branch: true,
      total_questions: true,
      max_score: true,
      duration_secs: true,
    },
  });
  if (!mock) notFound();

  const [leaderboard, stats] = await Promise.all([
    getLeaderboard(id, 100),
    getMockStats(id),
  ]);

  return (
    <MockDashboardClient
      mock={mock}
      initialLeaderboard={leaderboard}
      initialStats={stats}
    />
  );
}
