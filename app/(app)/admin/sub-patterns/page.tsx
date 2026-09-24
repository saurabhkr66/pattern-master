import { requireAdmin } from "@/lib/requireAdmin";
import { listSubPatternChapters } from "@/app/actions/subPatterns";
import SubPatternsClient from "./SubPatternsClient";

export const dynamic = "force-dynamic";

export default async function AdminSubPatternsPage() {
  await requireAdmin();
  const chapters = await listSubPatternChapters();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Question Types</h1>
          <p className="text-gray-500 font-medium">
            Check the AI-sorted piles per chapter, fix them, then mark the chapter reviewed to publish it
          </p>
        </div>
      </div>

      <SubPatternsClient initialChapters={chapters} />
    </div>
  );
}
