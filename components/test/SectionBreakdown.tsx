"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BE } from "@/lib/theme";
import { fmtTime, type ResultData } from "./testAnalysisHelpers";

interface Props {
  sections: NonNullable<ResultData["sectionBreakdown"]>;
}

export default function SectionBreakdown({ sections }: Props) {
  const [expandedSec, setExpandedSec] = useState<string | null>(null);

  if (!sections?.length) return null;

  return (
    <section className="be-card p-6 md:p-10 border" style={{ borderColor: BE.line }}>
      <div className="mb-10 last:mb-0">
        <div style={{ fontSize: 11, fontWeight: 700, color: BE.textMute, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
          Paper Sections
        </div>
        <div className="space-y-6">
          {sections.map((sec, i) => {
            const accColor = sec.accuracy > 70 ? BE.good : sec.accuracy > 40 ? BE.warn : BE.bad;
            const isExpanded = expandedSec === sec.name;
            return (
              <div key={i}>
                <div className="cursor-pointer p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setExpandedSec(isExpanded ? null : sec.name)}>
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600, color: BE.text }}>
                      {sec.name}
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: BE.textMute }} />
                    </div>
                    <div className="flex items-center gap-4" style={{ fontFamily: BE.mono, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: BE.text }}>{sec.score?.toFixed?.(1).replace(/\.0$/, "") ?? sec.score} <span style={{ color: BE.textMute }}>/ {sec.max}</span></span>
                      <span style={{ color: BE.textMute }}>{sec.correct}/{sec.total} Q</span>
                      <span style={{ color: BE.textMute }}>{fmtTime(sec.timeSpentSecs)}</span>
                      <span style={{ color: accColor, fontWeight: 700 }}>{sec.accuracy?.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sec.accuracy}%`, background: accColor }} />
                  </div>
                </div>
                {isExpanded && sec.topics?.length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 space-y-4" style={{ borderColor: BE.line }}>
                    {sec.topics.map((t, j) => {
                      const tColor = t.accuracy > 70 ? BE.good : t.accuracy > 40 ? BE.warn : BE.bad;
                      return (
                        <div key={j}>
                          <div className="flex justify-between items-end mb-1">
                            <div style={{ fontSize: 13, fontWeight: 600, color: BE.textMute }}>{t.topic}</div>
                            <div className="flex items-center gap-4" style={{ fontFamily: BE.mono, fontSize: 11 }}>
                              <span style={{ color: BE.textMute }}>{t.score?.toFixed?.(1).replace(/\.0$/, "") ?? t.score} / {t.max}</span>
                              <span style={{ color: BE.textDim }}>{t.correct}/{t.total}</span>
                              <span style={{ color: BE.textDim }}>{fmtTime(t.timeSpentSecs)}</span>
                              <span style={{ color: tColor, fontWeight: 700 }}>{t.accuracy?.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                            <div className="h-full rounded-full" style={{ width: `${t.accuracy}%`, background: tColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
