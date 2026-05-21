import { startOfDay, subDays } from "date-fns";
import { BE } from "@/lib/theme";
import { getCachedStatsActivity } from "../_lib/queries";

const HEAT_COLORS = ["var(--heatmap-empty)", "rgba(255,143,0,0.22)", "rgba(255,143,0,0.42)", "rgba(255,143,0,0.68)", "rgba(255,143,0,0.95)"];
const WEEKS = 26;

export default async function HeatmapSection({ userId }: { userId: string }) {
  const { activityData, currentStreak, correctAttempts } = await getCachedStatsActivity(userId);

  const heatCells = [];
  const today = startOfDay(new Date());

  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const targetDate = subDays(today, (WEEKS - 1 - w) * 7 + (6 - d));
      const dateStr = targetDate.toISOString().split("T")[0];
      const count = activityData[dateStr] || 0;
      let level = 0;
      if (count > 0) {
        if (count <= 2) level = 1;
        else if (count <= 5) level = 2;
        else if (count <= 8) level = 3;
        else level = 4;
      }
      col.push({ level, dateStr, count });
    }
    heatCells.push(col);
  }

  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 20, marginBottom: 24, background: BE.surface }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: BE.text }}>Mastery wall</div>
          <div style={{ fontSize: 12, color: BE.textDim }}>Questions correctly solved, last 26 weeks</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: BE.textMute }}>
          Less {HEAT_COLORS.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)} More
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 6, paddingTop: 14, fontSize: 9.5, color: BE.textMute, fontFamily: BE.mono }}>
          <div style={{ height: 10 }}>M</div>
          <div style={{ height: 10 }} />
          <div style={{ height: 10 }}>W</div>
          <div style={{ height: 10 }} />
          <div style={{ height: 10 }}>F</div>
          <div style={{ height: 10 }} />
          <div style={{ height: 10 }}></div>
        </div>
        <div style={{ flex: 1, overflowX: "auto" }} className="scrollbar-hide">
          <div style={{ display: "flex", gap: 3 }}>
            {heatCells.map((col, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                {col.map((cell, j) => (
                  <div key={j} title={`${cell.count} questions on ${cell.dateStr}`} style={{ height: 10, minWidth: 10, borderRadius: 2, background: HEAT_COLORS[cell.level] }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BE.line}`, fontSize: 12, color: BE.textDim }}>
        <div>Current streak: <span style={{ color: BE.warn, fontWeight: 600 }}>{currentStreak} days</span></div>
        <div>Mastery: <span style={{ color: BE.text, fontWeight: 600 }}>{correctAttempts} total</span></div>
      </div>
    </div>
  );
}
