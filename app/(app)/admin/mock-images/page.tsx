import { requireAdmin } from "@/lib/requireAdmin";
import { loadAuditWorklist } from "@/lib/mockImageAudit";
import MockImagesClient from "./MockImagesClient";

export const dynamic = "force-dynamic";

export default async function AdminMockImagesPage() {
  await requireAdmin();

  // Worklist only — which mocks the last audit found broken. Each mock's images
  // are re-verified live when it's opened, so a fixed one drops off the detail
  // view without needing a re-run of scripts/audit-mock-images.mjs.
  const mocks = await loadAuditWorklist();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Mock Image Repair</h1>
          <p className="text-gray-500 font-medium">
            Mock questions whose image is missing from ImageKit — paste a screenshot to replace it
          </p>
        </div>
      </div>

      {mocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="font-semibold text-gray-900 dark:text-white">No audit worklist found</p>
          <p className="mt-1 text-sm text-gray-500">
            Run{" "}
            <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs">
              DB_DRIVER=standard node --env-file=.env scripts/audit-mock-images.mjs
            </code>{" "}
            to generate <code className="text-xs">data/mock-missing-images.json</code>.
          </p>
        </div>
      ) : (
        <MockImagesClient mocks={mocks} />
      )}
    </div>
  );
}
