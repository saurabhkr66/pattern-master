# Coaching test engine — load test (k6)

Answers "can it take 500 students opening + submitting at once?" by driving the
**real** student journey: `login → open gate page → paper → start → autosave →
submit` (the pre-stage split: paper is downloaded encrypted, start releases the
key + creates the attempt).

No Clerk is involved — students authenticate with a signed cookie minted by
`/api/student/login` (phone + PIN). k6's per-VU cookie jar carries it through.

## What it exercises (and why these are the load that matters)

| Phase    | Server cost per student                                   | File |
|----------|-----------------------------------------------------------|------|
| login    | scrypt PIN verify (CPU-heavy) + 2 DB reads + session write | `app/api/student/login/route.ts` |
| open     | gate shell SSR — Redis-cached reads only, no paper, no attempt | `app/c/[slug]/test/[testId]/page.tsx` |
| paper    | Redis-cached question set + in-memory derivation + AES encrypt | `app/api/student/test/[testId]/paper/route.ts` |
| start    | **THE T-0 spike**: single-statement attempt upsert + key release | `app/api/student/test/[testId]/start/route.ts` |
| autosave | single Redis SET (zero DB)                                | `app/api/student/test/[testId]/save/route.ts` |
| submit   | grade + DB write + leaderboard cache bust                 | `app/api/student/test/[testId]/submit/route.ts` |

In production the waiting room spreads `paper` over 10 minutes with jitter; this
script fires paper+start back-to-back per VU, so it measures a HARSHER shape
than reality. The numbers that decide capacity are `phase_start_ms` (T-0) and
`phase_submit_ms` (the synchronized timer-expiry spike).

## Prerequisites

1. **Run against a NON-PROD target** — a preview deploy backed by a Neon **dev
   branch**. Load testing autoscales Neon compute (CU cost) and serverless
   invocations. Do not point this at prod.
2. An **active** coaching test inside its `start_at`/`end_at` window with
   questions, and its `id` (the `CoachingTest.id`).
3. [k6](https://k6.io/docs/get-started/installation/) installed
   (`winget install k6` or `choco install k6`).
4. Node 20+ for the seeder (`--env-file` support).

## 1. Seed 500 distinct students

The login rate limit is per `(coaching, phone)`, so VUs cannot share a phone.
This creates students with phones `9000000000…9000000499`, PIN `1234`:

```powershell
node --env-file=.env.local loadtest/seed-students.mjs --slug=demo --count=500
```

Point `DATABASE_URL` (in `.env.local`) at the **dev branch**. The seeder refuses
a URL that looks like prod unless you pass `--force`.

## 2. Reset attempts before each run

Once a student submits, re-opening the test redirects them to results (no second
attempt). So clear the load-test students' attempts before every run, or the
flow can't open+submit again:

```powershell
node --env-file=.env.local loadtest/reset-attempts.mjs --slug=demo --testId=<coachingTestId>
```

## 3. Smoke first (validate the flow at low load)

```powershell
k6 run -e SMOKE=1 -e VUS=3 -e DURATION=25s `
       -e BASE_URL=http://localhost:3000 -e SLUG=demo -e TEST_ID=<id> loadtest/test-flow.js
```
Expect `flow_errors=0%` and all checks ✓. Add `-e DEBUG=1` to dump the page body
once if `attempt_id_not_found` is non-zero.

## 4. Run the batch

`per-vu-iterations`: `BATCH_VUS` students each run the journey EXACTLY once — the
real "N students open + submit together" shape. Keep `BATCH_VUS <= COUNT` seeded.

```powershell
k6 run -e BATCH_VUS=500 -e START_SPREAD_SECS=20 `
       -e BASE_URL=https://your-preview.example.com -e SLUG=demo -e TEST_ID=<id> loadtest/test-flow.js
```

Useful knobs (all `-e`):

- `BATCH_VUS=500` — number of students (one journey each).
- `START_SPREAD_SECS=20` — spread arrivals over N seconds so VUs don't open all
  TCP connections in the same instant (a synthetic spike that overflows a single
  server's accept backlog; real arrivals are spread anyway).
- `THINK_SECS=5` — pause between open and submit.
- `HIT_LEADERBOARD=1` — also hammer the leaderboard after each submit.
- `PHONE_BASE`, `PIN`, `COUNT` — match the seeder if you changed them.

Each iteration uses a DISTINCT student (mapped by the global iteration counter),
so a looping/over-provisioned run advances through the pool instead of re-hitting
already-submitted students.

## 5. Read the results

Per-phase trends are emitted separately:

- `phase_login_ms` — watch p95 here first; scrypt is the likeliest bottleneck.
- `phase_open_ms` — the gate page shell; Redis-cached reads, should stay cheap.
- `phase_paper_ms` — the encrypted pre-stage download. In production this
  spreads over the 10-min waiting room; the script fires it back-to-back with
  start, so treat it as worst-case.
- `phase_start_ms` — THE number that decides simultaneous capacity: the T-0
  attempt upsert + key release. Should stay small even at high VU counts.
- `phase_submit_ms` — the write + leaderboard bust.
- `http_req_failed`, `flow_errors` — keep under 2%.
- `attempt_id_not_found` — non-zero means `start` answered 200 without an
  attemptId. Check the test state (active? inside its window?).

Thresholds in `options.thresholds` are starting points — set them to your SLO.

## 4. Clean up

```powershell
node --env-file=.env.local loadtest/seed-students.mjs --slug=demo --clean
```

Removes the seeded students and their attempts. (On a throwaway dev branch you
can also just reset the branch.)

## Notes / gotchas

- **Empty answers still test the write path.** `submit` grades over the full
  resolved set regardless, so the DB write + leaderboard invalidation run even
  with `answers: []` (score 0). Realistic answers don't change server load.
- **`attemptId` comes from `POST /api/student/test/<id>/start`** (JSON), which
  also releases the paper decryption key. The page no longer SSRs the paper or
  creates the attempt — that's the pre-stage split.
- **The paper/start gates are window-aware**: `paper` only serves from
  `start_at − 10min` and `start` only from `start_at` (both until `end_at`).
  A 425/410 in the run means the target test's window is wrong, not a bug.
- **First-batch cold starts** inflate p95 on serverless. Either pre-warm or read
  the steady-state (hold) window, not the ramp's leading edge.
- This measures *your* app + Neon + Redis. It cannot raise platform concurrency
  limits — if you hit a Vercel/Netlify function cap, that's a plan setting.
