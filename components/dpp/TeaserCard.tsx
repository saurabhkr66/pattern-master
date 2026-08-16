import Link from "next/link";
import { BE } from "@/lib/theme";

// What a signed-out visitor (and WhatsApp's crawler) sees at /dpp/r/[code].
//
// Deliberately contains ZERO question content — no text, no options, no
// explanations. Only the four facts that make the pitch: who challenged you,
// what they scored, which topic, and how many questions.

export type Teaser = {
  code: string;
  displayName: string;
  score: number;
  maxScore: number;
  timeTakenSecs: number | null;
  dppId: string;
  dppName: string;
  topicName: string;
  examType: string;
  questionCount: number;
};

function fmtTime(secs: number | null): string | null {
  if (!secs || secs < 1) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function TeaserCard({
  teaser,
  signedIn,
  via,
}: {
  teaser: Teaser;
  signedIn: boolean;
  via?: string | null;
}) {
  // Signed out goes to the SAME place as signed in. The sign-in wall moved to
  // /dpp/claim/[runId] (after they submit) — asking a stranger for an account
  // before they have answered anything is the single biggest drop-off in this
  // funnel. `via` rides along so the child run records the channel it arrived
  // through.
  const href =
    `/dpp/${teaser.dppId}?c=${encodeURIComponent(teaser.code)}` +
    (via ? `&via=${encodeURIComponent(via)}` : "");
  const time = fmtTime(teaser.timeTakenSecs);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px", color: BE.text }}>
      <div
        style={{
          background: BE.surface,
          border: `1px solid ${BE.line}`,
          borderRadius: 18,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: BE.textDim }}>
          {teaser.displayName} challenged you
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: BE.accent,
            lineHeight: 1.1,
            margin: "10px 0 2px",
          }}
        >
          {teaser.score}
          <span style={{ fontSize: 26, color: BE.textDim }}>/{teaser.maxScore}</span>
        </div>
        {time && (
          <div style={{ fontSize: 12.5, color: BE.textMute }}>finished in {time}</div>
        )}

        <div style={{ marginTop: 18, fontSize: 17, fontWeight: 700 }}>{teaser.dppName}</div>
        <div style={{ fontSize: 13, color: BE.textDim, marginTop: 3 }}>
          {teaser.examType} · {teaser.topicName}
        </div>
        <div style={{ fontSize: 12.5, color: BE.textMute, marginTop: 3 }}>
          {teaser.questionCount} questions · no negative marking
        </div>

        <Link
          href={href}
          style={{
            display: "block",
            marginTop: 22,
            padding: "14px 18px",
            borderRadius: 12,
            background: BE.accent,
            color: "#1a1205",
            fontWeight: 800,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Take the challenge
        </Link>

        {!signedIn && (
          <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 10 }}>
            No sign-up needed to start. Takes a couple of minutes.
          </div>
        )}
      </div>
    </div>
  );
}
