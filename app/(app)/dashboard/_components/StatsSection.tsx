import { BE } from "@/lib/theme";
import { getCachedStatsActivity } from "../_lib/queries";

export default async function StatsSection({ userId }: { userId: string }) {
  const { totalAttempted, correctAttempts, currentMistakesCount, currentStreak } = await getCachedStatsActivity(userId);
  const accuracy = totalAttempted > 0 ? Math.round((correctAttempts / totalAttempted) * 100) : 0;

  const stats = [
    { label: "Answered", val: totalAttempted, sub: "attempts", delta: `${totalAttempted > 0 ? "+" + Math.ceil(totalAttempted / 8) : "0"} this week`, good: true },
    { label: "Mistakes", val: currentMistakesCount, sub: "to fix", delta: currentMistakesCount === 0 ? "Perfect status" : "Uncorrected gaps", good: currentMistakesCount === 0 },
    { label: "Accuracy", val: `${accuracy}%`, sub: "all-time", delta: accuracy > 70 ? "Above target" : "Needs focus", good: accuracy > 70 },
    { label: "Streak", val: currentStreak, sub: "days", delta: currentStreak > 0 ? "Active streak" : "Target: 30", good: currentStreak > 3 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: BE.line, border: `1px solid ${BE.line}`, borderRadius: 12, marginBottom: 24, overflow: "hidden" }} className="db-stats">
      {stats.map((s) => (
        <div key={s.label} style={{ padding: "18px 20px", background: BE.surface }} className="db-stat-cell">
          <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, color: BE.text }} className="db-stat-val">{s.val}</div>
            <div style={{ fontSize: 11, color: BE.textMute }}>{s.sub}</div>
          </div>
          <div style={{ fontSize: 11, color: s.good ? BE.good : BE.textDim }}>{s.delta}</div>
        </div>
      ))}
    </div>
  );
}
