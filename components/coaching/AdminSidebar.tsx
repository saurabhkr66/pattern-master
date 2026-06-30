"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  ClipboardList,
  NotebookPen,
  TrendingUp,
  UserCog,
  IndianRupee,
  CalendarCheck,
  Megaphone,
  LogOut,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { LogoBadge, display, ORANGE_GRAD } from "@/components/coaching/ui";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
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

// Owner-only entry, appended when canManageTeam.
const TEAM_NAV: NavItem = { href: "/coaching-admin/team", label: "Team", icon: UserCog };

export default function AdminSidebar({
  coachingName,
  subtitle,
  impersonating = false,
  isSuperAdmin = false,
  canManageTeam = false,
}: {
  coachingName: string;
  subtitle: string;
  impersonating?: boolean;
  isSuperAdmin?: boolean;
  canManageTeam?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = canManageTeam ? [...NAV, TEAM_NAV] : NAV;

  // Exit the coaching-admin shell back to the platform panel. Clears the
  // impersonation cookie if set (no-op otherwise); never ends the Clerk session.
  async function exitToPlatform() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin/coachings");
    router.refresh();
  }

  return (
    <aside
      className="sticky top-0 hidden h-[125vh] w-[280px] shrink-0 flex-col px-[22px] py-7 md:flex"
      style={{
        background: "linear-gradient(180deg, #0c0f16 0%, #090b10 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3.5 pb-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <LogoBadge letter={coachingName} size={48} />
        <div className="min-w-0">
          <div
            className="truncate text-[19px] font-extrabold tracking-tight text-white"
            style={{ fontFamily: display }}
          >
            {coachingName}
          </div>
          <div className="truncate text-[13px] text-slate-400">{subtitle}</div>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1.5">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] transition"
              style={
                active
                  ? {
                      background: ORANGE_GRAD,
                      color: "#1a1205",
                      fontWeight: 700,
                      boxShadow: "0 8px 22px rgba(245,158,11,0.3)",
                    }
                  : { color: "#c9ced8", fontWeight: 500 }
              }
            >
              <Icon className="h-[21px] w-[21px] shrink-0" strokeWidth={active ? 2.1 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-2">
        {/* Super admins always exit to the platform panel (their Clerk account
            lives in the consumer app) — never a sign-out that boots them to the
            admin login. Real coaching admins/owners get Sign Out. */}
        {isSuperAdmin ? (
          <button
            onClick={exitToPlatform}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-amber-400 transition hover:brightness-110"
            style={{
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}
          >
            <ArrowLeftRight className="h-[19px] w-[19px] shrink-0" />
            {impersonating ? "Exit — back to coachings" : "Back to coachings"}
          </button>
        ) : (
          <SignOutButton redirectUrl="/coaching-admin/login">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-amber-400 transition hover:brightness-110"
              style={{
                background: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <LogOut className="h-[19px] w-[19px] shrink-0" />
              Sign out
            </button>
          </SignOutButton>
        )}
      </div>
    </aside>
  );
}
