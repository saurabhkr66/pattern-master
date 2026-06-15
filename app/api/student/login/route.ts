import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStudentSession, verifyPin } from "@/lib/studentAuth";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
} from "@/lib/studentLoginRateLimit";

// Public. Returning-student login — phone + PIN. The student must already exist
// for this coaching AND have set a PIN (via the join flow). Body: { slug, phone, pin }
export async function POST(req: NextRequest) {
  try {
    const { slug, phone, pin } = await req.json();

    if (!slug || !phone || !pin) {
      return NextResponse.json({ error: "phone and PIN are required" }, { status: 400 });
    }

    const normalizedPhone = String(phone).replace(/\D/g, "");

    const coaching = await prisma.coaching.findUnique({
      where: { slug: String(slug) },
      select: { id: true, active: true },
    });

    if (!coaching || !coaching.active) {
      return NextResponse.json({ error: "coaching not found" }, { status: 404 });
    }

    // Throttle PIN guessing before the expensive scrypt verify. Keyed by
    // (coaching, phone) — see studentLoginRateLimit for the scope rationale.
    const limit = await checkLoginRateLimit(coaching.id, normalizedPhone);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "too many attempts — please wait a few minutes and try again" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const student = await prisma.student.findFirst({
      where: { coaching_id: coaching.id, phone: normalizedPhone, active: true },
      select: { id: true, pin_hash: true },
    });

    // SECURITY: every authentication failure returns the SAME 401 so the response
    // can't be used to enumerate the roster. An unknown phone, a phone with no PIN
    // set yet, and a wrong PIN are indistinguishable to the caller — otherwise an
    // attacker could probe phone numbers to learn who is enrolled (and which
    // accounts are PIN-less) and feed that into a brute-force. The "haven't set a
    // PIN yet / new here" nudge lives on the join screen, not here.
    //
    // We deliberately short-circuit verifyPin for unknown / PIN-less phones rather
    // than running a dummy hash to equalize timing: scrypt is intentionally heavy,
    // and running it on every unauthenticated probe is a CPU-amplification DoS.
    // The (small, rate-limited) timing signal is an acceptable trade vs. that.
    const valid =
      student?.pin_hash != null && (await verifyPin(String(pin), student.pin_hash));

    if (!student || !student.pin_hash || !valid) {
      // Only count attempts against a real, credentialed account so a flood of
      // unknown-phone probes can't lock out (or inflate the counter for) a victim.
      if (student?.pin_hash) await recordFailedLogin(coaching.id, normalizedPhone);
      return NextResponse.json({ error: "incorrect phone or PIN" }, { status: 401 });
    }

    // Success — clear any accumulated failures so the next session starts fresh.
    await clearLoginRateLimit(coaching.id, normalizedPhone);
    await createStudentSession(student.id, coaching.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("student login failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
