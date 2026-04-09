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
    <div className="flex flex-col gap-4 mt-6">
      {/* Exam Row */}
      <div className="flex flex-wrap gap-2">
        {availableExams.map((examId) => {
          const Icon = EXAM_ICONS[examId] ?? GraduationCap;
          const isActive = currentExam === examId;

          return (
            <button
              key={examId}
              onClick={() => handleExamSwitch(examId)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-2
                ${isActive
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "bg-gray-800/40 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                }
              `}
            >
              <Icon size={14} className={isActive ? "text-blue-100" : "text-gray-500"} />
              {examId}
            </button>
          );
        })}
      </div>

      {/* Branch Row — only when the active exam has multiple branches in DB */}
      {availableBranches.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800/50">
          <span className="w-full text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">
            Branch
          </span>
          {availableBranches.map((branchId) => {
            const Icon = BRANCH_ICONS[branchId] ?? Settings;
            const isActive = currentBranch === branchId;

            return (
              <button
                key={branchId}
                onClick={() => handleBranchSwitch(branchId)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border
                  ${isActive
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                    : "bg-gray-900/60 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300"
                  }
                `}
              >
                <Icon size={12} className={isActive ? "text-indigo-200" : "text-gray-600"} />
                {BRANCH_LABELS[branchId] ?? branchId}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
