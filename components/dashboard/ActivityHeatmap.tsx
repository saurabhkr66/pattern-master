"use client";

import { useMemo, useState } from "react";
import { format, subMonths, eachDayOfInterval, startOfToday, isSameDay, getDay, startOfWeek, endOfWeek } from "date-fns";

interface ActivityHeatmapProps {
  data: Record<string, number>;
  currentStreak: number;
}

export default function ActivityHeatmap({ data, currentStreak }: ActivityHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<{ date: string; count: number } | null>(null);

  const days = useMemo(() => {
    const today = startOfToday();
    const sixMonthsAgo = subMonths(today, 6);
    
    // Adjust to start of the week for a consistent grid
    const start = startOfWeek(sixMonthsAgo);
    const end = endOfWeek(today);

    return eachDayOfInterval({ start, end }).map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return {
        date,
        dateStr,
        count: data[dateStr] || 0,
      };
    });
  }, [data]);

  // Color scale based on count
  const getColor = (count: number) => {
    if (count === 0) return "bg-white/[0.03]";
    if (count <= 2) return "bg-indigo-500/20";
    if (count <= 5) return "bg-indigo-500/50";
    if (count <= 8) return "bg-indigo-500/80";
    return "bg-indigo-400";
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
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 mb-12 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📊</span> Mastery Wall
          </h2>
          <p className="text-xs text-white/40 font-medium mt-1 uppercase tracking-widest">Correctly solved questions in the last 6 months</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase tracking-tighter">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-white/[0.03]" />
            <div className="w-3 h-3 rounded-sm bg-indigo-500/20" />
            <div className="w-3 h-3 rounded-sm bg-indigo-500/50" />
            <div className="w-3 h-3 rounded-sm bg-indigo-500/80" />
            <div className="w-3 h-3 rounded-sm bg-indigo-400" />
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
                    className="absolute text-[9px] font-black text-white/20 uppercase tracking-tighter"
                    style={{ left: `${(m.index / weeks.length) * 100}%` }}
                  >
                    {m.label}
                  </span>
                ))}
             </div>
          </div>

          <div className="flex">
            {/* Day Labels */}
            <div className="flex flex-col justify-between pr-3 h-[100px] text-[9px] font-black text-white/10 uppercase tracking-tighter py-1">
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
                      className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] transition-all duration-300 hover:ring-2 hover:ring-white/20 cursor-pointer ${getColor(day.count)} ${
                        isSameDay(day.date, startOfToday()) ? "ring-1 ring-white/10" : ""
                      }`}
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
             <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                {format(new Date(hoveredDate.date), "MMMM d, yyyy")}
             </p>
          </div>
        )}
      </div>

      {/* Summary Stat */}
      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-white/30 uppercase tracking-tight">
        <span>Current Streak: <span className="text-orange-400">{currentStreak} Day{currentStreak === 1 ? '' : 's'}</span></span>
        <span>Total Mastered Recently: <span className="text-indigo-400">{Object.values(data).reduce((a, b) => a + b, 0)}</span></span>
      </div>
    </div>
  );
}
