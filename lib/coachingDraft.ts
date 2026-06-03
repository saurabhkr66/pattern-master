import "server-only";
import { redis, isRedisConfigured } from "@/lib/redis";
import type { DraftState } from "@/components/test/testEngineTypes";

// In-progress autosave for a coaching attempt. Stored in Redis (NOT Neon) so a
// live batch of 700 students periodically flushing answers never touches the
// DB — the heavy write happens once, on submit. The key is scoped to
// (attemptId, studentId): the studentId comes from the verified session, so a
// save aimed at someone else's attempt lands on a key that is only ever read
// back for the attacker's own id (page.tsx reads with the real owner's id).
//
// Answers are stored in the SAME display space the engine uses (MCQ options may
// be shuffled per student); the submit endpoint de-shuffles on grade, so a
// restored draft stays consistent with what the student saw.

const VERSION = "v1";
const TTL_SECONDS = 60 * 60 * 6; // 6h — comfortably covers any test window
const key = (attemptId: string, studentId: string) =>
  `coaching:draft:${attemptId}:${studentId}:${VERSION}`;

/** Best-effort write of the student's in-progress state. Never throws. */
export async function saveCoachingDraft(
  attemptId: string,
  studentId: string,
  state: DraftState
): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    await redis.set(key(attemptId, studentId), state, { ex: TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}

/** Restore a saved draft on page load (resume after reload/crash). */
export async function getCoachingDraft(
  attemptId: string,
  studentId: string
): Promise<DraftState | null> {
  if (!isRedisConfigured()) return null;
  try {
    return (await redis.get<DraftState>(key(attemptId, studentId))) ?? null;
  } catch {
    return null;
  }
}
