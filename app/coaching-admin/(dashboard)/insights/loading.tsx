import { Skeleton } from "@/components/coaching/ui";

// Instant skeleton while InsightsPage resolves auth + the cached aggregate.
export default function InsightsLoading() {
  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-7 flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-6 py-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {Array.from({ length: 4 }).map((_, r) => (
                <div key={r} className="flex items-center gap-3 px-6 py-3.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex-1" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
