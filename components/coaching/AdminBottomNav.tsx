"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Users, FileQuestion, ClipboardList } from "lucide-react";

// Mobile bottom tab nav (replaces the sidebar on small screens). Desktop hides it.
const NAV = [
  { href: "/coaching-admin", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/coaching-admin/insights", label: "Insights", icon: TrendingUp },
  { href: "/coaching-admin/students", label: "Students", icon: Users },
  { href: "/coaching-admin/questions", label: "Bank", icon: FileQuestion },
  { href: "/coaching-admin/tests", label: "Tests", icon: ClipboardList },
];

export default function AdminBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex md:hidden"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(8,9,16,0.92)",
        backdropFilter: "blur(8px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        paddingTop: 8,
      }}
    >
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const on = exact ? pathname === href : pathname.startsWith(href);
        const color = on ? "#ff8f00" : "#5e6480";
        return (
          <Link key={href} href={href} className="flex flex-1 flex-col items-center gap-1">
            <Icon style={{ color, height: 22, width: 22 }} />
            <span style={{ color, fontSize: 11, fontWeight: on ? 700 : 600 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
