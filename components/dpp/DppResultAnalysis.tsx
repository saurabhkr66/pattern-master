"use client";

import { useRouter } from "next/navigation";
import TestAnalysis, { type ResultData } from "@/components/test/TestAnalysis";

// Thin client wrapper so the (server) result page can render TestAnalysis.
//
// This is not optional plumbing: TestAnalysis is a client component with a
// REQUIRED `onRestart` callback, and functions cannot cross the server→client
// boundary. Same reason components/coaching/CoachingResultAnalysis.tsx exists.
//
// Unlike coaching, a DPP retake is meaningful — beating your own score is part
// of the loop — so "restart" navigates back to the mode picker rather than
// no-opping. The consumer-only next-mock suggestions stay hidden.
export default function DppResultAnalysis({
  result,
  dppId,
}: {
  result: ResultData;
  dppId: string;
}) {
  const router = useRouter();
  return (
    <TestAnalysis
      result={result}
      onRestart={() => router.push(`/dpp/${dppId}`)}
      exitHref="/dpp"
      showNextActions={false}
      showRestart
    />
  );
}
