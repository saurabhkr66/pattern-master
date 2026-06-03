import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStudentSession, hashPin, isValidPin } from "@/lib/studentAuth";

// Public. First-time student onboarding (also the "set/reset my PIN" path) via a
// coaching's join code. Body: { slug, joinCode, name, phone, pin }
// The PIN is the login secret — phone alone can't log in afterward. Re-joining
// with the code lets a returning student set a new PIN (acts as a self-reset).
export async function POST(req: NextRequest) {
  try {
    const { slug, joinCode, name, phone, pin } = await req.json();

    if (!slug || !joinCode || !name || !phone) {
      return NextResponse.json(
        { error: "slug, joinCode, name and phone are required" },
        { status: 400 }
      );
    }
    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "PIN must be 4–6 digits" },
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
      select: { id: true },
    });
    if (student) {
      await prisma.student.update({
        where: whereKey,
        data: { name: String(name).trim(), active: true, pin_hash: pinHash },
      });
    } else {
      try {
        student = await prisma.student.create({
          data: {
            coaching_id: coaching.id,
            name: String(name).trim(),
            phone: normalizedPhone,
            pin_hash: pinHash,
          },
          select: { id: true },
        });
      } catch {
        // Race: created concurrently — re-read.
        student = await prisma.student.findUnique({ where: whereKey, select: { id: true } });
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
