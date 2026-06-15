import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Normalize a client-supplied batchIds list into the set of ids that are real
 * batches of THIS coaching. Anything that isn't a string id of the coaching's
 * own batches is dropped, so a forged/foreign id can never scope a test to
 * another tenant. A non-array input (field omitted) yields [] — i.e. the test
 * stays visible to every student. Deduped to keep the stored array tidy.
 */
export async function resolveBatchIds(
  input: unknown,
  coachingId: string
): Promise<string[]> {
  if (!Array.isArray(input)) return [];
  const wanted = [...new Set(input.filter((x): x is string => typeof x === "string"))];
  if (wanted.length === 0) return [];

  const rows = await prisma.batch.findMany({
    where: { id: { in: wanted }, coaching_id: coachingId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Whether a student may access a test given the test's batch targeting. Empty
 * targeting = open to everyone; otherwise the student must be in one of the
 * targeted batches (an unbatched student is excluded). Pure — the caller has
 * already loaded both values.
 */
export function studentInTestBatches(
  testBatchIds: string[] | undefined | null,
  studentBatchId: string | null
): boolean {
  if (!testBatchIds || testBatchIds.length === 0) return true;
  return studentBatchId != null && testBatchIds.includes(studentBatchId);
}
