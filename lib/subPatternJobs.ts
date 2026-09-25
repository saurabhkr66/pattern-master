import { redis, isRedisConfigured } from "@/lib/redis";
import type { BuildStep } from "@/lib/subPatternBuilder";

// Status of an admin-triggered "Sort with AI" run, keyed by chapter.
//
// Lives in Redis because prod runs PM2 in cluster mode: the worker running the
// job (inside after()) is often not the one answering the progress poll, so
// process memory can't be the source of truth. Without Redis (local dev, one
// process) it falls back to a globalThis map. Notes progress is NOT stored here
// — the poll counts PYQ.solving_idea in the DB, which is always accurate.

export type SortJob = {
  state: "running" | "done" | "skipped" | "error";
  step: BuildStep | null;
  message: string | null;
  startedAt: number;
  updatedAt: number;
};

// A running job that hasn't reported in this long is presumed dead (worker
// restarted mid-run) and may be started again.
export const STALE_MS = 10 * 60_000;
const TTL_SECONDS = 6 * 3600;

declare global {
  var __subPatternJobs: Map<string, SortJob> | undefined;
}
const local = (globalThis.__subPatternJobs ??= new Map<string, SortJob>());

const key = (patternId: string) => `subpattern-job:${patternId}`;

export async function getSortJob(patternId: string): Promise<SortJob | null> {
  if (!isRedisConfigured()) return local.get(patternId) ?? null;
  return (await redis.get<SortJob>(key(patternId))) ?? null;
}

export async function setSortJob(patternId: string, job: SortJob): Promise<void> {
  if (!isRedisConfigured()) {
    local.set(patternId, job);
    return;
  }
  await redis.set(key(patternId), job, { ex: TTL_SECONDS });
}

export function isJobActive(job: SortJob | null): boolean {
  return !!job && job.state === "running" && Date.now() - job.updatedAt < STALE_MS;
}
