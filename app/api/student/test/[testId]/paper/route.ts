import { NextRequest, NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedFullTest, primeTestConfig } from "@/lib/coachingQuestionCache";
import { testWindowState } from "@/lib/coachingTestRuntime";
import { buildStudentPaper } from "@/lib/coachingPaper";
import { encryptPaper } from "@/lib/paperCrypto";

// How long before start_at the encrypted paper may be downloaded. The waiting
// room fetches inside this window (with client-side jitter), so T-0 itself only
// carries the tiny start/key call.
const PRELOAD_MS = 10 * 60 * 1000;

/**
 * Pre-stage download of THIS student's paper, AES-encrypted (lib/paperCrypto).
 * Served from start_at − 10min until end_at: early arrivals prefetch during the
 * waiting room; late joiners and mid-test reloads fetch it on the spot. Reads
 * are Redis-warm (cached test row + cached resolved set, per-student derivation
 * in memory) — no per-student DB read, so spreading a whole batch's downloads
 * over the preload window costs the box almost nothing.
 *
 * No attempt is created here — started_at must not start ticking before the
 * student actually begins (see the start endpoint).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const { testId } = await params;
  const student = await getCurrentStudent();
  if (!student) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Enrollment gate: don't even pre-stage the paper for a non-approved student.
  if (student.status !== "approved") {
    return NextResponse.json({ error: "enrollment not approved" }, { status: 403 });
  }

  const test = await getCachedFullTest(testId, student.coaching_id);
  if (!test) return NextResponse.json({ error: "test not found" }, { status: 404 });
  if (test.status !== "active") {
    return NextResponse.json({ error: "test not available" }, { status: 403 });
  }

  const now = Date.now();
  if (testWindowState(test.start_at, test.end_at, new Date(now)) === "after") {
    return NextResponse.json({ error: "window closed" }, { status: 410 });
  }
  if (test.start_at && now < test.start_at.getTime() - PRELOAD_MS) {
    // Too early even to pre-stage. 425 lets the client distinguish "come back
    // later" from a real failure and resync its countdown to server time.
    return NextResponse.json(
      { error: "too early", opensAt: test.start_at.toISOString(), serverNow: now },
      { status: 425 }
    );
  }

  // Warm the runtime-config cache now so the eventual submit spike never reads
  // the test row from the DB (previously the page render did this).
  const [paper] = await Promise.all([
    buildStudentPaper(test, student.coaching_id, student.id),
    primeTestConfig({
      id: test.id,
      questions: test.questions,
      shuffle: test.shuffle,
      pool_size: test.pool_size,
      duration_secs: test.duration_secs,
      end_at: test.end_at,
    }),
  ]);
  if (!paper) return NextResponse.json({ error: "no questions" }, { status: 404 });

  const { iv, ct } = encryptPaper(test.id, paper);
  return NextResponse.json({ iv, ct, serverNow: now });
}
