import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import { getCachedRecentAttempts } from "../_lib/queries";

export default async function CriticalReviewSection({ userId }: { userId: string }) {
  const { recentFailures } = await getCachedRecentAttempts(userId);

  if (recentFailures.length === 0) return null;

  const reviewItems = recentFailures.map((a: any) => {
    const q = a.question ?? a.pyq ?? a.subject_pyq;
    const pattern = q?.pattern ?? (q?.subject_pattern ? {
      topic_name: q.topic || ((q.subject_pattern.subject_name && q.subject_pattern.subject_name !== "null") ? q.subject_pattern.subject_name : "Subject Practice"),
      subject: (q.subject_pattern.subject_name && q.subject_pattern.subject_name !== "null") ? q.subject_pattern.subject_name : "Subject Practice",
      id: `subject-${q.subject_pattern.id}`,
      exam_type: "GATE",
    } : {
      topic_name: "Subject Practice",
      subject: "Subject Practice",
      id: q?.id ? `subject-${q.id}` : "unknown",
      exam_type: "GATE",
    });
    const patternId = q?.pattern?.id || (q?.subject_pattern ? `subject-${q.subject_pattern.id}` : "unknown");
    return {
      id: a.id,
      question_text: q?.question_text,
      topic_name: pattern?.topic_name,
      subject: pattern?.subject,
      age: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }).replace("about ", "").replace("almost ", ""),
      practiceUrl: `/practice?patternId=${patternId}&questionId=${q?.id || ""}&subject=${encodeURIComponent(pattern?.subject || "All")}`,
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
            <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5, fontFamily: BE.serif, fontStyle: "italic", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BE.line}` }} className="line-clamp-2">
              <MathRenderer content={(r.question_text && r.question_text !== "null") ? r.question_text : "No question text available"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
