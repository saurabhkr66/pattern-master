import { BE } from "@/lib/theme";
import { compareLeaderboard } from "@/lib/coachingLeaderboard";

// "You vs them" — shown on the result page when this run came from a challenge.
//
// The verdict uses compareLeaderboard from lib/coachingLeaderboard: score desc,
// then time asc, then submittedAt asc. That is exactly the stated rule (score
// first, time as tiebreak) and reusing it means the two surfaces can't disagree.

type Side = {
  name: string;
  score: number;
  maxScore: number;
  timeTakenSecs: number | null;
  submittedAt: Date | null;
};

function fmtTime(secs: number | null): string {
  if (!secs || secs < 1) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** compareLeaderboard wants epoch-ms and only these three fields. A missing
 *  submittedAt sorts last, matching how it treats a missing time. */
function toEntry(x: Side) {
  return {
    score: x.score,
    timeTakenSecs: x.timeTakenSecs,
    submittedAt: x.submittedAt ? x.submittedAt.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

export default function ChallengeStrip({ you, them }: { you: Side; them: Side }) {
  // Negative → `you` sorts first → you won.
  const cmp = compareLeaderboard(toEntry(you), toEntry(them));
  const verdict = cmp < 0 ? "won" : cmp > 0 ? "lost" : "tied";

  const tone =
    verdict === "won" ? BE.good : verdict === "lost" ? BE.bad : BE.warn;
  const toneSoft =
    verdict === "won" ? BE.goodSoft : verdict === "lost" ? BE.badSoft : BE.warnSoft;

  const headline =
    verdict === "won"
      ? `You beat ${them.name}`
      : verdict === "lost"
        ? `${them.name} beat you`
        : `You and ${them.name} tied`;

  return (
    <div
      style={{
        background: toneSoft,
        border: `1px solid ${tone}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: tone }}>{headline}</div>

      <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { label: "You", side: you },
          { label: them.name, side: them },
        ].map(({ label, side }) => (
          <div key={label} style={{ minWidth: 110 }}>
            <div style={{ fontSize: 11.5, color: BE.textMute, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: BE.text, lineHeight: 1.2 }}>
              {side.score}
              <span style={{ fontSize: 14, color: BE.textDim }}>/{side.maxScore}</span>
            </div>
            <div style={{ fontSize: 11.5, color: BE.textMute }}>{fmtTime(side.timeTakenSecs)}</div>
          </div>
        ))}
      </div>

      {you.score === them.score && (
        <div style={{ fontSize: 11.5, color: BE.textMute, marginTop: 10 }}>
          Same score — decided on time taken.
        </div>
      )}
    </div>
  );
}
