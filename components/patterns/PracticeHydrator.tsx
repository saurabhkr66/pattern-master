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
    // Only hydrate if we are on the base /practice path with no query params
    const hasParams = searchParams.has("exam") || 
                      searchParams.has("branch") || 
                      searchParams.has("subject") ||
                      searchParams.has("patternId") ||
                      searchParams.has("q");

    if (!hasParams) {
      const savedExam = localStorage.getItem("pref_exam");
      const savedBranch = localStorage.getItem("pref_branch");
      const savedSubject = localStorage.getItem("pref_subject");

      if (savedExam) {
        const params = new URLSearchParams();
        params.set("exam", savedExam);
        if (savedBranch) params.set("branch", savedBranch);
        if (savedSubject) params.set("subject", savedSubject);
        
        // Use replace to avoid polluting browser history with the 'empty' landing
        router.replace(`/practice?${params.toString()}`);
      }
    }
  }, [router, searchParams]);

  return null; // This component doesn't render anything
}
