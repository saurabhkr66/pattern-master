import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BE } from "@/lib/theme";
import { getCachedRecentAttempts } from "../_lib/queries";

function toPreview(text: string, max = 140): string {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, "[math]")
    .replace(/\$[^$\n]+?\$/g, "[math]")
    .replace(/\\\[[\s\S]*?\\\]/g, "[math]")
    .replace(/\\\([\s\S]*?\\\)/g, "[math]")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .concat(text.length > max ? "…" : "");
}

export default async function CriticalReviewSection({ userId }: { userId: string }) {
  const { recentFailures } = await getCachedRecentAttempts(userId);

  if (recentFailures.length === 0) return null;

  const reviewItems = recentFailures.map((a: any) => {
    // A DPP question is not in GeneratedQuestion or PYQ, so the generic
    // /practice feed cannot serve it — its own practice route can. Resolved
    // first so the branch below is a single decision.
    const dppQ = a.dpp_question;
    const q = a.question ?? a.pyq ?? dppQ;
    const pattern = (dppQ ? dppQ.dpp?.pattern : q?.pattern) ?? {
      topic_name: "Unknown",
      subject: "Unknown",
      id: "unknown",
      exam_type: "GATE",
    };
    const patternId = pattern?.id || "unknown";
    return {
      id: a.id,
      question_text: q?.question_text,
      topic_name: pattern?.topic_name,
      subject: pattern?.subject,
      age: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }).replace("about ", "").replace("almost ", ""),
      practiceUrl: dppQ
        ? `/dpp/${dppQ.dpp?.id}/practice`
        : `/practice?patternId=${patternId}&questionId=${q?.id || ""}&subject=${encodeURIComponent(pattern?.subject || "All")}${(pattern as any)?.exam_type ? `&exam=${encodeURIComponent((pattern as any).exam_type)}` : ""}${(pattern as any)?.branch ? `&branch=${encodeURIComponent((pattern as any).branch)}` : ""}`,
    };
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>
          Critical review <span style={{ fontSize: 11, color: BE.bad, marginLeft: 6, fontWeight: 500 }}>· {reviewItems.length} to revisit</span>
        </div>
        <a href="/review" style={{ fontSize: 12, color: BE.accent, textDecoration: "none" }}>See all →</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }} className="db-review-grid">
        {reviewItems.slice(0, 4).map((r: any, i: number) => (
          <div key={i} style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: BE.text }}>{r.topic_name}</div>
                <div style={{ fontSize: 11, color: BE.textMute }}>{r.subject} · {r.age}</div>
              </div>
              <Link href={r.practiceUrl} style={{ fontSize: 11, color: BE.accent, fontWeight: 500, cursor: "pointer", flexShrink: 0, marginLeft: 8, textDecoration: "none" }}>
                Solve again →
              </Link>
            </div>
            <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5, fontFamily: BE.serif, fontStyle: "italic", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BE.line}`, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {(r.question_text && r.question_text !== "null") ? toPreview(r.question_text) : "No question text available"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
