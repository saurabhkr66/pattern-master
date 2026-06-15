import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStudentSession, hashPin, isValidPin } from "@/lib/studentAuth";
import { rateLimit } from "@/lib/rateLimit";

// Public. First-time student onboarding (also the "set/reset my PIN" path) via a
// coaching's join code. Body: { slug, joinCode, name, phone, pin }
// The PIN is the login secret — phone alone can't log in afterward. Re-joining
// with the code lets a returning student set a new PIN (acts as a self-reset).
export async function POST(req: NextRequest) {
  try {
    const { slug, joinCode, name, phone, pin } = await req.json();

    // Throttle the public join route: caps join-code guessing and pending-queue
    // spam. Keyed by IP + coaching so a whole class joining at once (different
    // IPs) isn't throttled, but one attacker hammering a coaching's code is.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const limit = await rateLimit(`join:${ip}:${slug ?? "_"}`, 10, 600);
    if (!limit.success) {
      return NextResponse.json(
        { error: "too many attempts — please wait a few minutes and try again" },
        { status: 429 }
      );
    }

    if (!slug || !joinCode || !name || !phone) {
      return NextResponse.json(
        { error: "slug, joinCode, name and phone are required" },
        { status: 400 }
      );
    }
    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "PIN must be 6 digits" },
        { status: 400 }
      );
    }

    const normalizedPhone = String(phone).replace(/\D/g, "");
    if (normalizedPhone.length < 7) {
      return NextResponse.json({ error: "invalid phone number" }, { status: 400 });
    }

    const coaching = await prisma.coaching.findUnique({
      where: { slug: String(slug) },
      select: { id: true, join_code: true, active: true },
    });

    if (!coaching || !coaching.active) {
      return NextResponse.json({ error: "coaching not found" }, { status: 404 });
    }

    // Case-insensitive join code match.
    if (coaching.join_code.toLowerCase() !== String(joinCode).trim().toLowerCase()) {
      return NextResponse.json({ error: "invalid join code" }, { status: 403 });
    }

    // Find-or-create on the (coaching_id, phone) unique constraint. No
    // prisma.upsert — it runs as an internal transaction, which the Neon HTTP
    // adapter rejects. Returning students who re-join get name updated + reactivated.
    const whereKey = {
      coaching_id_phone: { coaching_id: coaching.id, phone: normalizedPhone },
    };
    const pinHash = await hashPin(pin);
    let student = await prisma.student.findUnique({
      where: whereKey,
      select: { id: true, status: true, active: true, pin_hash: true },
    });
    if (student) {
      // SECURITY: the join code is a single secret shared with the whole coaching,
      // so it is NOT proof that the submitter owns this phone. If the account is
      // already credentialed (pin_hash set), the code must not be allowed to
      // overwrite the PIN (account takeover) or change the status (knocking an
      // approved student back to "pending" — a DoS). Forgot-PIN recovery runs
      // through the owner's "Reset PIN" action, which clears pin_hash and drops
      // the account back into the safe branch below.
      if (student.pin_hash) {
        return NextResponse.json(
          {
            error:
              "An account with this phone already exists. Sign in with your PIN, or ask your coaching to reset it.",
            code: "exists",
          },
          { status: 409 }
        );
      }
      // No PIN yet — a legitimate first-time set: an owner-added student claiming
      // their account, or a student whose PIN the owner just reset. Keep an
      // already-enrolled student enrolled; everyone else (re)enters as "pending"
      // so the owner decides. active is reset true since this is an intentional re-join.
      const nextStatus =
        student.active && student.status === "approved" ? "approved" : "pending";
      await prisma.student.update({
        where: whereKey,
        data: { name: String(name).trim(), active: true, pin_hash: pinHash, status: nextStatus },
      });
    } else {
      try {
        student = await prisma.student.create({
          data: {
            coaching_id: coaching.id,
            name: String(name).trim(),
            phone: normalizedPhone,
            pin_hash: pinHash,
            status: "pending",
          },
          select: { id: true, status: true, active: true, pin_hash: true },
        });
      } catch {
        // Race: created concurrently — re-read.
        student = await prisma.student.findUnique({
          where: whereKey,
          select: { id: true, status: true, active: true, pin_hash: true },
        });
      }
    }
    if (!student) {
      return NextResponse.json({ error: "could not join, please retry" }, { status: 500 });
    }

    await createStudentSession(student.id, coaching.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("student join failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
