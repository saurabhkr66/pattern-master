import { requireAdmin } from "@/lib/requireAdmin";
import { getQuestionsForReview, getReviewExamTypes } from "@/app/actions/admin";
import AiReviewClient from "./AiReviewClient";

export const dynamic = "force-dynamic";

export default async function AdminAiReviewPage() {
  await requireAdmin();

  // Default landing view: unreviewed PYQs. The client re-queries on filter change.
  const [examTypes, initial] = await Promise.all([
    getReviewExamTypes("PYQ"),
    getQuestionsForReview("PYQ", 0, 50, "GATE", "CSE", null, null),
  ]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">AI Answer Review</h1>
          <p className="text-gray-500 font-medium">
            Blind-solves stored questions and flags answer mismatches into Reports
          </p>
        </div>
      </div>

      <AiReviewClient initialExamTypes={examTypes} initialData={initial} />
    </div>
  );
}
