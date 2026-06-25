import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
import { getCachedCoachingName } from "@/lib/coachingCache";
import { coachingFontVars } from "@/lib/coachingFonts";
import AdminSidebar from "@/components/coaching/AdminSidebar";
import AdminMobileHeader from "@/components/coaching/AdminMobileHeader";
import AdminBottomNav from "@/components/coaching/AdminBottomNav";
import CoachingAccessPending from "@/components/coaching/CoachingAccessPending";

// Guard + shell for every /coaching-admin page EXCEPT /coaching-admin/login
// (which lives outside this route group, so it does not inherit this layout —
// no redirect loop). Super admins and linked coaching admins pass; everyone
// else is bounced to the admin sign-in.
export default async function CoachingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await resolveCoachingAdmin();

  if (!actor) {
    // Distinguish "not signed in" from "signed in but not authorized". Redirecting
    // a signed-in user to /coaching-admin/login would loop (Clerk bounces an
    // already-authenticated user straight back here), so show a status screen
    // instead: pending application, rejected, or no coaching linked to the email.
    const { userId } = await auth();
    if (!userId) {
      redirect("/coaching-admin/login");
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() ?? null;
    const application = email
      ? await prisma.coaching.findFirst({
          where: { owner_email: email },
          select: { status: true, name: true },
        })
      : null;

    return (
      <CoachingAccessPending
        status={application?.status ?? null}
        coachingName={application?.name ?? null}
        email={email}
      />
    );
  }

  // Sidebar context. A super admin may be "impersonating" a coaching (cookie),
  // in which case actor.coachingId is populated just like a linked admin.
  const impersonating = actor.isSuperAdmin && !!actor.coachingId;
  let coachingName = "BattleExam";
  let subtitle = "Coaching Admin";

  if (actor.coachingId) {
    coachingName = (await getCachedCoachingName(actor.coachingId)) ?? "Coaching";
    subtitle = impersonating ? "Super admin · managing" : actor.role === "owner" ? "Owner" : "Teacher";
  } else if (actor.isSuperAdmin) {
    subtitle = "Platform Super Admin";
  }

  // Team management (invite/remove teachers) is owner-only; super admins managing
  // a coaching get it too. Drives the Team nav entry in the sidebar + bottom nav.
  const canManageTeam = actor.role === "owner" || actor.isSuperAdmin;

  return (
      <div
        className={`coaching-scope ${coachingFontVars} flex min-h-screen md:min-h-[125vh] md:[zoom:0.80]`}
        style={{
          background:
            "radial-gradient(1200px 600px at 80% -10%, rgba(245,158,11,0.06), transparent 60%), #08090d",
          color: "#c9ced8",
        }}
      >
        {/* Desktop sidebar (hidden on mobile) */}
        <AdminSidebar coachingName={coachingName} subtitle={subtitle} impersonating={impersonating} isSuperAdmin={actor.isSuperAdmin} canManageTeam={canManageTeam} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Mobile-only top bar; bottom nav handles navigation on mobile */}
          <AdminMobileHeader coachingName={coachingName} subtitle={subtitle} impersonating={impersonating} isSuperAdmin={actor.isSuperAdmin} canManageTeam={canManageTeam} />
          <main className="min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
        </div>
        <AdminBottomNav canManageTeam={canManageTeam} />
      </div>
  );
}
