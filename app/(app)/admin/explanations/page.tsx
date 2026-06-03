import { requireAdmin } from "@/lib/requireAdmin";
import { getGateCsePyqsMissingExplanation, getExamTypesWithMissingExplanations } from "@/app/actions/admin";
import ExplanationsClient from "./ExplanationsClient";

export const dynamic = "force-dynamic";

export default async function AdminExplanationsPage() {
  await requireAdmin();

  const [data, examTypes] = await Promise.all([
    getGateCsePyqsMissingExplanation(0, 50, "GATE", "CSE", null),
    getExamTypesWithMissingExplanations(),
  ]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Missing Explanations</h1>
          <p className="text-gray-500 font-medium">
            PYQs without explanations — {data.totalPyq + data.totalSubjectPyq} remaining
          </p>
        </div>
      </div>

      <ExplanationsClient initialData={data} examTypes={examTypes} />
    </div>
  );
}
