"use client";

import { useClerk, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { launchNativeSignIn } from "@/lib/nativeAuth";
import { Cpu, Globe, Zap, Settings, Wrench, BookOpen, type LucideIcon } from "lucide-react";

const BRANCH_ICONS: Record<string, LucideIcon> = {
  CSE: Cpu,
  IT: Globe,
  ECE: Zap,
  ME: Settings,
  EE: Wrench,
};

const BRANCH_LABELS: Record<string, string> = {
  CSE: "Computer Science",
  IT: "Information Technology",
  ECE: "Electronics & Communication",
  ME: "Mechanical Engineering",
  EE: "Electrical Engineering",
};

const BRANCH_COLORS: Record<string, { card: string; pill: string; icon: string }> = {
  CSE: {
    card: "border-violet-500/20 bg-violet-500/5",
    pill: "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20",
    icon: "text-violet-400",
  },
  IT: {
    card: "border-blue-500/20 bg-blue-500/5",
    pill: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
    icon: "text-blue-400",
  },
  ECE: {
    card: "border-cyan-500/20 bg-cyan-500/5",
    pill: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
    icon: "text-cyan-400",
  },
  ME: {
    card: "border-amber-500/20 bg-amber-500/5",
    pill: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    icon: "text-amber-400",
  },
  EE: {
    card: "border-emerald-500/20 bg-emerald-500/5",
    pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    icon: "text-emerald-400",
  },
};

const DEFAULT_COLORS = {
  card: "border-white/10 bg-white/5",
  pill: "bg-white/5 text-white/50 border-white/10 hover:bg-white/10",
  icon: "text-white/40",
};

export interface BranchSubjectData {
  branch: string;
  exam: string; // primary exam for this branch (e.g. "GATE")
  subjects: string[];
}

interface TopicsExplorerProps {
  data: BranchSubjectData[];
}

export default function TopicsExplorer({ data }: TopicsExplorerProps) {
  const { isSignedIn } = useAuth();
  const { openSignUp } = useClerk();
  const router = useRouter();

  const handleSubjectClick = (branch: string, exam: string, subject: string) => {
    const dest = `/practice?exam=${encodeURIComponent(exam)}&branch=${encodeURIComponent(branch)}&subject=${encodeURIComponent(subject)}`;

    if (isSignedIn) {
      router.push(dest);
      return;
    }

    // Store destination so PostLoginRedirect can pick it up after sign-up
    try {
      sessionStorage.setItem("battleexam_post_login_redirect", dest);
    } catch {
      // ignore storage errors (private browsing etc.)
    }

    // Native app: Clerk's modal is a dead end in the WebView — route the tap
    // through the system-browser Google flow instead.
    if (Capacitor.isNativePlatform()) {
      void launchNativeSignIn();
      return;
    }

    openSignUp({});
  };

  return (
    <div className="space-y-6">
      {data.map(({ branch, exam, subjects }) => {
        const colors = BRANCH_COLORS[branch] ?? DEFAULT_COLORS;
        const Icon = BRANCH_ICONS[branch] ?? BookOpen;
        const label = BRANCH_LABELS[branch] ?? branch;

        return (
          <div
            key={branch}
            className={`rounded-2xl border p-5 ${colors.card}`}
          >
            {/* Branch header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.card} shrink-0`}>
                <Icon size={14} className={colors.icon} />
                <span className={`text-xs font-bold ${colors.icon}`}>{label}</span>
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-widest shrink-0"
                style={{ color: "var(--text-faint)" }}
              >
                {subjects.length} subjects
              </span>
            </div>

            {/* Subject pills */}
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => handleSubjectClick(branch, exam, subject)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${colors.pill}`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
