import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCoachingContext } from "@/lib/withCoachingContext";

// Team management is owner-only — teachers run day-to-day operations but cannot
// invite or remove teammates. Super admins pass through (impersonation).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/coaching/team — roster of seats for the current coaching.
// A seat is "active" once its invite has been claimed (clerk_id set), else "pending".
export const GET = withCoachingContext(
  async (_req, { coachingId }) => {
    const rows = await prisma.coachingAdmin.findMany({
      where: { coaching_id: coachingId },
      select: { id: true, email: true, name: true, role: true, clerk_id: true, created_at: true },
      orderBy: { created_at: "asc" },
    });

    // Owner first, then by join order. Never leak clerk_id to the client.
    const members = rows
      .map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role === "owner" ? "owner" : "teacher",
        status: r.clerk_id ? "active" : "pending",
        created_at: r.created_at,
      }))
      .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));

    return NextResponse.json({ members });
  },
  { ownerOnly: true }
);

// POST /api/coaching/team  { email, name? }
// Invite a teacher by email. They claim the seat on first Clerk login with that
// email (claimCoachingIfPending). No email is sent — the owner shares the
// sign-in link out of band (matches the existing owner-claim flow).
export const POST = withCoachingContext(
  async (req, { coachingId }) => {
    const { email, name } = await req.json();
    const normalized = String(email ?? "").trim().toLowerCase();

    if (!EMAIL_RE.test(normalized)) {
      return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
    }

    // The owner is already a member; don't let them invite their own email.
    const coaching = await prisma.coaching.findUnique({
      where: { id: coachingId },
      select: { owner_email: true },
    });
    if (coaching?.owner_email?.toLowerCase() === normalized) {
      return NextResponse.json({ error: "this is the owner's email" }, { status: 409 });
    }

    // Friendly guard for the (coaching_id, email) unique constraint.
    const existing = await prisma.coachingAdmin.findFirst({
      where: { coaching_id: coachingId, email: normalized },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "this email is already on the team" }, { status: 409 });
    }

    const member = await prisma.coachingAdmin.create({
      data: {
        coaching_id: coachingId,
        email: normalized,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        role: "teacher",
        // clerk_id stays null until they sign in and claim the seat.
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: member.id });
  },
  { ownerOnly: true }
);
