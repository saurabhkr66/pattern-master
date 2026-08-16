import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BE } from "@/lib/theme";
import DppIndexClient, { type DppIndexItem } from "@/components/dpp/DppIndexClient";

// Student DPP index. Signed-in only; DPP has no public content surface.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Practice Problems",
  // Every /dpp route is noindex — there is no SEO surface for DPP by design.
  robots: { index: false, follow: false },
};

export default async function DppIndexPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dpp");

  // Released only: is_public is the "released to students" switch, status is the
  // authoring lifecycle. Both are required.
  //
  // The whole released set is shipped to the client, which filters it (see
  // DppIndexClient). DPPs are hand-curated so this stays small; `take` is the
  // tripwire to watch if that ever stops being true.
  const [dpps, runs] = await Promise.all([
    prisma.dpp.findMany({
      where: { is_public: true, status: "ready" },
      orderBy: [{ updated_at: "desc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        pattern: { select: { topic_name: true, subject: true, exam_type: true } },
        _count: { select: { questions: true } },
      },
    }),
    // This user's finished runs, BEST first — highest score, ties to the fastest.
    // The previous version ordered by submitted_at and kept the first, which made
    // the badge show the LATEST run: a worse retake silently replaced a better
    // score. Not filtered by dpp id — a student's own run count is small, and an
    // `IN` over 300 ids costs more than the rows it saves.
    prisma.dppRun.findMany({
      // `score: not null` is not just defensive: Postgres sorts NULLS FIRST on a
      // DESC ordering, so a scoreless row would win the "best" slot outright.
      where: { user_id: userId, status: "submitted", score: { not: null } },
      orderBy: [{ score: "desc" }, { time_taken_secs: "asc" }],
      select: { dpp_id: true, score: true, max_score: true },
    }),
  ]);

  const bestByDpp = new Map<string, (typeof runs)[number]>();
  for (const r of runs) if (!bestByDpp.has(r.dpp_id)) bestByDpp.set(r.dpp_id, r);

  const items: DppIndexItem[] = dpps.map((d) => {
    const best = bestByDpp.get(d.id);
    return {
      id: d.id,
      name: d.name,
      questionCount: d._count.questions,
      examType: d.pattern.exam_type,
      subject: d.pattern.subject,
      topicName: d.pattern.topic_name,
      bestScore: best?.score ?? null,
      bestMaxScore: best?.max_score ?? null,
    };
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 64px", color: BE.text }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
        Daily Practice Problems
      </h1>
      <DppIndexClient dpps={items} />
    </div>
  );
}
