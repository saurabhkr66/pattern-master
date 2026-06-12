import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedFullTest } from "@/lib/coachingQuestionCache";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { getCoachingDraft } from "@/lib/coachingDraft";
import { paperKeyB64 } from "@/lib/paperCrypto";

/**
 * T-0 start call: creates (or resumes) the attempt and releases the paper key.
 * This is the ONLY per-student work in the start spike — one cookie HMAC check,
 * Redis-cached reads, one idempotent upsert, and a ~300-byte response. The
 * heavy paper payload was already pre-staged encrypted by the paper endpoint;
 * the key is withheld here until the window is actually open, which is what
 * makes pre-staging safe.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const student = await getCurrentStudent();
  if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const test = await getCachedFullTest(testId, student.coaching_id);
  if (!test) return NextResponse.json({ error: "test not found" }, { status: 404 });
  if (test.status !== "active") {
    return NextResponse.json({ error: "test not available" }, { status: 403 });
  }

  const now = Date.now();
  const windowState = testWindowState(test.start_at, test.end_at, new Date(now));
  if (windowState === "before") {
    // Key must not leak before T-0 — the whole pre-stage scheme hangs on this
    // gate. 425 + opensAt lets a fast-clock client resync and retry on time.
    return NextResponse.json(
      { error: "not started", opensAt: test.start_at!.toISOString(), serverNow: now },
      { status: 425 }
    );
  }
  if (windowState === "after") {
    return NextResponse.json({ error: "window closed" }, { status: 410 });
  }

  // Idempotent attempt: resume in-progress, flag if already submitted. Raw
  // single-statement upsert instead of prisma.upsert — Prisma may wrap upsert in
  // an implicit transaction, which the Neon HTTP adapter (dev) rejects; ONE
  // INSERT..ON CONFLICT works on both drivers (HTTP dev + VPS TCP). The no-op
  // DO UPDATE makes RETURNING yield the EXISTING row on resume (DO NOTHING
  // would return nothing). id is supplied here because @default(uuid()) is a
  // Prisma-client default, not a DB default — raw SQL bypasses it.
  const rows = await prisma.$queryRaw<
    { id: string; status: string; started_at: Date | string }[]
  >`
    INSERT INTO "TestAttempt" (id, coaching_id, test_id, student_id)
    VALUES (${randomUUID()}, ${student.coaching_id}, ${test.id}, ${student.id})
    ON CONFLICT (test_id, student_id)
    DO UPDATE SET test_id = EXCLUDED.test_id
    RETURNING id, status, started_at
  `;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "could not start" }, { status: 500 });
  // started_at may arrive as a string depending on the driver — normalize.
  const attempt = { id: row.id, status: row.status, started_at: new Date(row.started_at) };
  if (attempt.status === "submitted") {
    return NextResponse.json({ submitted: true, attemptId: attempt.id });
  }

  // Server-anchored timer: started_at + duration, capped by the test's close time.
  let expiresMs = attempt.started_at.getTime() + test.duration_secs * 1000;
  if (test.end_at) expiresMs = Math.min(expiresMs, test.end_at.getTime());

  // Autosaved answers for resume after reload/crash (Redis; null on first start).
  const draft = await getCoachingDraft(attempt.id, student.id);

  return NextResponse.json({
    attemptId: attempt.id,
    serverExpiresAt: new Date(expiresMs).toISOString(),
    key: paperKeyB64(test.id),
    draft,
    serverNow: now,
  });
}
