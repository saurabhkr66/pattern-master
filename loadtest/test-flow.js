// k6 load test for the coaching test engine: the REAL student journey
//   login (scrypt verify)  →  open gate page (cheap Redis-cached shell)
//   →  paper (encrypted pre-stage download)  →  start (attempt upsert + key)
//   →  think  →  autosave (Redis)  →  submit (grade + DB write + leaderboard bust)
//
// Pre-stage split (2026-06): the test page no longer SSRs the paper or creates
// the attempt. The paper is downloaded encrypted by GET /paper (in real life
// spread over the 10-min waiting room) and T-0 is just POST /start, which
// returns the attemptId + decryption key as a tiny JSON. This script hits both
// back-to-back, so the measured shape is HARSHER than reality: real prefetches
// spread out, while here paper+start land together per VU.
//
// No Clerk: students auth with a signed cookie minted by /api/student/login.
// k6's per-VU cookie jar carries it through the rest of the flow automatically.
//
// Each VU maps to ONE seeded student via the global iteration counter
// (phone = PHONE_BASE + iter), because the login rate limit is per
// (coaching, phone). Seed first:
//   node --env-file=.env.local loadtest/seed-students.mjs --slug=demo --count=500
//
// Run (ramp to 500 against a NON-PROD preview backed by a Neon dev branch):
//   k6 run -e BASE_URL=https://preview.example.com -e SLUG=demo \
//          -e TEST_ID=<coachingTestId> loadtest/test-flow.js
//
// The target test must be status="active" and inside its start_at/end_at window,
// or paper/start return 425/410 and the flow records an error.

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
// server load that matters is the start spike and the submit spike, not the wait.
const THINK_SECS = Number(__ENV.THINK_SECS || 5);

if (!TEST_ID) throw new Error("Set -e TEST_ID=<coachingTestId>");

// ── Custom metrics so each phase is visible separately ──────────────────────
const loginDur = new Trend("phase_login_ms", true);
const openDur = new Trend("phase_open_ms", true);
const paperDur = new Trend("phase_paper_ms", true);
const startDur = new Trend("phase_start_ms", true);
const submitDur = new Trend("phase_submit_ms", true);
const flowErrors = new Rate("flow_errors");
const attemptMissed = new Counter("attempt_id_not_found");

// Each k6 iteration must use a DISTINCT seeded student: once a student submits,
// re-starting flags submitted (no attempt to submit again). So we map the
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

// Optional DNS pin: a big VU burst can overwhelm the LOCAL machine's DNS
// resolver ("lookup ...: no such host" at t=0 — load-generator artifact, the
// server never sees those). Pass -e PIN_IP=<ip from nslookup> to skip DNS
// entirely; TLS/SNI/Host still use the real hostname, so the origin/proxy
// routes normally.
const HOSTNAME = BASE_URL.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];

export const options = {
  ...(__ENV.PIN_IP ? { hosts: { [HOSTNAME]: __ENV.PIN_IP } } : {}),
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
    "phase_open_ms": ["p(95)<2000"], // gate shell — cheap SSR
    "phase_paper_ms": ["p(95)<2000"], // encrypted paper (spread out in reality)
    "phase_start_ms": ["p(95)<1000"], // THE T-0 spike — must stay tiny
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
    // Wrap so the request still goes out, but expect already-submitted flags.
    return String(PHONE_BASE + (idx % SEEDED_COUNT));
  }
  return String(PHONE_BASE + idx);
}

export default function () {
  // Spread arrivals over a window so 500 VUs don't open 500 TCP connections in
  // the same microsecond (which overflows a single server's accept backlog — an
  // artifact that never happens in reality; even a class clicking "Start" spreads
  // over seconds). In production the paper downloads additionally spread over the
  // whole 10-min waiting room, so this script is the worst case, not the typical.
  const spread = Number(__ENV.START_SPREAD_SECS || 20);
  if (spread > 0) sleep(Math.random() * spread);

  const phone = phoneForIter();
  const jar = http.cookieJar(); // per-VU, isolates each student's session

  // 1) LOGIN ─ POST phone + PIN, server sets the signed student_session cookie.
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
    // http://localhost, so the next request looks unauthenticated and the API
    // returns 401. Prod is HTTPS where Secure is correct; this only bites local
    // http load tests. Re-set the same cookie WITHOUT Secure so the rest of the
    // journey is authenticated. No-op over https.
    if (BASE_URL.startsWith("http://")) {
      const sc = res.cookies && res.cookies.student_session;
      if (sc && sc[0]) jar.set(BASE_URL, "student_session", sc[0].value, { path: "/" });
    }
  });

  // 2) OPEN ─ GET the gate page. Now a cheap Redis-cached shell (no paper SSR,
  // no attempt create). Kept in the flow because every student still loads it.
  group("open", function () {
    const res = http.get(`${BASE_URL}/c/${SLUG}/test/${TEST_ID}`, {
      tags: { phase: "open" },
    });
    openDur.add(res.timings.duration);
    if (!check(res, { "open 200": (r) => r.status === 200 })) flowErrors.add(1);
  });

  // 3) PAPER ─ encrypted pre-stage download (in reality spread over the waiting
  // room; here back-to-back with start, which is harsher).
  group("paper", function () {
    const res = http.get(`${BASE_URL}/api/student/test/${TEST_ID}/paper`, {
      tags: { phase: "paper" },
    });
    paperDur.add(res.timings.duration);
    const ok = check(res, {
      "paper 200": (r) => r.status === 200,
      "paper has ct": (r) => {
        try {
          return !!r.json("ct");
        } catch {
          return false;
        }
      },
    });
    if (!ok) {
      flowErrors.add(1);
      // 425 = test not within start−10min; 410 = window closed. Fix the test row.
      if (res.status === 425 || res.status === 410) {
        fail(`paper gate refused (${res.status}) — check the test's start_at/end_at window`);
      }
    }
  });

  // 4) START ─ THE T-0 call: attempt upsert + key release. This is the spike
  // that decides "how many students can press Start together".
  let attemptId = null;
  group("start", function () {
    const res = http.post(`${BASE_URL}/api/student/test/${TEST_ID}/start`, null, {
      tags: { phase: "start" },
    });
    startDur.add(res.timings.duration);
    const ok = check(res, { "start 200": (r) => r.status === 200 });
    if (!ok) {
      flowErrors.add(1);
      return;
    }
    const body = res.json();
    // A student who already submitted gets flagged (client would redirect to
    // results). That's a valid state, not a failure — count it and move on.
    if (body.submitted) {
      alreadySubmitted.add(1);
      return;
    }
    attemptId = body.attemptId || null;
    if (!attemptId) {
      attemptMissed.add(1);
      flowErrors.add(1);
      if (__ENV.DEBUG === "1" && __VU === 1 && __ITER === 0) {
        console.log(`\n--- start status ${res.status} ---\n${res.body}`);
      }
    }
  });

  if (!attemptId) {
    sleep(1);
    return;
  }

  // 5) THINK + one AUTOSAVE ─ autosave is a pure Redis SET (no DB). Fire one to
  // exercise that path; the real client fires every 120s.
  http.patch(
    `${BASE_URL}/api/student/test/${TEST_ID}/save`,
    JSON.stringify({ draftId: attemptId, state: { mcqAnswers: {}, timeSpentMap: {} } }),
    { headers: { "Content-Type": "application/json" }, tags: { phase: "autosave" } }
  );
  sleep(THINK_SECS);

  // 6) SUBMIT ─ grade + the heavy DB write + leaderboard invalidation. Empty
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

  // 7) Optional: the whole batch hammers the leaderboard right after submitting.
  if (__ENV.HIT_LEADERBOARD === "1") {
    http.get(`${BASE_URL}/c/${SLUG}/leaderboard/${TEST_ID}`, {
      tags: { phase: "leaderboard" },
    });
  }
}
