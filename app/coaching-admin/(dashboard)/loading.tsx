import { Card, Skeleton } from "@/components/coaching/ui";

// Instant skeleton for the dashboard home. Shown the moment a nav link is
// clicked (Suspense boundary) while the server resolves auth + runs the
// dashboard's aggregate queries against Neon. Mirrors the real layout in
// page.tsx so the swap to live data is visually seamless.
export default function DashboardLoading() {
  return (
    <div className="p-10">
      <div className="mb-7">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-3 h-4 w-60" />
      </div>

      {/* Stat cards */}
      <div className="flex flex-col gap-5 sm:flex-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex-1">
            <div className="px-6 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-5 h-9 w-20" />
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        {/* Chart */}
        <Card className="lg:flex-[1.6]">
          <div className="px-6 py-5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-5 h-[150px] w-full rounded-xl" />
          </div>
        </Card>

        {/* Activity feed */}
        <Card className="lg:flex-1">
          <div className="px-6 py-5">
            <Skeleton className="h-5 w-32" />
            <div className="mt-5 space-y-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
