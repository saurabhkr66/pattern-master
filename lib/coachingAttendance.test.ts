// Unit tests for the pure attendance helpers — date normalization, percentage,
// and roll-call body parsing. Pure module, no DB / network.
//
// Run:  npx tsx --test lib/coachingAttendance.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDateString,
  dateStringToUTC,
  toDateString,
  attendancePercent,
  parseMarks,
} from "./coachingAttendance";

test("normalizeDateString: accepts a real day, rejects junk", () => {
  assert.equal(normalizeDateString("2026-06-25"), "2026-06-25");
  assert.equal(normalizeDateString("2026-2-5"), null); // not zero-padded
  assert.equal(normalizeDateString("25-06-2026"), null); // wrong order
  assert.equal(normalizeDateString("2026-13-01"), null); // no month 13
  assert.equal(normalizeDateString("2026-02-31"), null); // Feb has no 31st
  assert.equal(normalizeDateString(""), null);
  assert.equal(normalizeDateString(20260625), null);
  assert.equal(normalizeDateString(null), null);
});

test("date round-trips through UTC midnight regardless of representation", () => {
  const s = "2026-06-25";
  const d = dateStringToUTC(s);
  assert.equal(d.toISOString(), "2026-06-25T00:00:00.000Z");
  assert.equal(toDateString(d), s);
});

test("attendancePercent: rounds, and is 0 with no sessions", () => {
  assert.equal(attendancePercent(0, 0), 0);
  assert.equal(attendancePercent(5, 0), 0);
  assert.equal(attendancePercent(10, 10), 100);
  assert.equal(attendancePercent(1, 3), 33); // 33.33 → 33
  assert.equal(attendancePercent(2, 3), 67); // 66.66 → 67
  assert.equal(attendancePercent(0, 4), 0);
});

test("parseMarks: maps an object to a flat list", () => {
  const r = parseMarks({ a: true, b: false });
  assert.ok("ok" in r);
  if ("ok" in r) {
    assert.deepEqual(
      [...r.ok].sort((x, y) => x.studentId.localeCompare(y.studentId)),
      [
        { studentId: "a", present: true },
        { studentId: "b", present: false },
      ]
    );
  }
});

test("parseMarks: rejects non-object, array, empty, and non-boolean values", () => {
  assert.ok("error" in parseMarks(null));
  assert.ok("error" in parseMarks("nope"));
  assert.ok("error" in parseMarks([{ a: true }]));
  assert.ok("error" in parseMarks({}));
  assert.ok("error" in parseMarks({ a: "yes" }));
  assert.ok("error" in parseMarks({ a: 1 }));
});
