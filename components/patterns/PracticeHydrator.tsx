"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * PracticeHydrator handles the 'Remember Me' logic using LocalStorage.
 * If a user visits /practice with no params, it checks localStorage 
 * and redirects to their last-seen exam/branch/subject.
 */
export default function PracticeHydrator() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasSubject = searchParams.has("subject") || searchParams.has("patternId") || searchParams.has("q");
    const currentExam = searchParams.get("exam");
    const currentBranch = searchParams.get("branch") ?? "";

    if (!currentExam) {
      // No params at all — restore full saved state
      const savedExam = localStorage.getItem("pref_exam");
      const savedBranch = localStorage.getItem("pref_branch");
      const savedSubject = savedExam
        ? localStorage.getItem(`pref_subject_${savedExam}_${savedBranch ?? ""}`)
        : null;

      if (savedExam) {
        const params = new URLSearchParams();
        params.set("exam", savedExam);
        if (savedBranch) params.set("branch", savedBranch);
        if (savedSubject) params.set("subject", savedSubject);
        router.replace(`/practice?${params.toString()}`);
      }
    } else if (!hasSubject) {
      // Exam (and maybe branch) in URL but no subject — restore saved subject for this combo
      const savedSubject = localStorage.getItem(`pref_subject_${currentExam}_${currentBranch}`);
      if (savedSubject) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("subject", savedSubject);
        router.replace(`/practice?${params.toString()}`);
      }
    }
  }, [router, searchParams]);

  return null; // This component doesn't render anything
}
