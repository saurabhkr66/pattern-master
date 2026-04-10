"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap, Award, Zap, BookOpen, Cpu, Globe, Settings, Wrench, FlaskConical, type LucideIcon,
} from "lucide-react";

// Static icon maps — add more as new exams/branches are seeded
const EXAM_ICONS: Record<string, LucideIcon> = {
  GATE: GraduationCap,
  ISRO: Award,
  BARC: BookOpen,
  ESE:  FlaskConical,
  JEE:  Zap,
};

const BRANCH_ICONS: Record<string, LucideIcon> = {
  CSE: Cpu,
  IT:  Globe,
  ECE: Zap,
  ME:  Settings,
  EE:  Wrench,
};

const BRANCH_LABELS: Record<string, string> = {
  CSE: "CS",
  IT:  "IT",
  ECE: "ECE",
  ME:  "ME",
  EE:  "EE",
};

interface ExamSwitcherProps {
  currentExam: string;
  currentBranch: string | null;
  /** All exam_type values that have patterns in the DB */
  availableExams: string[];
  /** All branch values for the currently active exam */
  availableBranches: string[];
}

export default function ExamSwitcher({
  currentExam,
  currentBranch,
  availableExams,
  availableBranches,
}: ExamSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleExamSwitch = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("exam", id);
    params.delete("branch");   // reset branch when exam changes
    params.delete("patternId");
    router.push(`/practice?${params.toString()}`);
  };

  const handleBranchSwitch = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentBranch === id) {
      params.delete("branch"); // toggle off
    } else {
      params.set("branch", id);
    }
    params.delete("patternId");
    router.push(`/practice?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      {/* Exam pills */}
      <div className="flex flex-wrap gap-2">
        {availableExams.map((examId) => {
          const Icon = EXAM_ICONS[examId] ?? GraduationCap;
          const isActive = currentExam === examId;
          return (
            <button
              key={examId}
              onClick={() => handleExamSwitch(examId)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-all border ${
                isActive
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "hover:opacity-80"
              }`}
              style={isActive ? undefined : { background: "var(--bg-surface-2)", borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
            >
              <Icon size={14} className={isActive ? "text-blue-200" : undefined} style={isActive ? undefined : { color: "var(--text-muted)" }} />
              {examId}
            </button>
          );
        })}
      </div>

      {/* Branch pills */}
      {availableBranches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Branch:</span>
          {availableBranches.map((branchId) => {
            const Icon = BRANCH_ICONS[branchId] ?? Settings;
            const isActive = currentBranch === branchId;
            return (
              <button
                key={branchId}
                onClick={() => handleBranchSwitch(branchId)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-black transition-all border ${
                  isActive
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "hover:opacity-80"
                }`}
                style={isActive ? undefined : { background: "var(--bg-surface-2)", borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
              >
                <Icon size={12} style={isActive ? undefined : { color: "var(--text-muted)" }} />
                {BRANCH_LABELS[branchId] ?? branchId}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
