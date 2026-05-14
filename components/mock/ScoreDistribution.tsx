"use client";

import { useMemo } from "react";
import { BE } from "@/lib/theme";

const BUCKETS = ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"];

interface Props {
  distribution: Record<string, number>;
}

export default function ScoreDistribution({ distribution }: Props) {
  const { bars, max, total } = useMemo(() => {
    const bars = BUCKETS.map((b) => ({
      bucket: b,
      count: distribution[b] ?? 0,
    }));
    const max = Math.max(1, ...bars.map((b) => b.count));
    const total = bars.reduce((s, b) => s + b.count, 0);
    return { bars, max, total };
  }, [distribution]);

  if (total === 0) {
    return (
      <div
        className="py-8 text-center"
        style={{ color: BE.textMute, fontSize: 13 }}
      >
        Distribution will appear after the first submission.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {bars.map((b) => {
          const h = max > 0 ? (b.count / max) * 100 : 0;
          const isEmpty = b.count === 0;
          return (
            <div
              key={b.bucket}
              className="flex-1 flex flex-col items-center justify-end gap-1.5"
              title={`${b.bucket}-${
                parseInt(b.bucket, 10) + 10
              }% · ${b.count} ${b.count === 1 ? "person" : "people"}`}
            >
              <div
                style={{
                  fontFamily: BE.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  color: isEmpty ? BE.textMute : BE.text,
                }}
              >
                {b.count || ""}
              </div>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${h}%`,
                  minHeight: isEmpty ? 2 : 4,
                  background: isEmpty
                    ? BE.lineSoft
                    : `linear-gradient(to top, ${BE.accent}, ${BE.accent}cc)`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-2">
        {bars.map((b) => (
          <div
            key={b.bucket}
            className="flex-1 text-center"
            style={{
              fontFamily: BE.mono,
              fontSize: 9.5,
              color: BE.textMute,
              fontWeight: 600,
            }}
          >
            {b.bucket}
          </div>
        ))}
      </div>
      <div
        className="mt-3 text-center"
        style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: "0.04em" }}
      >
        SCORE % OF MAX · {total} {total === 1 ? "submission" : "submissions"}
      </div>
    </div>
  );
}
