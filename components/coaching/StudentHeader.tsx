"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { LogoBadge, display } from "@/components/coaching/ui";

export default function StudentHeader({
  coachingName,
  studentName,
  slug,
}: {
  coachingName: string;
  studentName: string;
  slug: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/student/logout", { method: "POST" });
    router.replace(`/c/${slug}/login`);
    router.refresh();
  }

  return (
    <header
      className="relative flex items-center justify-between px-6 py-5 sm:px-12"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(8,9,16,0.6)" }}
    >
      <div className="flex items-center gap-3.5">
        <LogoBadge letter={coachingName} size={40} />
        <div>
          <p className="text-[17px] font-bold text-white" style={{ fontFamily: display }}>
            {coachingName}
          </p>
          <p className="mt-0.5 text-[13px] text-slate-400">Signed in as {studentName}</p>
        </div>
      </div>
      <button
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </header>
  );
}
