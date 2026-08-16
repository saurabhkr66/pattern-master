import Link from "next/link";
import { BE } from "@/lib/theme";

// Closes the loop's other half: ShareChallenge is the OUTGOING challenge, this
// is what tells the owner someone came back and beat them. There's no
// push/email in this app, so it's necessarily passive — it surfaces the next
// time the owner opens their own result link — but the rematch link re-enters
// the exact "score to beat" banner app/dpp/[dppId]/page.tsx already renders,
// so accepting it chains the referral tree instead of dead-ending it.

export default function RematchBanner({
  dppId,
  name,
  score,
  maxScore,
  shareCode,
}: {
  dppId: string;
  name: string;
  score: number;
  maxScore: number;
  shareCode: string;
}) {
  return (
    <div
      style={{
        background: BE.badSoft,
        border: `1px solid ${BE.bad}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: BE.bad }}>
        {name} beat your score — {score}/{maxScore}
      </div>
      <Link
        href={`/dpp/${dppId}?c=${encodeURIComponent(shareCode)}`}
        style={{
          display: "inline-block",
          marginTop: 10,
          padding: "9px 14px",
          borderRadius: 10,
          background: BE.accent,
          color: "#1a1205",
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        Take it again to reclaim your score
      </Link>
    </div>
  );
}
