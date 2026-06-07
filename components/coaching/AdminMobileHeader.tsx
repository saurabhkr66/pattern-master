"use client";

import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut, ArrowLeftRight } from "lucide-react";
import { LogoBadge, display } from "@/components/coaching/ui";

// Slim top bar shown only on mobile (the sidebar is hidden there). Carries the
// coaching identity + sign-out / exit-impersonation, since the bottom nav is
// navigation-only.
export default function AdminMobileHeader({
  coachingName,
  subtitle,
  impersonating,
  isSuperAdmin,
}: {
  coachingName: string;
  subtitle: string;
  impersonating: boolean;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  // Leave the coaching-admin shell back to the platform panel. Clears the
  // impersonation cookie if one is set (no-op otherwise) — never touches the
  // super admin's Clerk session.
  async function exitToPlatform() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin/coachings");
    router.refresh();
  }

  return (
    <header
      className="flex items-center justify-between px-5 py-3 md:hidden"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,9,16,0.6)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <LogoBadge letter={coachingName} size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white" style={{ fontFamily: display }}>
            {coachingName}
          </p>
          <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      {/* A super admin's real account lives in the consumer app, so the top-right
          control always exits to the platform panel — NEVER a Clerk sign-out (which
          would log them out and bounce to the admin login). Only true coaching
          admins/owners get Sign Out here. */}
      {isSuperAdmin ? (
        <button
          onClick={exitToPlatform}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-amber-400"
          title={impersonating ? "Exit — back to coachings" : "Back to coachings"}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      ) : (
        <SignOutButton redirectUrl="/coaching-admin/login">
          <button className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-300" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </SignOutButton>
      )}
    </header>
  );
}
