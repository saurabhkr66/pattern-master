// k6 load test for the coaching test engine: the REAL student journey
//   login (scrypt verify)  →  open test page (uncached findFirst + attempt create)
//   →  think  →  autosave (Redis)  →  submit (grade + DB write + leaderboard bust)
//
// No Clerk: students auth with a signed cookie minted by /api/student/login.
// k6's per-VU cookie jar carries it through the rest of the flow automatically.
//
// Each VU maps to ONE seeded student via __VU (phone = PHONE_BASE + __VU - 1),
// because the login rate limit is per (coaching, phone). Seed first:
//   node --env-file=.env.local loadtest/seed-students.mjs --slug=demo --count=500
//
// Run (ramp to 500 against a NON-PROD preview backed by a Neon dev branch):
//   k6 run -e BASE_URL=https://preview.example.com -e SLUG=demo \
//          -e TEST_ID=<coachingTestId> loadtest/test-flow.js
//
// The target test must be status="active" and inside its start_at/end_at window,
// or the page returns a "not available" shell and no attempt is created.

import http from "k6/http";
import { check, sleep, group, fail } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import exec from "k6/execution";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SLUG = __ENV.SLUG || "demo";
const TEST_ID = __ENV.TEST_ID;
const PHONE_BASE = Number(__ENV.PHONE_BASE || 9000000000);
const PIN = __ENV.PIN || "1234";
// Compress think time so a run finishes fast. Real tests are minutes long; the
// server load that matters is the open spike and the submit spike, not the wait.
const THINK_SECS = Number(__ENV.THINK_SECS || 5);

if (!TEST_ID) throw new Error("Set -e TEST_ID=<coachingTestId>");

// ── Custom metrics so each phase is visible separately ──────────────────────
const loginDur = new Trend("phase_login_ms", true);
const openDur = new Trend("phase_open_ms", true);
const submitDur = new Trend("phase_submit_ms", true);
const flowErrors = new Rate("flow_errors");
const attemptMissed = new Counter("attempt_id_not_found");

// Each k6 iteration must use a DISTINCT seeded student: once a student submits,
// re-opening redirects to results (no attempt to submit again). So we map the
// student by the GLOBAL iteration counter, not by __VU — a looping VU therefore
// advances to the next unseen student instead of re-hitting its own.
//
// SMOKE=1 → a few VUs for a short time to validate the flow.
// Default   → BATCH_VUS students each run the journey EXACTLY ONCE (the real
//             "N students open + submit at the same time" shape). Keep
//             BATCH_VUS <= the seeded student COUNT or you'll run out and the
//             tail iterations will reuse already-submitted students.
const SMOKE = __ENV.SMOKE === "1";
const BATCH_VUS = Number(__ENV.BATCH_VUS || 500);
const SEEDED_COUNT = Number(__ENV.COUNT || 500);

export const options = {
  scenarios: SMOKE
    ? {
        smoke: {
          executor: "constant-vus",
          vus: Number(__ENV.VUS || 5),
          duration: __ENV.DURATION || "30s",
        },
      }
    : {
        batch: {
          // One journey per student, BATCH_VUS of them as concurrently as k6 can
          // spin VUs up — models a whole class hitting "Start" together.
          executor: "per-vu-iterations",
          vus: BATCH_VUS,
          iterations: 1,
          maxDuration: __ENV.MAX_DURATION || "5m",
        },
      },
  thresholds: {
    // Tune to your SLO. These are starting points.
    "phase_login_ms": ["p(95)<2500"], // scrypt — expect this to be the slowest
    "phase_open_ms": ["p(95)<2000"],
    "phase_submit_ms": ["p(95)<2000"],
    "http_req_failed": ["rate<0.02"],
    "flow_errors": ["rate<0.02"],
  },
};

const alreadySubmitted = new Counter("already_submitted_redirect");

function phoneForIter() {
  // Global, monotonic across all VUs → each iteration gets a fresh student.
  const idx = exec.scenario.iterationInTest;
  if (idx >= SEEDED_COUNT) {
    // Ran past the seeded pool — students from here on may already be submitted.
    // Wrap so the request still goes out, but expect already-submitted redirects.
    return String(PHONE_BASE + (idx % SEEDED_COUNT));
  }
  return String(PHONE_BASE + idx);
}

// Pull the attempt id out of the server-rendered RSC payload. The page passes
// attemptId={attempt.id} into <StudentTestRunner>; in the flight stream it shows
// up as "attemptId":"<uuid>" (quotes may be backslash-escaped). Try both.
function extractAttemptId(body) {
  let m = body.match(/"attemptId":"([0-9a-f-]{36})"/);
  if (m) return m[1];
  m = body.match(/\\"attemptId\\":\\"([0-9a-f-]{36})\\"/);
  if (m) return m[1];
  return null;
}

export default function () {
  // Spread arrivals over a window so 500 VUs don't open 500 TCP connections in
  // the same microsecond (which overflows a single server's accept backlog — an
  // artifact that never happens in reality; even a class clicking "Start" spreads
  // over seconds). On real serverless behind a load balancer this matters less,
  // but keeping it makes the test represent human arrival, not a synthetic spike.
  const spread = Number(__ENV.START_SPREAD_SECS || 20);
  if (spread > 0) sleep(Math.random() * spread);

  const phone = phoneForIter();
  const jar = http.cookieJar(); // per-VU, isolates each student's session

  // 1) LOGIN ─ POST phone + PIN, server sets the signed student_session cookie.
  let attemptId = null;
  group("login", function () {
    const res = http.post(
      `${BASE_URL}/api/student/login`,
      JSON.stringify({ slug: SLUG, phone, pin: PIN }),
      { headers: { "Content-Type": "application/json" }, tags: { phase: "login" } }
    );
    loginDur.add(res.timings.duration);
    const ok = check(res, {
      "login 200": (r) => r.status === 200,
      "login set cookie": () =>
        Object.keys(jar.cookiesForURL(BASE_URL)).includes("student_session"),
    });
    if (!ok) {
      flowErrors.add(1);
      // 429 = rate-limited (VU count > seeded students, or reusing phones).
      if (res.status === 429) fail(`rate limited at phone ${phone} — seed more students`);
      fail(`login failed (${res.status}) for ${phone}`);
    }
    // `next start` runs NODE_ENV=production, so studentAuth sets the session
    // cookie with `Secure` — which k6 (like a browser) will NOT send over plain
    // http://localhost, so the next request looks unauthenticated and the page
    // redirects to /login (no attemptId). Prod is HTTPS where Secure is correct;
    // this only bites local http load tests. Re-set the same cookie WITHOUT
    // Secure so the rest of the journey is authenticated. No-op over https.
    if (BASE_URL.startsWith("http://")) {
      const sc = res.cookies && res.cookies.student_session;
      if (sc && sc[0]) jar.set(BASE_URL, "student_session", sc[0].value, { path: "/" });
    }
  });

  // 2) OPEN ─ GET the test page. This is the uncached coachingTest.findFirst +
  // the jittered attempt create. Body carries the attemptId we need to submit.
  group("open", function () {
    const res = http.get(`${BASE_URL}/c/${SLUG}/test/${TEST_ID}`, {
      tags: { phase: "open" },
    });
    openDur.add(res.timings.duration);
    const ok = check(res, { "open 200": (r) => r.status === 200 });
    if (!ok) {
      flowErrors.add(1);
      return;
    }
    // A student who already submitted is redirected to the result page (k6
    // follows it). That's a valid state, not a failure — count it and move on.
    if (res.url && res.url.indexOf("/result/") !== -1) {
      alreadySubmitted.add(1);
      return;
    }
    attemptId = extractAttemptId(res.body);
    if (!attemptId) {
      attemptMissed.add(1);
      flowErrors.add(1);
      // Likely the test isn't active / window closed (page rendered a shell), or
      // the serialization changed. DEBUG=1 dumps the first VU's body once.
      if (__ENV.DEBUG === "1" && __VU === 1 && __ITER === 0) {
        const body = res.body || "";
        console.log(`\n--- open status ${res.status}, ${body.length} bytes ---`);
        console.log("has 'attemptId': " + body.includes("attemptId"));
        console.log("has 'StudentTestRunner': " + body.includes("StudentTestRunner"));
        ["Test closed", "Not started", "not available", "No questions", "Could not start"].forEach(
          (s) => body.includes(s) && console.log(`SHELL MESSAGE: "${s}"`)
        );
        const idx = body.indexOf("attemptId");
        if (idx >= 0) console.log("context: " + body.slice(idx - 20, idx + 80));
        else console.log("first 800 bytes:\n" + body.slice(0, 800));
      }
    }
  });

  if (!attemptId) {
    sleep(1);
    return;
  }

  // 3) THINK + one AUTOSAVE ─ autosave is a pure Redis SET (no DB). Fire one to
  // exercise that path; the real client fires every 120s.
  http.patch(
    `${BASE_URL}/api/student/test/${TEST_ID}/save`,
    JSON.stringify({ draftId: attemptId, state: { mcqAnswers: {}, timeSpentMap: {} } }),
    { headers: { "Content-Type": "application/json" }, tags: { phase: "autosave" } }
  );
  sleep(THINK_SECS);

  // 4) SUBMIT ─ grade + the heavy DB write + leaderboard invalidation. Empty
  // answers still drive the full grade/write/invalidate path (score 0); set
  // SEND_ANSWERS to also exercise answer-map building with the rendered ids.
  group("submit", function () {
    const res = http.post(
      `${BASE_URL}/api/student/test/${TEST_ID}/submit`,
      JSON.stringify({ attemptId, answers: [], timeTakenSecs: THINK_SECS }),
      { headers: { "Content-Type": "application/json" }, tags: { phase: "submit" } }
    );
    submitDur.add(res.timings.duration);
    const ok = check(res, {
      // 403 = past deadline (server refused) — a valid outcome, not a failure.
      "submit ok/expired": (r) => r.status === 200 || r.status === 403,
    });
    if (!ok) flowErrors.add(1);
  });

  // 5) Optional: the whole batch hammers the leaderboard right after submitting.
  if (__ENV.HIT_LEADERBOARD === "1") {
    http.get(`${BASE_URL}/c/${SLUG}/leaderboard/${TEST_ID}`, {
      tags: { phase: "leaderboard" },
    });
  }
}
