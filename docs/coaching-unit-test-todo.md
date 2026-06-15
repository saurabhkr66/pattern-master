# Coaching — Unit Test TODO

A checkable list of every unit worth testing in the coaching feature. Ordered by
**ROI**: pure functions first (deterministic, no mocks, high value), then
cache/DB-backed helpers (need mocking), then API routes, then components.

Status legend: `[ ]` todo · `[~]` partial · `[x]` done.

> **Harness is live.** Vitest is installed; run `npm test` (watch) or
> `npm run test:run` (once). Config: [vitest.config.ts](../vitest.config.ts),
> stubs in [test/stubs/](../test/stubs/). **145 tests passing** across the
> suites below. Completed: full §1 pure logic + leaderboard + §2 auth +
> §3 grading core (`coachingFinalize`) + §4 tenant guard + 2 routes:
> - [x] `lib/__tests__/coachingScore.test.ts` (23)
> - [x] `lib/__tests__/coachingTestRuntime.test.ts` (16)
> - [x] `lib/__tests__/scoreQuestion.test.ts` (14)
> - [x] `lib/__tests__/coachingQuestionValidate.test.ts` (15)
> - [x] `lib/__tests__/coachingBatch.test.ts` (4 — `studentInTestBatches`)
> - [x] `lib/__tests__/coachingLeaderboard.test.ts` (5 — `compareLeaderboard`)
> - [x] `lib/__tests__/subjectiveTypes.test.ts` (3)
> - [x] `lib/__tests__/studentAuth.test.ts` (24 — PIN, token verify, getCurrentStudent)
> - [x] `lib/__tests__/coachingFinalize.test.ts` (15 — deadline math, de-shuffle, photo-key ownership, guarded write)
> - [x] `lib/__tests__/withCoachingContext.test.ts` (11 — **cross-tenant isolation**, super-admin impersonation)
> - [x] `test/api/coachingTestPatch.route.test.ts` (6 — real route: tenant 404, status transitions)
> - [x] `test/api/studentSubmit.route.test.ts` (9 — real route: **past-deadline refusal**, double-submit no-op, approval/tenancy gates)
>
> **🐞 Bug surfaced by the tests:** `validateCoachingQuestion` does NOT normalize
> `"Option A"` / `"Ans: A"` (no trailing punctuation) despite its docstring
> claiming it does — the regex in `coachingQuestionValidate.ts` requires a
> trailing `[).:\-]`. AI-imported answers in that form get rejected. Documented
> by a test; not yet fixed.
>
> **Still TODO:** §3 remaining cache helpers (`coachingQuestionCache`,
> `resolveBatchIds` tenant scoping, `coachingDraft`, `coachingTabSwitch`),
> more §4 routes (`join`/`login` rate-limit + enumeration-safety, import
> commit re-validation, `start` batch/window/approval gates), §5
> components. Route tests follow the pattern in
> `test/api/coachingTestPatch.route.test.ts`: keep the real handler, mock
> `resolveCoachingAdmin` + `prisma` + cache invalidators.

---

## 0. Test harness setup (do this first)

There is **no test runner in the repo yet** (`package.json` has no test script, no
`vitest`/`jest` config). Pure functions are mostly `import "server-only"` modules,
so the runner must stub that.

- [ ] Add **Vitest** (`vitest` + `@vitejs/plugin-react` if testing components).
- [ ] Add `"test": "vitest"` and `"test:run": "vitest run"` to `package.json` scripts.
- [ ] `vitest.config.ts`: set `resolve.alias` for `@/` → repo root (matches `tsconfig` paths).
- [ ] Stub `server-only` (alias it to an empty module) so `lib/coaching*.ts` import cleanly.
- [ ] Decide mock strategy for `@/lib/prisma`, `@/lib/redis`, `next/headers`,
      `next/server` (`after`) — `vi.mock` per suite.

---

## 1. Pure logic — HIGH priority, no mocks needed

### `lib/coachingScore.ts`
The single scoring formula. Most important file to test.

**`subjectiveEntryMarks(entry, questionMarks)`**
- [ ] `manual_override` set → returns it, `pending:false` (teacher always wins).
- [ ] `manual_override` above questionMarks → **clamped to max**.
- [ ] `manual_override` negative → **clamped to 0**.
- [ ] not flagged + `gemini_marks` set + confidence `"high"` → returns gemini marks, not pending.
- [ ] same with confidence `"medium"` → not pending.
- [ ] confidence `"low"` → marks 0, `pending:true` (when image_keys present).
- [ ] `flagged:true` (even with high-confidence marks) → 0 + pending.
- [ ] `gemini_marks` null (ungraded) but image_keys present → 0 + pending.
- [ ] `gemini_marks` over question max → clamped.
- [ ] no image_keys (unanswered) → 0, **`pending:false`**.

**`computeGradingStatus(resolved, answers)`**
- [ ] paper with no subjective questions → `"none"`.
- [ ] all subjective answered + graded (high conf) → `"done"`.
- [ ] subjective unanswered (empty image_keys) → still `"done"` (unanswered ≠ pending).
- [ ] ≥1 answer ungraded (`gemini_marks` null, not flagged) → `"pending"`.
- [ ] AI done but ≥1 flagged / low-confidence → `"review"`.
- [ ] mix of ungraded + low-conf → `"pending"` wins over `"review"`.

**`computeAttemptScore(resolved, answers)`**
- [ ] objective-only paper: sums `scoreQuestion` correctly.
- [ ] negative marking pushes objective below 0 → **total floored at 0**.
- [ ] subjective marks added **after** the floor (not eaten by negative objective).
- [ ] `maxScore` = sum of all `q.marks` regardless of answers.
- [ ] single section → `sectionScores` is **null**.
- [ ] ≥2 sections → per-section `{score,maxScore,correct,wrong,skipped}` tallies right.
- [ ] section score rounded to 2 dp; never negative.
- [ ] subjective pending answer bumps neither `correct` nor `wrong` in its section.
- [ ] `pendingSubjective` counts only pending subjective answers.
- [ ] skipped objective (empty answer) increments `skipped`, not wrong.
- [ ] total rounded to 2 dp.

### `lib/coachingTestRuntime.ts`
Determinism is the whole contract — page and grader must agree.

**`buildStudentQuestionRefs(test, studentId)`**
- [ ] same (student, test) → **identical order across repeated calls**.
- [ ] different students → (generally) different orders.
- [ ] `shuffle:false`, no pool → returns refs unchanged, same order.
- [ ] `pool_size` < total → returns exactly `pool_size` refs, deterministic per student.
- [ ] `pool_size` ≥ total or 0/null → returns all.
- [ ] pool + shuffle together → stable (pool slice then order shuffle).
- [ ] non-array `questions` → returns `[]` (no throw).

**`optionPermutation(seed, n)`**
- [ ] returns a permutation of `0..n-1` (every index exactly once).
- [ ] same seed → same permutation; different seed → (generally) different.
- [ ] `n` = 0 → `[]`; `n` = 1 → `[0]`.
- [ ] round-trip: `perm[displayPos]=originalIndex` is invertible (matches grader's de-shuffle in `gradeAndWrite`).

**`optionSeed(studentId, testId, questionId)`**
- [ ] format `${studentId}:${testId}:opt:${questionId}`.

**`testWindowState(startAt, endAt, now)`**
- [ ] now < startAt → `"before"`.
- [ ] now > endAt → `"after"`.
- [ ] within window → `"open"`.
- [ ] null startAt → never `"before"`; null endAt → never `"after"`.
- [ ] boundary: now == startAt → `"open"`; now == endAt → `"open"` (uses strict `>`).

### `lib/resolveQuestions.ts` — `scoreQuestion(q, userAnswer)`
- [ ] subjective → returns **null** (not scored here).
- [ ] nat exact match → `q.marks`; within tolerance → marks; outside tolerance → 0.
- [ ] nat empty / non-numeric answer or correct_answer → 0.
- [ ] nat default tolerance (null) treated as 0.
- [ ] msq all-correct-and-only → marks; missing one → 0; extra wrong one → 0.
- [ ] msq order/case/`,`-vs-`;` separators normalized.
- [ ] mcq correct (case-insensitive) → marks.
- [ ] mcq wrong → `-abs(neg_marks)`.
- [ ] mcq with **negative** stored `neg_marks` → still penalizes (abs guard), never awards.
- [ ] mcq empty answer → 0 (no penalty for skip).

### `lib/coachingFinalize.ts` (pure parts only)
**`attemptDeadlineMs(startedAt, durationSecs, endAt)`**
- [ ] = `started_at + duration` when no `end_at`.
- [ ] = `min(started+duration, end_at)` when end_at earlier.
- [ ] accepts Date or ISO string or null `startedAt` (null → epoch 0 base).

**`isPastDeadline(startedAt, duration, endAt, now, grace)`**
- [ ] false just before deadline+grace; true just after.
- [ ] respects custom `graceSecs`; default `SUBMIT_GRACE_SECS` = 60.
- [ ] uses `attemptDeadlineMs` (end_at cap honored).

**`answersFromDraft(draft, resolved)`**
- [ ] null draft → empty answers map, empty times.
- [ ] mcq pulled from `mcqAnswers`.
- [ ] msq sorted + joined with `;` (matches grader expectation).
- [ ] nat trimmed.
- [ ] subjective photo keys joined with `;` (never silently dropped).
- [ ] times: only finite, `>= 0` values kept and rounded.

### `lib/coachingQuestionValidate.ts` — `validateCoachingQuestion(body)`
- [ ] invalid `question_type` → error.
- [ ] empty `question_text` → error.
- [ ] `max_marks` ≤ 0 or NaN → error.
- [ ] mcq < 2 options → error.
- [ ] mcq `correct_answer` matching no option → error.
- [ ] mcq answer normalization: `"Option A"`, `"(A)"`, `"A."`, `"a"`, full option **text** → label `"A"`.
- [ ] nat non-numeric `correct_answer` → error.
- [ ] nat negative tolerance → error; missing tolerance → defaults 0.
- [ ] subjective: no options/answer required; solution preserved.
- [ ] options with empty text are filtered out.
- [ ] `options_hindi` omitted (undefined, not null) when empty — never literal null.
- [ ] string fields trimmed; empty → null.

### `lib/coachingBatch.ts` — `studentInTestBatches(testBatchIds, studentBatchId)`
- [ ] empty/undefined/null targeting → true (open to all).
- [ ] student in a targeted batch → true.
- [ ] student not in any targeted batch → false.
- [ ] unbatched student (null) + non-empty targeting → false.

### `lib/coachingLeaderboard.ts` — `compareLeaderboard(a, b)`
- [ ] higher score ranks first.
- [ ] tie on score → lower `timeTakenSecs` first.
- [ ] null `timeTakenSecs` treated as Infinity (ranks last on the tie).
- [ ] tie on score+time → earlier `submittedAt` first.
- [ ] sort stability across a full array (integration of the comparator).

### `lib/subjectiveTypes.ts`
- [ ] `isSubjectiveEntry` true only for `{type:"subjective", image_keys:[]}`-shaped objects.
- [ ] false for strings, null, `{}`, wrong type tag, missing image_keys.
- [ ] `newSubjectiveEntry(keys)` produces correct defaults (nulls, flagged:false).
- [ ] `MAX_SUBJECTIVE_PHOTOS` === 3 (guards against drift with finalize slice).

---

## 2. Auth & crypto — HIGH priority (security)

### `lib/studentAuth.ts`
PIN + signed session cookie. Test the crypto-pure parts directly; mock
`next/headers` `cookies()` and `@/lib/prisma`/`@/lib/studentCache` for the rest.

**`isValidPin(pin)`**
- [ ] exactly 6 digits → true.
- [ ] 4/5/7 digits, non-digits, non-string, empty → false.

**`hashPin` + `verifyPin` (round-trip)**
- [ ] `verifyPin(pin, await hashPin(pin))` → true.
- [ ] wrong PIN → false.
- [ ] stored null/empty → false.
- [ ] malformed stored (no `:` separator) → false.
- [ ] salt format `salt:hash`; same PIN hashed twice → different hashes (random salt).
- [ ] constant-time compare path (length mismatch → false, no throw).

**Token sign/verify** (`signToken`/`verifyToken` are internal — test via
`getStudentSession` with a mocked cookie jar, or export them for testing):
- [ ] valid token round-trips to payload.
- [ ] tampered body → rejected (MAC mismatch).
- [ ] tampered MAC → rejected.
- [ ] expired `exp` → rejected.
- [ ] missing `sid`/`cid`/`exp` → rejected.
- [ ] no/garbage token → null.
- [ ] missing `STUDENT_SESSION_SECRET` env → `getSecret` throws.

**`getCurrentStudent(coachingId?)`** (mock cache + prisma)
- [ ] no session → null.
- [ ] `coachingId` mismatch with `session.cid` → null.
- [ ] cache hit + blocked student → null (fail-safe blocklist).
- [ ] cache miss → DB lookup with `active:true`; not found → null.
- [ ] cached record's `coaching_id` ≠ session cid → null.
- [ ] `session.tok` ≠ stored `session_token` (rotated by newer login) → null.
- [ ] happy path → returns student **without** `session_token`.

---

## 3. Cache & DB-backed helpers — MEDIUM priority (need mocks)

Mock `@/lib/redis` (or `isRedisConfigured`) and `@/lib/prisma`. Focus on the
*logic around* the I/O, not the I/O itself.

### `lib/coachingFinalize.ts` — `gradeAndWrite` / `finalizeOverdueAttempts`
- [ ] `gradeAndWrite`: option de-shuffle maps display letter → original letter when `test.shuffle`.
- [ ] subjective: only keys with the attempt's `answerKeyPrefix` are kept (ownership), capped at `MAX_SUBJECTIVE_PHOTOS`.
- [ ] guarded UPDATE returns `updated:false` when status already `submitted` (raw `$executeRaw` count 0).
- [ ] `needsGrading` true only when `updated && gradingStatus==="pending"`.
- [ ] tab_switches null read → COALESCE keeps DB value (don't clobber).
- [ ] leaderboard invalidated only when `updated`.
- [ ] `finalizeOverdueAttempts`: short-circuits when `isTestFinalized`.
- [ ] only attempts past deadline are finalized; window-closed sets the finalized marker.
- [ ] one attempt's failure is swallowed (others still finalize); returns count.

### `lib/coachingQuestionCache.ts`
- [ ] `studentQuestionsFromBase` derives the per-student set from the shared base deterministically (mirrors `buildStudentQuestionRefs`).
- [ ] `getResolvedTestQuestions` caches and reuses; `invalidateTestQuestionCache` clears.
- [ ] `isTestFinalized`/`markTestFinalized` round-trip on the Redis marker.
- [ ] `invalidateTestsWithQuestion` busts every test referencing a question.

### `lib/coachingBatch.ts` — `resolveBatchIds(input, coachingId)`
- [ ] non-array input → `[]`.
- [ ] strings filtered, deduped; non-strings dropped.
- [ ] only ids that belong to **this coaching** survive (forged/foreign id dropped) — assert the prisma `where` scoping.

### `lib/coachingDraft.ts` — `saveCoachingDraft` / `getCoachingDraft`
- [ ] save then get round-trips the draft for (attemptId, studentId).
- [ ] missing draft → null.
- [ ] TTL / key namespacing per attempt+student.

### `lib/coachingTabSwitch.ts`
- [ ] `incrTabSwitch` increments and returns the count (or false on Redis down).
- [ ] `readTabSwitches` returns null when Redis unavailable (so finalize COALESCE path holds).
- [ ] `clearTabSwitches` deletes the key.

### `lib/coachingCache.ts`
- [ ] `getCachedCoachingBySlug` returns cache hit without DB; miss → DB then set.
- [ ] each `invalidate*` clears the matching key.
- [ ] `getCachedActiveTests` shape + invalidation.

### `lib/coachingPaper.ts` — `buildStudentPaper`
- [ ] assembles the student's question refs + strips answers (`stripAnswers`) for client.
- [ ] applies option permutation for display when shuffle on.
- [ ] excludes correct_answer / solution from the client payload.

### Others to cover when time allows
- [ ] `lib/coachingPeerStats.ts` — `getAttemptPeerStats` percentile/rank math.
- [ ] `lib/coachingTestAnalytics.ts` — `getTestClassAnalytics` distribution/aggregates.
- [ ] `lib/coachingResult.ts` — `getAttemptResultData` shape + `invalidateAttemptResult`.
- [ ] `lib/coachingTaxonomy.ts` — `getCoachingTaxonomy` tree build + invalidation.
- [ ] `lib/coachingInsights.ts` — `getCoachingInsights` aggregates.
- [ ] `lib/coachingMemberships.ts` — add/remove/get (cookie-backed) membership list.
- [ ] `lib/coachingImport.ts` — pure helpers: `salvageTruncatedArray`, `mergeAnswers`, `resolveMcqLabel`, `parseRetryDelaySec`, `qtypeInstructions`, `chunk`, `mapLimit` (extract/export them; the Gemini calls themselves are not unit-test targets).

---

## 4. API routes — MEDIUM priority (integration-ish, mock auth + prisma)

Test the **guard logic and status codes**, not the framework. For each: mock
`getCurrentStudent` / `getCoachingActor` and prisma.

### Student flow
- [ ] `POST /api/student/join` — valid code creates/links student, sets PIN (6-digit), session cookie; bad code → 4xx; duplicate phone within coaching → blocked.
- [ ] `POST /api/student/login` — phone+PIN correct → session; wrong PIN → 401; rate-limit lockout after N fails; enumeration-safe (same error for unknown phone vs wrong PIN).
- [ ] `POST /api/student/logout` — clears cookie.
- [ ] `GET /api/student/test/[testId]/start` — gates on batch targeting (`studentInTestBatches`), window state, pending-approval status; creates attempt once (idempotent on resume).
- [ ] `GET /api/student/test/[testId]/paper` — returns **answer-stripped** paper; rejects non-enrolled / wrong-coaching student.
- [ ] `POST /api/student/test/[testId]/save` — autosave draft to Redis; rejects after deadline.
- [ ] `POST /api/student/test/[testId]/submit` — server-authoritative grade via `gradeAndWrite`; **refuses past deadline+grace**; double-submit is a no-op (guarded write).
- [ ] `POST /api/student/test/[testId]/tab-switch` — increments counter.
- [ ] `POST /api/student/test/[testId]/upload-answer` — presigned R2 PUT; key prefix scoped to attempt; max 3 photos.

### Coaching admin flow
- [ ] `POST/PATCH /api/coaching/questions` + `/[id]` — validates via `validateCoachingQuestion`; tenant-scoped.
- [ ] `POST /api/coaching/questions/import` + `/commit` — extract → review → commit; commit re-validates each row; tenant scoping.
- [ ] `POST/PATCH /api/coaching/tests` + `/[id]` — `resolveBatchIds` strips foreign batch ids; cache invalidated on write.
- [ ] `POST /api/coaching/attempts/[attemptId]/grade` — manual override recomputes via `computeAttemptScore`; updates `grading_status`.
- [ ] `POST /api/coaching/attempts/[attemptId]/subjective` — teacher per-question override; clamps to question marks.
- [ ] `GET /api/coaching/students` + `/[id]` + approve flows — tenant isolation; `approve-all` flips pending→approved only for own coaching.
- [ ] `GET /api/coaching/me` — returns actor's coaching context only.
- [ ] **Cross-tenant isolation**: every coaching route rejects an actor acting on another coaching's id (the "app-layer RLS by convention" gap — assert it explicitly).

---

## 5. Components — LOW priority (optional, needs jsdom + RTL)

Only the ones with real logic, not pure presentational ones.
- [ ] `StudentTestRunner` — timer countdown, autosave trigger, auto-submit at 0, tab-switch detection.
- [ ] `TestWizard` — step validation, batch selection, pool/shuffle toggles.
- [ ] `QuestionImportModal` / `AdminQuestionReview` — review-before-save gate; edits persist into commit payload.
- [ ] `StudentAuthForm` — join vs login mode, 6-digit PIN validation client-side.
- [ ] `CoachingResultAnalysis` / `TestAnalytics` — render section scores, pending-subjective banner.

---

## Suggested order to actually do them

1. Harness setup (§0).
2. `coachingScore`, `coachingTestRuntime`, `scoreQuestion`, `coachingFinalize` pure parts (§1) — the grading core.
3. `studentAuth` PIN + token (§2) — security.
4. `coachingQuestionValidate`, `coachingBatch`, `compareLeaderboard`, `subjectiveTypes` (§1) — quick wins.
5. Cache/DB helpers with mocks (§3).
6. API route guards, especially cross-tenant isolation + submit deadline (§4).
7. Components last (§5).
