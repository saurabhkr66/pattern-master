// Pure attendance helpers — date normalization, percentage, and request-body
// parsing. Dependency-free so they run in route handlers and are unit-testable in
// isolation (see coachingAttendance.test.ts). No DB / network here.

// A roll-call date is identified purely by its calendar day (YYYY-MM-DD). We store
// it as a @db.Date column, so the time-of-day and timezone are irrelevant — the
// helpers below canonicalize to a midnight-UTC Date so the same day always maps to
// the same stored value regardless of who marks it from which timezone.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize a "YYYY-MM-DD" string to itself, or null if malformed / not a real day. */
export function normalizeDateString(raw: unknown): string | null {
  if (typeof raw !== "string" || !DATE_RE.test(raw)) return null;
  // Reject impossible days (e.g. 2026-02-31): round-trip through Date and compare.
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== raw) return null;
  return raw;
}

/** A canonical midnight-UTC Date for a normalized "YYYY-MM-DD" string. */
export function dateStringToUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** A Date (or @db.Date value) back to its "YYYY-MM-DD" string. */
export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Integer attendance percentage (present / total), 0 when no sessions. */
export function attendancePercent(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

export type ParsedMarks = { studentId: string; present: boolean }[];

/**
 * Validate + normalize the roll-call marks from a POST body. Accepts the shape
 * `{ [studentId]: boolean }` and returns a flat list, or a friendly error. The
 * caller is responsible for checking the student ids actually belong to the batch
 * (tenant scoping) — this only enforces structure.
 */
export function parseMarks(raw: unknown): { error: string } | { ok: ParsedMarks } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "marks must be an object of { studentId: present }" };
  }
  const out: ParsedMarks = [];
  for (const [studentId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "boolean") {
      return { error: `mark for ${studentId} must be true or false` };
    }
    out.push({ studentId, present: value });
  }
  if (out.length === 0) {
    return { error: "no students to mark" };
  }
  return { ok: out };
}
