"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BE } from "@/lib/theme";
import { shareOrWhatsApp } from "@/lib/whatsappShare";

// The DPP tab inside PatternRow, sitting alongside Question bank / Previous year
// / Mastery notes so students meet DPPs where they already work, instead of at a
// separate page nobody navigates to.
//
// Fetched lazily (the tab only mounts when opened), so opening a topic row costs
// nothing extra for the common case.
//
// Each row carries a plain SHEET share — distinct from ShareChallenge, which
// shares a finished run's score. There is no score here (nobody has taken it
// yet), so the pitch is the sheet itself and the link goes to the public mode
// picker. That works for a signed-out recipient now that an attempt no longer
// requires an account.

type DppItem = {
  id: string;
  name: string;
  questionCount: number;
  bestScore: number | null;
  bestMaxScore: number | null;
  bestRunCode: string | null;
};

export default function DppTabPanel({
  patternId,
  topicName,
}: {
  patternId: string;
  topicName: string;
}) {
  function shareSheet(d: DppItem) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    void shareOrWhatsApp({
      title: d.name,
      text:
        `📘 Try this DPP — ${d.name} (${topicName}), ${d.questionCount} questions. ` +
        `No sign-up needed to start.`,
      url: `${base}/dpp/${d.id}?via=tab`,
    });
  }

  const { data, isLoading, isError } = useQuery<{ dpps: DppItem[] }>({
    queryKey: ["dppForPattern", patternId],
    queryFn: async () => {
      const res = await fetch(`/api/dpp/for-pattern/${patternId}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ padding: "28px 4px", textAlign: "center", fontSize: 13, color: BE.textMute }}>
        Loading DPPs…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: "28px 4px", textAlign: "center", fontSize: 13, color: BE.bad }}>
        Couldn&apos;t load DPPs. Try again in a moment.
      </div>
    );
  }

  const dpps = data?.dpps ?? [];
  if (dpps.length === 0) {
    return (
      <div style={{ padding: "28px 4px", textAlign: "center", fontSize: 13, color: BE.textMute }}>
        No DPPs for this topic yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
      <div style={{ fontSize: 11.5, color: BE.textMute, marginBottom: 2 }}>
        Short curated sets. Take one as a timed test, then challenge a friend.
      </div>

      {dpps.map((d) => {
        const done = d.bestScore !== null && d.bestMaxScore !== null;
        return (
          // The share button is a SIBLING of the link, not inside it — nesting a
          // button in an anchor is invalid and makes the tap target ambiguous.
          <div
            key={d.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 14px",
              borderRadius: 11,
              border: `1px solid ${BE.line}`,
              background: BE.surface,
            }}
          >
            <Link
              href={`/dpp/${d.id}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                color: BE.text,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</div>
                <div style={{ fontSize: 11.5, color: BE.textDim, marginTop: 2 }}>
                  {d.questionCount} questions
                </div>
              </div>

              {done && (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: BE.goodSoft,
                    color: BE.good,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.bestScore}/{d.bestMaxScore}
                </span>
              )}

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: BE.accent,
                  whiteSpace: "nowrap",
                }}
              >
                {done ? "Retake →" : "Start →"}
              </span>
            </Link>

            <button
              onClick={() => shareSheet(d)}
              aria-label={`Share ${d.name}`}
              title="Share this DPP"
              style={{
                flexShrink: 0,
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${BE.line}`,
                background: "transparent",
                color: BE.textDim,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Share
            </button>
          </div>
        );
      })}
    </div>
  );
}
