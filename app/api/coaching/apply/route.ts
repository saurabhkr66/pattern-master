import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/shortCode";

// Public, unauthenticated endpoint for a coaching to apply for access from
// /for-coachings. Creates a "pending" + inactive Coaching; a super admin
// approves it (sets pricing + activates) from /admin/coachings before the
// owner can sign in and claim it.

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").trim().toLowerCase();
  const contactName = String(body.contactName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const city = String(body.city ?? "").trim();

  if (!name) return NextResponse.json({ error: "Coaching name is required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!phone) return NextResponse.json({ error: "Phone number is required." }, { status: 400 });

  // One application per email — avoids duplicates and spam from a single owner.
  const existing = await prisma.coaching.findFirst({
    where: { owner_email: ownerEmail },
    select: { status: true },
  });
  if (existing) {
    const msg =
      existing.status === "pending"
        ? "An application with this email is already under review."
        : "This email is already linked to a coaching. Try signing in instead.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // Unique slug — append a short suffix on collision.
  let slug = slugify(name) || `coaching-${randomCode(4).toLowerCase()}`;
  if (await prisma.coaching.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${randomCode(4).toLowerCase()}`;
  }

  // Unique join code (reserved now so it's stable once approved).
  let joinCode = randomCode();
  while (await prisma.coaching.findUnique({ where: { join_code: joinCode }, select: { id: true } })) {
    joinCode = randomCode();
  }

  await prisma.coaching.create({
    data: {
      name,
      slug,
      city: city || null,
      owner_email: ownerEmail,
      applicant_name: contactName || null,
      applicant_phone: phone,
      join_code: joinCode,
      status: "pending",
      active: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
