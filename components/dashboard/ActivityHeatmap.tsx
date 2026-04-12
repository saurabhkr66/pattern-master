"use client";

import { useMemo, useState } from "react";
import { format, subMonths, eachDayOfInterval, startOfToday, isSameDay, /*getDay,*/ startOfWeek /*, endOfWeek*/ } from "date-fns";

interface ActivityHeatmapProps {
  data: Record<string, number>;
  currentStreak: number;
}

export default function ActivityHeatmap({ data, currentStreak }: ActivityHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<{ date: string; count: number } | null>(null);

  const days = useMemo(() => {
    const today = startOfToday();
    const sixMonthsAgo = subMonths(today, 6);

    // Start at beginning of the first week, end at today (no future days)
    const start = startOfWeek(sixMonthsAgo);
    const end = today;

    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return {
        date,
        dateStr,
        count: data[dateStr] || 0,
      };
    });
  }, [data]);

  // Color scale based on count — returns CSSProperties for theme-aware coloring
  const getCellStyle = (count: number): React.CSSProperties => {
    if (count === 0) return { background: "var(--border-strong)" };
    if (count <= 2) return { background: "rgba(99,102,241,0.25)" };
    if (count <= 5) return { background: "rgba(99,102,241,0.55)" };
    if (count <= 8) return { background: "rgba(99,102,241,0.82)" };
    return { background: "#818cf8" };
  };

  // Group days into weeks for column-based rendering (like GitHub)
  const weeks = useMemo(() => {
    const result: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = "";

    weeks.forEach((week, i) => {
      const firstDayOfWeek = week[0].date;
      const monthName = format(firstDayOfWeek, "MMM");
      if (monthName !== lastMonth) {
        labels.push({ label: monthName, index: i });
        lastMonth = monthName;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div
      className="rounded-2xl p-6 md:p-8 mb-12"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <span>📊</span> Mastery Wall
          </h2>
          <p className="text-xs font-medium mt-1 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Correctly solved questions in the last 6 months</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter" style={{ color: "var(--text-muted)" }}>
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm" style={getCellStyle(0)} />
            <div className="w-3 h-3 rounded-sm" style={getCellStyle(1)} />
            <div className="w-3 h-3 rounded-sm" style={getCellStyle(3)} />
            <div className="w-3 h-3 rounded-sm" style={getCellStyle(7)} />
            <div className="w-3 h-3 rounded-sm" style={getCellStyle(9)} />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-x-auto pb-4 scrollbar-hide flex flex-col">
          {/* Month Labels */}
          <div className="flex mb-2 h-4 relative">
             <div className="w-8 shrink-0" /> {/* Spacer for day labels */}
             <div className="flex flex-1 relative">
                {monthLabels.map((m, i) => (
                  <span
                    key={i}
                    className="absolute text-[9px] font-black uppercase tracking-tighter"
                    style={{ left: `${(m.index / weeks.length) * 100}%`, color: "var(--text-faint)" }}
                  >
                    {m.label}
                  </span>
                ))}
             </div>
          </div>

          <div className="flex">
            {/* Day Labels */}
            <div className="flex flex-col justify-between pr-3 h-[100px] text-[9px] font-black uppercase tracking-tighter py-1" style={{ color: "var(--text-faint)" }}>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* The Grid */}
            <div className="flex gap-1.5 flex-1 justify-between">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.dateStr}
                      onMouseEnter={() => setHoveredDate({ date: day.dateStr, count: day.count })}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] transition-all duration-300 hover:ring-2 hover:ring-white/20 cursor-pointer ${
                        isSameDay(day.date, startOfToday()) ? "ring-1 ring-white/10" : ""
                      }`}
                      style={getCellStyle(day.count)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredDate && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 px-3 py-2 rounded-lg shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
             <p className="text-[10px] font-black text-white whitespace-nowrap">
                {hoveredDate.count} {hoveredDate.count === 1 ? 'question' : 'questions'} solved
             </p>
             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                {format(new Date(hoveredDate.date), "MMMM d, yyyy")}
             </p>
          </div>
        )}
      </div>

      {/* Summary Stat */}
      <div className="mt-6 pt-6 border-t flex items-center justify-between text-xs font-bold uppercase tracking-tight" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <span>Current Streak: <span className="text-orange-400">{currentStreak} Day{currentStreak === 1 ? '' : 's'}</span></span>
        <span>Total Mastered Recently: <span className="text-indigo-400">{Object.values(data).reduce((a, b) => a + b, 0)}</span></span>
      </div>
    </div>
  );
}
