"use client";

import ScoreOverview from "./ScoreOverview";
import QuestionTimingStrip from "./QuestionTimingStrip";
import SectionBreakdown from "./SectionBreakdown";
import NextActions from "./NextActions";
import QuestionBreakdownTable from "./QuestionBreakdownTable";
import type { ResultData } from "./testAnalysisHelpers";

export type { ResultData } from "./testAnalysisHelpers";

interface Props { result: ResultData; onRestart: () => void; }

export default function TestAnalysis({ result, onRestart }: Props) {
  return (
    <div className="be-screen flex flex-col h-full overflow-y-auto" style={{ background: "var(--bg-base)" }}>
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 space-y-10">
        <ScoreOverview result={result} onRestart={onRestart} />
        <QuestionTimingStrip questions={result.questions} />
        <SectionBreakdown sections={result.sectionBreakdown || []} />
        <NextActions result={result} onRestart={onRestart} />
        <QuestionBreakdownTable questions={result.questions} />
      </main>
    </div>
  );
}
