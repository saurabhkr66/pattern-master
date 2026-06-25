import { redirect } from "next/navigation";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import TeamClient, { type TeamMember } from "@/components/coaching/TeamClient";

// Owner-only team roster. Teachers run day-to-day operations but only the owner
// (or an impersonating super admin) invites/removes teammates — mirrors the
// ownerOnly guard on /api/coaching/team.
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const actor = await resolveCoachingAdmin();
  if (!actor || (!actor.isSuperAdmin && actor.role !== "owner")) {
    redirect("/coaching-admin");
  }
  if (!actor.coachingId) {
    // Super admin who hasn't picked a coaching to manage.
    redirect("/admin/coachings");
  }

  const rows = await prisma.coachingAdmin.findMany({
    where: { coaching_id: actor.coachingId },
    select: { id: true, email: true, name: true, role: true, clerk_id: true },
    orderBy: { created_at: "asc" },
  });

  const members: TeamMember[] = rows
    .map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role === "owner" ? ("owner" as const) : ("teacher" as const),
      status: r.clerk_id ? ("active" as const) : ("pending" as const),
    }))
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));

  return <TeamClient initialMembers={members} />;
}
