import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { resolveCoachingAdmin } from "@/lib/coachingAuth";
import { prisma } from "@/lib/prisma";
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
    const coaching = await prisma.coaching.findUnique({
      where: { id: actor.coachingId },
      select: { name: true },
    });
    coachingName = coaching?.name ?? "Coaching";
    subtitle = impersonating ? "Super admin · managing" : actor.role === "owner" ? "Owner" : "Admin";
  } else if (actor.isSuperAdmin) {
    subtitle = "Platform Super Admin";
  }

  return (
    <>
      {/* Redesign fonts — Space Grotesk (display) + JetBrains Mono. Next hoists these. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <div className="flex min-h-screen" style={{ background: "#06060c" }}>
        {/* Desktop sidebar (hidden on mobile) */}
        <AdminSidebar coachingName={coachingName} subtitle={subtitle} impersonating={impersonating} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Mobile-only top bar; bottom nav handles navigation on mobile */}
          <AdminMobileHeader coachingName={coachingName} subtitle={subtitle} impersonating={impersonating} />
          <main className="min-w-0 flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
        </div>
        <AdminBottomNav />
      </div>
    </>
  );
}
