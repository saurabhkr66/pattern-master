"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  LogOut,
  ArrowLeftRight,
  Menu,
  X,
  LayoutDashboard,
  TrendingUp,
  Users,
  FileQuestion,
  ClipboardList,
  NotebookPen,
  CalendarCheck,
  IndianRupee,
  Megaphone,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { LogoBadge, display, ORANGE_GRAD } from "@/components/coaching/ui";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

// The FULL nav lives here so every page stays reachable on mobile — the bottom
// bar only carries the most-used few. Team is appended when canManageTeam.
const MENU: NavItem[] = [
  { href: "/coaching-admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/coaching-admin/insights", label: "Insights", icon: TrendingUp },
  { href: "/coaching-admin/students", label: "Students", icon: Users },
  { href: "/coaching-admin/questions", label: "Question Bank", icon: FileQuestion },
  { href: "/coaching-admin/tests", label: "Tests", icon: ClipboardList },
  { href: "/coaching-admin/homework", label: "Homework", icon: NotebookPen },
  { href: "/coaching-admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/coaching-admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/coaching-admin/fees", label: "Fees", icon: IndianRupee },
];
const TEAM_MENU: NavItem = { href: "/coaching-admin/team", label: "Team", icon: UserCog };

// Slim top bar shown only on mobile (the sidebar is hidden there). Carries the
// coaching identity, a menu button opening the full nav, and sign-out / exit-
// impersonation. The bottom nav holds the most-used destinations.
export default function AdminMobileHeader({
  coachingName,
  subtitle,
  impersonating,
  isSuperAdmin,
  canManageTeam = false,
}: {
  coachingName: string;
  subtitle: string;
  impersonating: boolean;
  isSuperAdmin: boolean;
  canManageTeam?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = canManageTeam ? [...MENU, TEAM_MENU] : MENU;

  // Close the menu whenever the route changes (a link was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Leave the coaching-admin shell back to the platform panel. Clears the
  // impersonation cookie if one is set (no-op otherwise) — never touches the
  // super admin's Clerk session.
  async function exitToPlatform() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin/coachings");
    router.refresh();
  }

  return (
    <header className="relative z-40 md:hidden">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,9,16,0.6)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-200"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
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
      </div>

      {/* Dropdown menu (full nav). Tapping the backdrop or a link closes it. */}
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-0 z-30 h-screen w-screen cursor-default bg-black/50"
          />
          <nav
            className="absolute inset-x-0 top-full z-40 max-h-[70vh] overflow-y-auto px-3 py-3"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(12,15,22,0.98)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
            }}
          >
            {nav.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] transition"
                  style={
                    active
                      ? { background: ORANGE_GRAD, color: "#1a1205", fontWeight: 700 }
                      : { color: "#c9ced8", fontWeight: 500 }
                  }
                >
                  <Icon className="h-[21px] w-[21px] shrink-0" strokeWidth={active ? 2.1 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </header>
  );
}
