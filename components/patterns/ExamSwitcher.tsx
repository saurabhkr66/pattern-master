"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { BE } from "@/lib/theme";

interface ExamSwitcherProps {
  currentExam: string;
  currentBranch: string | null;
  availableExams: string[];
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
    params.delete("branch");
    params.delete("subject");
    params.delete("q");
    params.delete("patternId");
    router.push(`/practice?${params.toString()}`);
  };

  const handleBranchSwitch = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentBranch === id) {
      params.delete("branch");
    } else {
      params.set("branch", id);
    }
    params.delete("subject");
    params.delete("q");
    params.delete("patternId");
    router.push(`/practice?${params.toString()}`);
  };

  const hasBranches = availableBranches.length > 0;

  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: '10px 14px', marginBottom: 18, background: 'rgba(255,255,255,0.015)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32 }}>
        <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, minWidth: 48 }}>Exam</div>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {availableExams.map(examId => {
            const on = examId === currentExam;
            return (
              <div key={examId} 
                onClick={() => handleExamSwitch(examId)}
                style={{
                  padding: '5px 10px', borderRadius: 7,
                  background: on ? BE.accentSoft : 'transparent',
                  color: on ? BE.accent : BE.textDim,
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'baseline', gap: 6,
                }}>
                {examId}
              </div>
            );
          })}
        </div>
      </div>
      {hasBranches && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 32, marginTop: 4, paddingTop: 8, borderTop: `1px solid ${BE.line}` }}>
          <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, minWidth: 48 }}>
            Branch
          </div>
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {availableBranches.map(b => {
              const on = b === currentBranch;
              return (
                <div key={b} 
                  onClick={() => handleBranchSwitch(b)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${on ? BE.accent : 'transparent'}`,
                    color: on ? BE.text : BE.textDim,
                    background: on ? 'rgba(255,255,255,0.04)' : 'transparent',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: BE.mono,
                  }}>{b}</div>
              );
            })}
          </div>
        </div>
      )}
      {!hasBranches && (
        <div style={{ fontSize: 11, color: BE.textMute, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${BE.line}`, fontStyle: 'italic', fontFamily: BE.serif }}>
          {currentExam} has a single unified syllabus — no branch selection needed.
        </div>
      )}
    </div>
  );
}

