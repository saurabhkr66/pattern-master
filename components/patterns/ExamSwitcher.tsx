"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Award, Zap, BookOpen, Cpu, Globe, Settings, Wrench } from "lucide-react";

const EXAMS = [
  { id: "GATE", label: "GATE", icon: GraduationCap },
  { id: "JEE", label: "JEE", icon: Zap },
  { id: "ISRO", label: "ISRO", icon: Award },
  { id: "BARC", label: "BARC", icon: BookOpen },
];

const BRANCHES = [
  { id: "CSE", label: "CS", icon: Cpu },
  { id: "IT", label: "IT", icon: Globe },
  { id: "ECE", label: "ECE", icon: Zap },
  { id: "ME", label: "ME", icon: Settings },
  { id: "EE", label: "EE", icon: Wrench },
];

interface ExamSwitcherProps {
  currentExam: string;
  currentBranch: string | null;
}

export default function ExamSwitcher({ currentExam, currentBranch }: ExamSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleExamSwitch = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("exam", id);
    // When switching exams, we keep the branch if possible, but reset pattern
    params.delete("patternId");
    router.push(`/?${params.toString()}`);
  };

  const handleBranchSwitch = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentBranch === id) {
      params.delete("branch"); // Toggle off
    } else {
      params.set("branch", id);
    }
    params.delete("patternId");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Exam Row */}
      <div className="flex flex-wrap gap-2">
        {EXAMS.map((exam) => {
          const Icon = exam.icon;
          const isActive = currentExam === exam.id;

          return (
            <button
              key={exam.id}
              onClick={() => handleExamSwitch(exam.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-2
                ${isActive 
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" 
                  : "bg-gray-800/40 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                }
              `}
            >
              <Icon size={14} className={isActive ? "text-blue-100" : "text-gray-500"} />
              {exam.label}
            </button>
          );
        })}
      </div>

      {/* Branch Row (Optional - mostly for technical exams) */}
      {(currentExam === "GATE" || currentExam === "ISRO" || currentExam === "BARC") && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800/50">
          <span className="w-full text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Select Branch</span>
          {BRANCHES.map((branch) => {
            const Icon = branch.icon;
            const isActive = currentBranch === branch.id;

            return (
              <button
                key={branch.id}
                onClick={() => handleBranchSwitch(branch.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border
                  ${isActive 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                    : "bg-gray-900/60 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300"
                  }
                `}
              >
                <Icon size={12} className={isActive ? "text-indigo-200" : "text-gray-600"} />
                {branch.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
