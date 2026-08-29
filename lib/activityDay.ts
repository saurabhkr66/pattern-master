import { Prisma } from "@prisma/client";

// The day boundary for the dashboard streak and the activity heatmap.
//
// `Attempt.created_at` is `timestamp(3)` WITHOUT time zone (no `@db.Timestamptz`
// on the field in prisma/schema/schema.prisma), so the stored value is plain UTC
// wall time. Bucketing it with a bare `DATE(created_at)` rolls the day over at
// 05:30 IST — precisely when this audience is most likely to be practising:
//
//   * a session at 1 AM IST was credited to the previous day, so the heatmap
//     cell for "today" stayed dark until after sunrise;
//   * worse, a student who worked Mon 11 PM, Tue 2 AM and Wed morning had both
//     late sessions land on Mon UTC, leaving Tue empty and resetting a streak
//     they had in fact kept.
//
// Every bucket is therefore an Asia/Kolkata civil day, on both the SQL and the
// JS side of the same query, and the SQL emits the key as TEXT so no driver
// date-parsing (node-postgres materialises a bare `date` at *local* midnight)
// can shift it back on the way out.

/**
 * SQL that buckets an Attempt row into its IST civil day, as a `YYYY-MM-DD`
 * string. Use it in both the SELECT list and the GROUP BY.
 *
 * ⚠️ The first `AT TIME ZONE 'UTC'` is what re-labels the naive column as UTC.
 * If `created_at` is ever migrated to `timestamptz`, DROP that first conversion
 * — applying it to an already-zoned value converts in the wrong direction.
 */
export const IST_DAY_SQL = Prisma.sql`TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`;

// India has a single zone and no DST, so a fixed offset is exact.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * A Date parked at UTC midnight whose ISO date *is* the IST civil date of
 * `instant`. Anchoring in UTC is what makes the walk below independent of the
 * server's own timezone — the old code mixed `startOfDay()` (server-local) with
 * `toISOString()` (UTC), which round-tripped only on a UTC host and silently
 * shifted the whole dashboard back a day on an IST dev box.
 */
export function istDayAnchor(instant: Date = new Date()): Date {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return shifted;
}

/** The `YYYY-MM-DD` key for an anchor — matches what `IST_DAY_SQL` returns. */
export function dayKey(anchor: Date): string {
  return anchor.toISOString().slice(0, 10);
}

/** Step an anchor by whole days, staying on the UTC-midnight grid. */
export function addDays(anchor: Date, days: number): Date {
  const next = new Date(anchor);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Consecutive active days ending today, or yesterday if today is still empty —
 * an unfinished day must not read as a broken streak.
 */
export function computeStreak(
  hasActivity: (day: string) => boolean,
  instant?: Date,
): number {
  let cursor = istDayAnchor(instant);
  if (!hasActivity(dayKey(cursor))) cursor = addDays(cursor, -1);

  let streak = 0;
  while (hasActivity(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
