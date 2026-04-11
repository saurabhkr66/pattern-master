"use client";

export default function MistakesListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Subject Chips Skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-24 bg-gray-200 dark:bg-white/5 rounded-full" />
        ))}
      </div>

      {/* Weak Topics Skeleton */}
      <section className="mb-12">
        <div className="h-4 w-40 bg-gray-200 dark:bg-white/5 rounded mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Detailed Log Skeleton */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="h-4 w-32 bg-gray-200 dark:bg-white/5 rounded" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-white/5 rounded" />
        </div>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Pagination Skeleton */}
      <div className="flex flex-col items-center gap-4 py-8 border-t border-gray-100 dark:border-white/5">
        <div className="h-10 w-64 bg-gray-200 dark:bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}
