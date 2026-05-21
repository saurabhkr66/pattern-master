// app/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import TopicsExplorer, { type BranchSubjectData } from "@/components/landing/TopicsExplorer";
import {
  homeMetadata,
  structuredData,
  softwareAppSchema,
  faqStructuredData,
} from "@/components/landing/homeMetadata";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeatureStrip from "@/components/landing/FeatureStrip";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata = homeMetadata;

// Serve from CDN edge cache — regenerate at most once per hour
export const revalidate = 3600;

const getCachedBranchSubjects = unstable_cache(
  async () => {
    return prisma.pattern.findMany({
      select: { exam_type: true, branch: true, subject: true },
      distinct: ["exam_type", "branch", "subject"],
      orderBy: [{ exam_type: "asc" }, { branch: "asc" }, { subject: "asc" }],
    });
  },
  ["homepage-branch-subjects"],
  { revalidate: 3600, tags: ["patterns"] }
);

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const branchSubjectRows = await getCachedBranchSubjects();

  const branchMap = new Map<string, { exam: string; subjects: Set<string> }>();
  for (const row of branchSubjectRows) {
    if (!branchMap.has(row.branch)) {
      branchMap.set(row.branch, { exam: row.exam_type, subjects: new Set() });
    }
    branchMap.get(row.branch)!.subjects.add(row.subject);
  }

  const topicsData: BranchSubjectData[] = Array.from(branchMap.entries()).map(
    ([branch, { exam, subjects }]) => ({
      branch,
      exam,
      subjects: Array.from(subjects).sort(),
    })
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="min-h-screen" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <FeatureStrip />
        <FeaturesGrid />

        {/* ── TOPICS ───────────────────────────────── */}
        <section
          id="topics"
          className="px-6 py-20"
          aria-labelledby="topics-heading"
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                Coverage
              </p>
              <h2
                id="topics-heading"
                className="text-2xl md:text-3xl font-black"
                style={{ color: "var(--text-primary)" }}
              >
                Pick your stream. Start practicing.
              </h2>
              <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                Click any subject — you&apos;ll land directly on that topic after signing up.
              </p>
            </div>

            <TopicsExplorer data={topicsData} />
          </div>
        </section>

        <FAQSection />
        <FinalCTASection />
        <LandingFooter />
      </div>
    </>
  );
}
