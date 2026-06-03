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
}: {
  coachingName: string;
  subtitle: string;
  impersonating: boolean;
}) {
  const router = useRouter();
  async function exitImpersonation() {
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
      {impersonating ? (
        <button
          onClick={exitImpersonation}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-amber-400"
          title="Exit — back to coachings"
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
