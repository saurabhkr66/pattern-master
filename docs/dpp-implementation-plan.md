# DPP (Daily Practice Problems) — PDF-Import Implementation Plan

## Context

BattleExam has a deep question bank, but the only ways to consume it are an endless per-topic practice feed and full-length mock tests. There is no bounded, finishable unit of work — and no way for the operator to publish a *curated* problem set.

DPP fills both gaps. The operator uploads one PDF per DPP (15–20 questions), the existing AI extractor parses it, the operator reviews and saves, and it becomes a numbered sheet (DPP-01…DPP-05) under a topic.

**Two facts shape the whole design:**

1. **The hard part is already built.** `lib/coachingImport.ts` (2,248 lines) is a mature multi-pass extractor — Gemini enumerate → extract → answer-key passes, mupdf page rasterization, figure bounding-box detection + auto-crop → ImageKit, DeepSeek blind re-solve cross-check, and a review UI with mismatch flags. DPP reuses that engine pointed at a different destination.
2. **This needs zero new tables.** A DPP sheet is fully described by two columns on `GeneratedQuestion`. Review staging goes to Redis, reusing the `lib/draft.ts` pattern. `prisma db push` adds four columns to one existing table and nothing else.

### Confirmed spec

| Decision | Value |
|---|---|
| Audience | B2C consumer (GATE / JEE / NEET / UGC-NET). **Not** the coaching module. |
| Source | **One PDF = one DPP.** Operator uploads, picks topic + sheet number. |
| Size | 15–20 questions per sheet (hard cap 25, matching the extractor's `MAX_IMAGES`). |
| Structure | Up to 5 numbered sheets per `Pattern` (DPP-01…DPP-05). |
| Storage | `GeneratedQuestion` + columns. No new models. |
| Admin | New super-admin panel at `/admin/dpp`. |

---

## Why no new tables — the reasoning

A `DppSheet` table would hold a Json array of question refs. Dropping it in favour of columns removes an entire class of bugs:

- **No non-atomic two-phase write.** `lib/dbHttp.ts:3-11` documents it: `$transaction`, `createMany` and `updateMany` all throw on the Neon HTTP adapter. A sheet row + N question rows is therefore a non-atomic write with no rollback — a mid-write failure leaves a sheet pointing at questions that don't exist. With columns there is no second write at all: each question INSERT is self-contained, and a partial failure just means a partly-filled sheet you re-import or fix in the admin UI. Strictly better failure behaviour.
- **No dangling refs, no `question_count` drift.** Sheet membership *is* a column, so it can't disagree with reality.
- **No sync code.** Deleting a question removes it from its sheet automatically.

The cost is honest and small: sheet *listing* becomes a `groupBy` instead of a `findMany`, which needs an index and an `EXPLAIN` check (§5). And a sheet cannot exist before its questions — irrelevant for an import-driven flow.

**Where the questions go is the other half of this, and it's why `GeneratedQuestion` specifically:** `Attempt` has exactly three question columns (`question_id` → `GeneratedQuestion`, `pyq_id` → `PYQ`, `mock_question_id` — a bare string). Any *new* question table would need a new nullable FK on `Attempt` plus edits to every UNION ALL in the codebase — `practice/topics`, `practice/progress`, the dashboard queries, mistakes, bookmarks, flashcards. Landing in `GeneratedQuestion` makes attempts, progress, bookmarks, flashcards, mistakes and SEO all work with **zero** changes.

### Consequence to be aware of

DPP questions carry a `pattern_id`, so they render on the public topic page via `getPatternPage()` and appear in the normal practice feed — automatically. That is mostly upside (your bank and your topic pages grow with every import), but it means `dpp_public: false` hides only the *sheet page*, not the questions. If you ever need a sheet's content genuinely unlisted, that's an extra `source: { not: "dpp_import" }` filter in `_lib/dataFetch.ts` and the pattern-questions route — noted as an escape hatch, not built in v1.

---

## 1. Schema — four columns, zero models

### Edit `prisma/schema/schema.prisma`, `GeneratedQuestion` only

```prisma
  // ── DPP membership ─────────────────────────────────────────────────────
  // A DPP sheet is (pattern_id, dpp_number); dpp_order is the position within
  // it. No sheet table: membership as columns means no dangling refs and no
  // second write to keep in sync — which matters because the Neon HTTP adapter
  // has no transactions (see lib/dbHttp.ts).
  dpp_number  Int?      // 1..5 → rendered DPP-01 … DPP-05. null = not in a DPP.
  dpp_order   Int?      // 1..N position within the sheet
  dpp_public  Boolean   @default(true)   // sheet page indexed + in sitemap
  source      String?   // null = AI-generated (legacy), "dpp_import" = from PDF

  @@index([pattern_id, dpp_number, dpp_order])   // sheet fetch
  @@index([dpp_number, pattern_id])              // sheet listing groupBy + sitemap
```

`dpp_public` is denormalized across a sheet's rows — the admin toggle writes them together. Because `updateMany` throws on Neon HTTP, that toggle must use `$executeRaw` (the established workaround for guarded bulk writes).

### Migration

`prisma db push` (no `migrations/` dir). **Known trap:** the Prisma CLI auto-loads `.env`, which points at production, and `db push` uses `DIRECT_URL`. Verify the target first:

```bash
node -e "console.log('DIRECT ->', new URL(process.env.DIRECT_URL).host)"
npx prisma db push       # additive only — never --accept-data-loss
npx prisma generate
```

All four columns are nullable or defaulted, so this is a safe additive push. For the VPS target, follow `docs/vps-db-direct-seed.md` (SSH tunnel on :5433, flip the `.env` `DB_DRIVER` block, flip back).

---

## 2. Import pipeline — reuse, don't rebuild

### 2a. Extract route — `app/api/admin/dpp/import/route.ts`

A near-copy of `app/api/coaching/questions/import/route.ts`. Keep verbatim: `runtime = "nodejs"`, `maxDuration = 300`, the NDJSON stream with the 15s `"\n"` heartbeat (survives Cloudflare's 100s origin cap), the `sharp` downscale to `MAX_IMAGE_EDGE`, and `req.signal` propagation so a client disconnect aborts in-flight Gemini calls.

Three changes:

1. **Auth** — swap `getCoachingActor()` + `actor.isSuperAdmin` for `isAdminRequest()` from `lib/requireAdmin.ts`. Admin gates key off the **Clerk session email**, never `userId` — dev and prod Clerk issue different userIds.
2. **Form fields** — replace `exam`/`set` with `patternId` + `sheetNumber`. Keep `qtype` (force `"objective"` — DPP has no subjective), `verify`, `verifyModel`, `answerModel`, `hindi`, `topics`.
3. **Persist the result to Redis** on the terminal `done` event, and return the `draftId` in that event.

Call `extractQuestions()` from `lib/coachingImport.ts` unchanged.

**Image folder:** `uploadCoachingImage(buf, coachingId, ext)` in `lib/coachingImageUpload.ts` hardcodes `/pattern-master/coaching/${coachingId}`. Generalize it to take a folder segment (`uploadImportImage(buf, folder, ext)`); the coaching path passes `coaching/${coachingId}`, DPP passes `dpp/${patternId}`. Keep the existing export as a thin alias so no coaching call site changes.

### 2b. Draft staging — Redis, new `lib/dppDraft.ts`

Modeled directly on `lib/draft.ts`, including its **authorization-by-key-construction** design:

```
Key:  dpp:draft:{adminUserId}:{draftId}
TTL:  7 days
Value: { patternId, sheetNumber, questions: ParsedQuestion[], usage, savedAt }
```

The userId is baked into the key and derived from the authenticated session on every request, so one admin can never read or corrupt another's draft. Same graceful-degradation shape as `lib/draft.ts` — every function no-ops on `!isRedisConfigured()` and swallows Redis errors with a `console.warn` rather than failing the request.

Functions: `saveDppDraft`, `readDppDraft`, `listDppDrafts` (scan by prefix), `clearDppDraft`.

**Why this matters:** the coaching modal holds review state purely in React — a refresh discards a 300-second extraction you already paid for. Tolerable for 10 coaching questions; genuinely bad for a full DPP. This is the one place the plan improves on the existing flow rather than copying it. Redis is the right home: the data is genuinely ephemeral, it's `ParsedQuestion[]` in the *coaching* shape (with `answer_disputed`, `solution_alt`, `blind_answer` flags that have no column in `GeneratedQuestion`), and half-vetted rows must never be able to leak into the practice feed.

Routes: `GET /api/admin/dpp/drafts` (list), `GET|PUT|DELETE /api/admin/dpp/drafts/[id]`.

### 2c. Commit route — `app/api/admin/dpp/commit/route.ts`

`POST { draftId, patternId, sheetNumber, dppPublic?, questions[] }`

**The shape adapter is the critical piece** — put it in its own file, `lib/dppAdapter.ts`, because it's the riskiest logic in the feature and deserves to be unit-testable in isolation. The extractor emits the *coaching* question shape; the consumer side speaks a different one. Verified mismatches:

| Field | Extractor (`ParsedQuestion`) | `GeneratedQuestion` / consumer |
|---|---|---|
| `question_type` | `"mcq"` / `"nat"` / `"subjective"` | `"MCQ"` / `"NAT"` / `"MSQ"` — **uppercase** |
| `options` | `[{label: "A", text: "…"}]` | **flat string array** `["…", "…"]`, label derived from index |
| answer field | `solution` | `explanation` |
| marks | `max_marks` | `marks` |
| `images` | `[{index, filename, type}]` | same `images` Json — passes through |

`components/patterns/AnswerSelector.tsx:44` (`question.options.map((option: string, i) => …)`) is the proof for the options shape; `PracticeButton`'s keyboard handler (`["A","B","C","D"].includes(key)`) is the proof for uppercase types and letter answers.

The adapter must:
- **Sort options by label before flattening.** Index position becomes the letter, so a set that came back as `[{B},{A}]` would silently invert the correct answer. Highest-risk line in the feature.
- Uppercase `question_type`; **reject** `subjective` rows outright.
- `solution → explanation`, `max_marks → marks`; drop `section`/`topic` (the Pattern supplies those).
- Compute `semantic_hash` via `generateSemanticHash` from `lib/hash.ts` — it's globally `@unique`, so a duplicate must be caught, not crashed on.

Pre-adapter validation reuses `validateCoachingQuestion` from `lib/coachingQuestionValidate.ts`, in particular `normalizeMcqAnswer()`, which leniently maps `"Option A"` / `"(A)"` / `"Ans: A"` / full option text to a bare label.

Then the write — **one phase, no sheet row**:

```ts
// Clear any previous occupant of this slot (re-import overwrites).
// updateMany throws on Neon HTTP → $executeRaw.
await prisma.$executeRaw`
  UPDATE "GeneratedQuestion" SET dpp_number = NULL, dpp_order = NULL
  WHERE pattern_id = ${patternId} AND dpp_number = ${sheetNumber}`;

await createEach(
  rows.map((r, i) => ({ ...adapt(r), pattern_id: patternId,
                        dpp_number: sheetNumber, dpp_order: i + 1,
                        dpp_public: dppPublic ?? true, source: "dpp_import" })),
  (data) => prisma.generatedQuestion.create({ data, select: { id: true } }),
  { skipDuplicates: true }
);
```

`createEach` from `lib/dbHttp.ts` already does exactly this — parallel single `create()`s with `isUniqueViolation()` handling both `P2002` and raw `23505`. On the standard TCP driver, branch to native `createMany` per the guidance in that file's header comment.

Finish with `clearDppDraft()` and `revalidateTag("dpp", "max")` + `revalidateTag("patterns")` (new questions change topic-page counts).

---

## 3. Admin panel — `app/(app)/admin/dpp/`

Sits alongside the existing super-admin surfaces (`ai-review`, `questions`, `reports`), guarded by `requireAdmin()` from `lib/requireAdmin.ts`.

**`page.tsx` — list.** `export const dynamic = "force-dynamic"`. One `groupBy(['pattern_id','dpp_number'])` (§5) joined to `Pattern` for names: topic, exam/branch, `DPP-0N`, question count, public/private pill, last updated. Follows the list-page shape from `app/coaching-admin/(dashboard)/students/page.tsx` — dates serialized to ISO, hand off to a `"use client"` component for mutations + `router.refresh()`. Row actions: edit, toggle public, delete sheet (which nulls `dpp_number`/`dpp_order` rather than deleting the questions). Banner listing unfinished Redis drafts with a **Resume** link.

**`new/page.tsx` — create.** Wraps `components/dpp/DppImportModal.tsx`, a fork of `QuestionImportModal.tsx` with:
- **Upload step:** cascading topic picker (exam → branch → subject → topic against `Pattern`; reuse the approach in `PyqPicker` inside `components/coaching/TestWizard.tsx`), sheet-number select 1–5 with occupied numbers marked, public toggle, then the existing PDF/image dropzone and model toggles.
- **Review step:** unchanged from the coaching modal — `_include` checkboxes, editable question text with live KaTeX preview, editable options + correct-answer radio, and the flag pills (`answer_disputed`, `solution_mismatch`, `figure_missing`, the blind cross-check agreement badge). Those flags are the entire value of the extractor; keep every one.
- **New:** debounced autosave to `PUT /api/admin/dpp/drafts/[id]`, with a "Draft saved 14:22" timestamp.
- **Guard:** soft warning outside 15–20 included questions, hard block above 25.

**`[id]/page.tsx` — edit.** Reorder (drag or up/down → rewrites `dpp_order`), remove a question from the sheet (nulls its `dpp_number`, leaving it in the topic's practice feed), toggle public.

---

## 4. Read path

### 4a. Extract shared helpers — new `lib/questionFeed.ts`

Pure verbatim moves out of `app/api/patterns/[id]/questions/route.ts` (add `import "server-only"`):

- `resolveMarks()` — [route.ts:9-12](app/api/patterns/%5Bid%5D/questions/route.ts#L9-L12)
- `getUserState()` — [route.ts:113-154](app/api/patterns/%5Bid%5D/questions/route.ts#L113-L154), the single UNION ALL over `Attempt` + `Bookmark`
- `stripHindi()` — [route.ts:158-161](app/api/patterns/%5Bid%5D/questions/route.ts#L158-L161)
- **new export** `GQ_FEED_SELECT` — the select inlined at [route.ts:49-62](app/api/patterns/%5Bid%5D/questions/route.ts#L49-L62)

The route then imports them and deletes its local copies. `getStaticQuestions` stays in the route — its `mock-` branch is pattern-feed-specific. It's a pure move verifiable by diff; the alternative is fixing that UNION ALL in two places forever.

### 4b. `app/api/dpp/[patternId]/[sheetNo]/questions/route.ts`

The sheet fetch is now a plain indexed query — no ref hydration, no re-ordering by Map, no missing-id handling:

```ts
prisma.generatedQuestion.findMany({
  where: { pattern_id: patternId, dpp_number: sheetNo },
  orderBy: { dpp_order: "asc" },
  select: GQ_FEED_SELECT,
})
```

That simplification is the main payoff of dropping the sheet table.

```
1. getStaticSheet(patternId, sheetNo) — unstable_cache
     key  ["dpp-sheet-static", patternId, String(sheetNo)]
     opts { revalidate: 86400, tags: ["dpp", `dpp-${patternId}`] }
   • the findMany above + pattern { topic_name, subject, exam_type, branch }
   • apply resolveMarks()
2. auth() → if userId: getUserState(userId, ids, []) → overlay attempts / isBookmarked
3. lang !== "hi" → stripHindi
4. Cache-Control: signed-in "private, s-maxage=60, max-age=0"
                  guest     "public, s-maxage=86400, max-age=3600"
```

Response includes an **`items`** array — flat, in `dpp_order`, each with `_isPyq: false`. That's precisely what `PatternRow.tsx` builds by hand before handing off to `PracticeButton`'s `initialQueue`, so the runner passes it straight through.

**Do not call `lib/resolveQuestions.ts`.** It returns `NormalizedQuestion` — lowercased `question_type`, `explanation` renamed to `solution`, `stripAnswers()` for mid-test delivery. That's the *coaching* shape, i.e. exactly the mismatch §2c exists to fix. `GQ_FEED_SELECT` keeps DPP payloads byte-identical to what `PracticeButton` already consumes.

### 4c. Cache keys & tags

| Surface | Key | Tags | TTL |
|---|---|---|---|
| sheet content | `["dpp-sheet-static", patternId, sheetNo]` | `["dpp", "dpp-<patternId>"]` | 86400 |
| sheet list for a pattern | `["dpp-sheets", patternId]` | `["dpp", "dpp-<patternId>"]` | 604800 |
| per-user progress | `dpp-progress-<userId>-<patternId>` | `["dashboard-<userId>"]` | 300 |

Progress reuses the **existing** `dashboard-${userId}` tag, which `app/api/save-attempt/route.ts` already expires with `{ expire: 0 }` on every attempt — so DPP progress self-invalidates for free, with no new invalidation path to get wrong. Keep the 300s floor rather than `revalidate: false`; the comment in `app/api/practice/topics/route.ts` records that `false` once froze stale-empty entries forever.

Use the dedicated **`"dpp"`** tag, never `"patterns"`, for sheet-only changes — busting `"patterns"` nukes the topic pages, the practice dashboard and the whole question feed. (The commit route busts both, because it genuinely adds questions.)

---

## 5. Sheet listing — the one query that needs care

```ts
prisma.generatedQuestion.groupBy({
  by: ["pattern_id", "dpp_number"],
  where: { dpp_number: { not: null } },       // + { pattern_id } for a single topic
  _count: { _all: true },
  _max: { created_at: true },                  // sitemap lastmod
  orderBy: [{ pattern_id: "asc" }, { dpp_number: "asc" }],
})
```

> ⚠️ **EXPLAIN this before shipping.** `@@index([dpp_number, pattern_id])` should make it an index-only scan over just the DPP rows rather than a full `GeneratedQuestion` scan. This is the cost of dropping the sheet table, and it's the one place that cost shows up. If the planner picks a Seq Scan on a large bank, the fallback is a partial index: `CREATE INDEX ... ON "GeneratedQuestion" (pattern_id, dpp_number) WHERE dpp_number IS NOT NULL` via raw SQL (Prisma has no partial-index syntax).

Cache it (`["dpp-sheets", patternId]`, tag `"dpp"`, 7d). For the sitemap, run it once unfiltered and group in JS.

---

## 6. Progress — derived from `Attempt`, no new table

`app/api/dpp/progress/route.ts?patternId=<id>`. Read the cached sheet list, flatten ids, then one raw query in the `getSolvedCounts` idiom from `app/api/practice/topics/route.ts`, returning the id *set* so sheets bucket in JS:

```sql
SELECT question_id::text AS id
FROM "Attempt"
WHERE user_id = $1 AND is_correct = true AND question_id::text = ANY($2)
GROUP BY question_id
```

Simpler than the pattern-feed version — DPP questions are all `GeneratedQuestion`, so there's no PYQ arm to UNION. `GROUP BY` (not `COUNT(DISTINCT …)`) gives distinct-solve semantics, matching `solvedQuestions` everywhere else and `PracticeButton`'s "only bump on the FIRST correct solve".

**No new index needed** — `schema.prisma` already has `@@index([question_id, user_id, is_correct])`.

> ⚠️ **EXPLAIN this too.** `question_id::text = ANY($2)` casts the *indexed column*, which can defeat the index on a large `Attempt` table. The existing routes cast the other operand instead. If the planner picks a Seq Scan, flip to `question_id = ANY($2::uuid[])`.

Status ladder, mirroring `PatternRow.tsx`: `solved === count` → **Completed**; `solved > 0` → **In progress**; else **Not started**.

---

## 7. Student UI

### (a) Sheet list

New `components/dpp/DppSheetList.tsx` (server component), rendered on the public topic page (`app/[examType]/[subject]/[topic]/page.tsx`, between `<PracticeModePromo>` and `<QuestionList>`) and as a new tab in `components/patterns/PatternRow.tsx`.

Cards: `DPP-01 · 18 questions · Start`. Progress badges are a **separate `"use client"` island** hitting `/api/dpp/progress`, exactly how `PatternTable.tsx` hydrates progress — do not make the page dynamic for progress, that would kill the ISR/Durable-Cache classification the SEO surface depends on.

### (b) The runner — reuse `PracticeButton`, not `TestEngine`

New `components/dpp/DppSheetRunner.tsx` (`"use client"`): `useQuery(["dppSheet", patternId, sheetNo, language])`, render a Q1..QN tile grid, hand off to `<PracticeButton initialQuestion={q} initialQueue={rest} … />`.

**Why not `components/test/TestEngine.tsx`:** it's a timed exam runner (palette, timer, submit modal, `TestSessionDraft`, tab-switch counting) — wrong shape for untimed practice with instant reveal. Decisively: `PracticeButton` writes `/api/save-attempt` per question with `questionId`, which is exactly what §6's progress reads. `TestEngine` writes a `TestSession` instead, so DPP progress would silently always read zero.

**Two surgical edits to `components/patterns/PracticeButton.tsx` — both verified against the file:**

1. **[Lines 118-123](components/patterns/PracticeButton.tsx#L118-L123)** unconditionally `router.replace('/practice?q=…')` on every question change. In a `/…/dpp/1` route this yanks the user to `/practice`. Add an optional `urlSync?: boolean` (default `true`) and guard the effect. Backward-compatible.
2. **[Lines 236-243](components/patterns/PracticeButton.tsx#L236-L243)**: when the queue empties and `isPyqMode` is false, `handleNextFromQueue` calls `handleGenerate()` → POSTs `/api/generate-question`. DPP questions are all `GeneratedQuestion`, so `_isPyq` is false for every one — **finishing any DPP would silently fire AI generation.** Add `onComplete?: () => void`; when provided, an empty queue ends the sheet and the runner shows a summary card (`X/N correct` + "Next: DPP-02 →").

Also lift the `QuestionCard` memo out of `PatternRow.tsx` into `components/patterns/QuestionCard.tsx` so both surfaces render identical tiles — it's already a standalone `memo`, a clean extraction.

---

## 8. SEO

```
/[examType]/[subject]/[topic]/dpp             → sheet index
/[examType]/[subject]/[topic]/dpp/[sheetNo]   → one sheet
```

Copy from the `/notes` sibling: `revalidate = 86400`, `dynamicParams = true`, and the **empty `generateStaticParams()` returning `[]`** — non-negotiable per the comment in `[topic]/page.tsx`: without it Netlify's Durable Cache marks the route `ƒ`, bypasses the response, and `revalidate` becomes a no-op.

Public surfaces filter `dpp_public: true`; a private sheet renders `notFound()` for guests, is excluded from the sitemap, and carries `robots: { index: false }`.

Metadata targets the head term: `{Topic} DPP-0{n} – {N} Daily Practice Problems with Solutions | {Exam}`, keywords in the `notes/page.tsx` style (`"<topic> dpp"`, `"<topic> dpp pdf"`, `"<topic> dpp with solutions"`).

Content reuses the existing `_components/QuestionList.tsx` → `components/question/QuestionViewer.tsx` via a `fetchDppSheet()` added to `_lib/dataFetch.ts` (the `gqSelect` is already there; returns `CombinedQuestion[]` through the existing `combineQuestions`). That reuse is the entire SEO thesis — zero new rendering code.

Duplicate-content handling: `/[topic]` stays canonical for the topic head term, DPP pages self-canonical (different query intent), each sheet gets a distinct H1 and intro, plus an inter-sheet nav strip and links back to the topic page and `/notes`. JSON-LD reuses `buildQuestionSchema` from `lib/seo.ts` plus a `LearningResource` (`learningResourceType: "Problem set"`) and a 5-level `BreadcrumbList`.

**Sitemap** — its own child id `"dpp"` in `lib/sitemap-data.ts`: a count guard in `listSitemapIds()`, a `buildDppSitemap()` driven by the §5 groupBy (filtered to `dpp_public`, using `_max.created_at` as `lastmod`), and a branch in `buildSitemapById()`. Not folded into `"topics"` — `buildTopicsSitemap` is the heaviest path (two full-table `groupBy`s) and its isolation is what keeps the index from timing out. `deploy/warm-sitemap.sh` and `app/robots.ts` need no edits.

---

## 9. Verification

1. **Schema** — confirm target with `node -e "console.log(new URL(process.env.DIRECT_URL).host)"`, then `npx prisma db push` + `generate`. Assert `dpp_number`, `dpp_order`, `dpp_public`, `source` exist on `GeneratedQuestion`. No new models should appear.
2. **Extraction** — upload a real 18-question DPP PDF with at least two diagram questions. Watch the NDJSON stream: `phase` events fire, figures crop and land on ImageKit under `/pattern-master/dpp/<patternId>`, `figure_missing` is not set on the diagram questions.
3. **Adapter — the highest-risk test.** Hand-craft a question with options out of label order (`[{label:"B"},{label:"A"}]`, `correct_answer: "A"`). Commit, open in the runner, confirm the correct option is still marked right. A silent inversion here is the worst possible bug — it corrupts content invisibly.
4. **Adapter — types.** Committed rows must have uppercase `question_type`, `options` as a flat string array, `explanation` populated from `solution`, `source: "dpp_import"`, and `dpp_order` 1..N contiguous.
5. **Draft persistence** — extract, reach review, **hard-refresh the browser**, reopen `/admin/dpp/new`. The draft must be listed and resume with every edit intact. This is the reason `lib/dppDraft.ts` exists; if it doesn't work, the feature isn't done.
6. **Re-import** — import the same sheet number twice. The `$executeRaw` slot-clear must run, leaving exactly N questions with that `dpp_number` (not 2N), and the previous occupants still present in the topic feed with `dpp_number: null`.
7. **Duplicate questions** — the second import's rows hit `semantic_hash` uniqueness; `createEach({skipDuplicates:true})` must swallow them, not 500.
8. **API** — `curl /api/dpp/<patternId>/1/questions` signed-out → `items.length` matches, order matches `dpp_order`, no `*_hindi` keys. `?lang=hi` → hindi present. Signed-in → `attempts`/`isBookmarked` populated.
9. **Progress** — solve 3 of 18 in DPP-01 → `GET /api/dpp/progress?patternId=` returns `{ "1": 3 }`. Hard-refresh → still 3 (proves the `dashboard-*` tag reaches the DPP cache). Re-solve the same question → still 3, not 4.
10. **Engine regression** — on `/practice`, `PracticeButton` must still URL-sync. In a DPP sheet, watch the network tab on the **last** question: `/api/generate-question` must **not** fire. This triggers on every sheet, so it's not an edge case.
11. **Both query plans** — `EXPLAIN ANALYZE` the §5 groupBy and the §6 progress query against production-sized tables. Neither may Seq Scan; fallbacks are the partial index and the cast flip respectively.
12. **Visibility** — a `dpp_public: false` sheet 404s for a logged-out visitor, is absent from `/sitemap/dpp.xml`, and carries `noindex`.
13. **Build classification** — `npm run build`; `/dpp` and `/dpp/[sheetNo]` must show `●`, not `ƒ`. If `ƒ`, `generateStaticParams` is missing.

---

## 10. Phasing

**Phase 1 — make one DPP end-to-end (the whole value).**
Four columns + `db push` → extract route + Redis draft + commit route with the adapter → `DppImportModal` → admin list page. Stop here and import 3–4 real DPPs. Everything after this is distribution.

**Phase 2 — students can do it.**
`lib/questionFeed.ts` extraction → sheet questions route → progress route → `DppSheetRunner` + the two `PracticeButton` props → sheet list on the topic page and practice dashboard.

**Phase 3 — SEO.**
Public routes → `dpp_public` filtering → metadata + JSON-LD → sitemap child.

**Phase 4 (later, optional) — auto-built sheets.**
A script that assigns `dpp_number`/`dpp_order` to existing bank questions for topics with no imported DPP. Now much simpler without a sheet table — it's an UPDATE, not a build. Still needs an append-only rule (never renumber a sheet a student has worked through). Deliberately out of v1.

---

## Critical files

**New:**
`app/api/admin/dpp/import/route.ts` · `app/api/admin/dpp/commit/route.ts` · `app/api/admin/dpp/drafts/[id]/route.ts` · `app/api/admin/revalidate-dpp/route.ts` · `app/api/dpp/[patternId]/[sheetNo]/questions/route.ts` · `app/api/dpp/progress/route.ts` · `lib/dppDraft.ts` · `lib/dppAdapter.ts` · `lib/questionFeed.ts` · `components/dpp/DppImportModal.tsx` · `components/dpp/DppSheetList.tsx` · `components/dpp/DppSheetRunner.tsx` · `app/(app)/admin/dpp/{page.tsx,new/page.tsx,[id]/page.tsx}` · `app/[examType]/[subject]/[topic]/dpp/{page.tsx,[sheetNo]/page.tsx}`

**Modified:**
`prisma/schema/schema.prisma` (four columns + two indexes on `GeneratedQuestion`) · `app/api/patterns/[id]/questions/route.ts` (extract helpers) · `components/patterns/PracticeButton.tsx` (`urlSync` + `onComplete`) · `lib/coachingImageUpload.ts` (generalize the folder segment) · `app/[examType]/[subject]/[topic]/_lib/dataFetch.ts` · `lib/sitemap-data.ts`

**Reused unchanged (the point of the design):**
`lib/coachingImport.ts` (`extractQuestions`, `verifyAnswers`, `cropQuestionImage`, `mapLimit`) · `lib/coachingQuestionValidate.ts` (`normalizeMcqAnswer`) · `lib/dbHttp.ts` (`createEach`, `isUniqueViolation`) · `lib/draft.ts` (the pattern `lib/dppDraft.ts` copies) · `lib/pdfRaster.ts` · `lib/requireAdmin.ts` · `lib/hash.ts` (`generateSemanticHash`)
