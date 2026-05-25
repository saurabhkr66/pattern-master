import { formatDistanceToNow } from "date-fns";
import { BE } from "@/lib/theme";
import { getCachedRecentAttempts } from "../_lib/queries";

export default async function RecentActivitySection({ userId }: { userId: string }) {
  const { lastFiveAttempts } = await getCachedRecentAttempts(userId);

  if (lastFiveAttempts.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: BE.text }}>Recent activity</div>
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, overflow: "hidden", background: BE.surface }}>
        {lastFiveAttempts.map((attempt: any, i: number, arr: any[]) => {
          const topicName = attempt.question?.pattern?.topic_name ?? attempt.pyq?.pattern?.topic_name ?? "Unknown";
          const subject = attempt.question?.pattern?.subject ?? attempt.pyq?.pattern?.subject ?? "Unknown";
          const when = formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true }).replace("about ", "").replace("almost ", "");
          const r = attempt.is_correct ? "correct" : "wrong";

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderBottom: i === arr.length - 1 ? "none" : `1px solid ${BE.line}` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: r === "correct" ? BE.good : BE.bad, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: BE.text }}>{topicName}</span>
                <span style={{ color: BE.textMute, marginLeft: 8 }} className="hidden sm:inline">· {subject}</span>
              </div>
              <div style={{ fontSize: 11, color: BE.textMute, fontFamily: BE.mono }}>{when}</div>
              <div style={{ fontSize: 11, color: r === "correct" ? BE.good : BE.bad, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.06, minWidth: 60, textAlign: "right" }}>{r}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
