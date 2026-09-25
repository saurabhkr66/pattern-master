export type YearCount = { year: number; count: number };

/** [2019, 2021, 2019] → [{2019, 2}, {2021, 1}], oldest first. */
export function countByYear(years: number[]): YearCount[] {
  const m = new Map<number, number>();
  for (const y of years) m.set(y, (m.get(y) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
}
