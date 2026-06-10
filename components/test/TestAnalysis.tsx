"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { BE } from "@/lib/theme";
import ScoreOverview from "./ScoreOverview";
import QuestionTimingStrip from "./QuestionTimingStrip";
import SectionBreakdown from "./SectionBreakdown";
import NextActions from "./NextActions";
import QuestionBreakdownTable from "./QuestionBreakdownTable";
import type { ResultData } from "./testAnalysisHelpers";

export type { ResultData } from "./testAnalysisHelpers";

interface Props {
  result: ResultData;
  onRestart: () => void;
  /** Where "Finish & exit" links. Default: consumer dashboard. */
  exitHref?: string;
  /** Show consumer "what next" suggestions (retake/next mock). Default: true. */
  showNextActions?: boolean;
  /** Show the "Retake test" button in ScoreOverview. Default: true. */
  showRestart?: boolean;
  /** Signed GET URLs for subjective answer photos (key → url). Coaching only. */
  imageUrlMap?: Record<string, string>;
}

export default function TestAnalysis({
  result,
  onRestart,
  exitHref = "/dashboard",
  showNextActions = true,
  showRestart = true,
  imageUrlMap,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [jumpToWrong, setJumpToWrong] = useState(0);

  // "Review wrong answers" — filter the breakdown to wrong and scroll to it.
  const handleReviewWrong = () => {
    setJumpToWrong((n) => n + 1);
    requestAnimationFrame(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="be-screen flex flex-col h-full overflow-y-auto" style={{ background: "var(--bg-base)" }}>
      {/* Finish bar */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-10 py-3 border-b shrink-0"
        style={{ borderColor: BE.line, background: BE.surface }}
      >
        <span style={{ fontFamily: BE.mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BE.textMute }}>
          Analysis
        </span>
        <Link
          href={exitHref}
          className="be-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12.5 }}
        >
          <Home size={13} />
          Finish &amp; exit
        </Link>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 space-y-10">
        <ScoreOverview result={result} onRestart={onRestart} showRestart={showRestart} />
        <QuestionTimingStrip questions={result.questions} />
        <SectionBreakdown sections={result.sectionBreakdown || []} questions={result.questions} />
        {showNextActions && (
          <NextActions result={result} onRestart={onRestart} onReviewWrong={handleReviewWrong} />
        )}
        <div className="max-md:-mx-6" ref={tableRef}>
          <QuestionBreakdownTable questions={result.questions} jumpToWrong={jumpToWrong} imageUrlMap={imageUrlMap} />
        </div>
      </main>
    </div>
  );
}
