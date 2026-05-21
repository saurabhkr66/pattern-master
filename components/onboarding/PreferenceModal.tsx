'use client';

import React, { useState, useMemo } from 'react';
import { saveUserPreference } from '@/app/onboarding/actions';
import { EXAM_CONFIGS } from '@/lib/examConfigs';
import {
  Brain,
  Check,
  ChevronRight,
  ArrowRight,
  Loader2,
  GraduationCap,
  Code,
  Cpu,
  BookOpen,
  Zap,
  FlaskConical,
  Stethoscope,
  Library,
  type LucideIcon,
} from 'lucide-react';

const EXAM_ICON: Record<string, LucideIcon> = {
  GATE: GraduationCap,
  JEE_MAIN: Zap,
  JEE_ADVANCED: FlaskConical,
  NEET: Stethoscope,
  UGC_NET_P1: Library,
  UGC_NET_P2: BookOpen,
};

const BRANCH_ICON: Record<string, LucideIcon> = {
  CSE: Code,
  ECE: Cpu,
};

type ExamOption = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  branches: { id: string; label: string }[];
};

interface PreferenceModalProps {
  availableExams: string[];
  branchesByExam: Record<string, string[]>;
}

export default function PreferenceModal({
  availableExams,
  branchesByExam,
}: PreferenceModalProps) {
  const EXAMS = useMemo<ExamOption[]>(() => {
    return availableExams.map((examId) => {
      const cfg = EXAM_CONFIGS.find((e) => e.examType === examId);
      const dbBranches = (branchesByExam[examId] ?? []).filter((b) => b !== 'Common');
      const cfgBranchLabel = (id: string) =>
        cfg?.branches?.find((b) => b.id === id)?.label ?? id;
      return {
        id: examId,
        name: cfg?.label ?? examId,
        description: cfg?.description ?? '',
        icon: EXAM_ICON[examId] ?? BookOpen,
        branches: dbBranches.map((b) => ({ id: b, label: cfgBranchLabel(b) })),
      };
    });
  }, [availableExams, branchesByExam]);

  const [step, setStep] = useState(1);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentExamData = EXAMS.find((e) => e.id === selectedExam);
  const totalSteps = currentExamData && currentExamData.branches.length === 0 ? 1 : 2;

  const persist = async (exam: string, branch: string | null) => {
    setIsSaving(true);
    setError(null);
    try {
      await saveUserPreference(exam, branch);
    } catch (err) {
      console.error('Failed to save preference:', err);
      setError('Could not save — please try again.');
      setIsSaving(false);
    }
  };

  const handleExamClick = (exam: ExamOption) => {
    setSelectedExam(exam.id);
    setSelectedBranch(null);
    if (exam.branches.length === 0) {
      void persist(exam.id, null);
    } else {
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!selectedExam || !selectedBranch) return;
    await persist(selectedExam, selectedBranch);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                Onboarding · Step {step} of {totalSteps}
              </span>
            </div>
            <h2 className="text-3xl font-black text-[var(--text-primary)] leading-tight">
              {step === 1 ? 'Which exam are you preparing for?' : 'Select your branch'}
            </h2>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">
              We&apos;ll tailor your dashboard and questions based on this choice.
            </p>
          </div>

          {/* Step 1: Exam Selection */}
          {step === 1 && (
            <>
              {EXAMS.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">
                  No exams are available yet. Please check back soon.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXAMS.map((exam) => {
                    const isSel = selectedExam === exam.id;
                    const isLoading = isSaving && isSel;
                    return (
                      <button
                        key={exam.id}
                        onClick={() => handleExamClick(exam)}
                        disabled={isSaving}
                        className={`group relative p-5 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait ${
                          isSel
                            ? 'bg-amber-500/10 border-amber-500/50'
                            : 'bg-[var(--bg-surface-2)] border-[var(--border)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`p-2.5 rounded-xl border transition-colors ${
                              isSel
                                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                                : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'
                            }`}
                          >
                            <exam.icon className="w-5 h-5" />
                          </div>
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                          ) : isSel ? (
                            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          ) : null}
                        </div>
                        <h3 className="font-bold text-[var(--text-primary)] text-lg">{exam.name}</h3>
                        {exam.description && (
                          <p className="text-[var(--text-muted)] text-xs mt-1 leading-relaxed">
                            {exam.description}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          Select <ChevronRight className="w-3 h-3" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Step 2: Branch Selection */}
          {step === 2 && currentExamData && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)]">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <currentExamData.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Selected Exam</p>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{currentExamData.name}</p>
                </div>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedBranch(null);
                  }}
                  className="ml-auto text-[10px] font-bold text-amber-500 uppercase hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {currentExamData.branches.map((branch) => {
                  const Icon = BRANCH_ICON[branch.id] ?? BookOpen;
                  const isSel = selectedBranch === branch.id;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => setSelectedBranch(branch.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                        isSel
                          ? 'bg-amber-500/10 border-amber-500/50'
                          : 'bg-[var(--bg-surface-2)] border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-colors ${
                            isSel
                              ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                              : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)]'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="font-bold text-[var(--text-primary)] truncate">{branch.id}</div>
                          {branch.label !== branch.id && (
                            <div className="text-[11px] text-[var(--text-muted)] truncate">{branch.label}</div>
                          )}
                        </div>
                      </div>
                      {isSel && (
                        <div className="w-6 h-6 shrink-0 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!selectedBranch || isSaving}
                onClick={handleSave}
                className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest transition-all hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-amber-500/20"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirm and Start <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 text-center text-xs font-semibold text-red-400">{error}</p>
          )}

        </div>

        {/* Footer info */}
        <div className="px-8 py-4 bg-[var(--bg-surface-2)] border-t border-[var(--border)] text-center">
          <p className="text-[10px] text-[var(--text-muted)] font-medium">
            You can change these preferences later in your settings.
          </p>
        </div>
      </div>
    </div>
  );
}
