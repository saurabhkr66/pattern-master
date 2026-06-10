"use client";

import TestAnalysis, { type ResultData } from "@/components/test/TestAnalysis";

// Thin client wrapper so the (server) result page can render the consumer
// TestAnalysis: provides a no-op onRestart (coaching tests aren't retakeable),
// points "Finish & exit" at the coaching dashboard, and hides the consumer-only
// next-mock suggestions + retake button.
export default function CoachingResultAnalysis({
  result,
  dashboardHref,
  imageUrlMap,
}: {
  result: ResultData;
  dashboardHref: string;
  // Signed GET URLs for subjective answer photos, signed by the server page.
  imageUrlMap?: Record<string, string>;
}) {
  return (
    <TestAnalysis
      result={result}
      onRestart={() => {}}
      exitHref={dashboardHref}
      showNextActions={false}
      showRestart={false}
      imageUrlMap={imageUrlMap}
    />
  );
}
