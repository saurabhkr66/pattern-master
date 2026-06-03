"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  ClipboardList,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";

const NAV = [
  { href: "/coaching-admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/coaching-admin/students", label: "Students", icon: Users },
  { href: "/coaching-admin/questions", label: "Question Bank", icon: FileQuestion },
  { href: "/coaching-admin/tests", label: "Tests", icon: ClipboardList },
];

export default function AdminSidebar({
  coachingName,
  subtitle,
  impersonating = false,
}: {
  coachingName: string;
  subtitle: string;
  impersonating?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function exitImpersonation() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    router.push("/admin/coachings");
    router.refresh();
  }

  return (
    <aside className="hidden h-screen w-60 flex-col border-r border-slate-800 bg-slate-900 md:flex">
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="truncate text-sm font-semibold text-white">{coachingName}</p>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-amber-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-4">
        {impersonating ? (
          <button
            onClick={exitImpersonation}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-amber-400 transition hover:bg-slate-800"
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            Exit — back to coachings
          </button>
        ) : (
          <SignOutButton redirectUrl="/coaching-admin/login">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </SignOutButton>
        )}
      </div>
    </aside>
  );
}
