# DPP (Daily Practice Problems) — Admin-Only Implementation Plan

> **v2 — 2026-08-15.** Supersedes the PDF-import-only plan of 2026-07-28 (see git
> history). Two decisions changed the shape of the whole feature:
> 1. **Admin-only for now.** No student UI, no public routes, no SEO, no sitemap.
> 2. **A DPP is a named container you create first, then fill** — by pasting one
>    question at a time *or* by PDF import. The v1 design (membership as columns
>    on `GeneratedQuestion`) cannot express an empty named sheet, so it is out.

## Context

BattleExam has a deep question bank, but the only ways to consume it are an
endless per-topic practice feed and full-length mock tests. There is no bounded,
finishable unit of work — and no way for the operator to publish a *curated*
problem set.

DPP fills both gaps. The operator creates a named DPP under a topic ("DPP 1"),
then fills it: paste questions one at a time, or upload a PDF and let the
existing AI extractor parse it. Right now this is an operator tool only —
students never see it.

**Two facts shape the design:**

1. **The hard part is already built.** `lib/coachingImport.ts` is a mature
   multi-pass extractor — Gemini enumerate → extract → answer-key passes, mupdf
   page rasterization, figure bounding-box detection + auto-crop → ImageKit,
   DeepSeek blind re-solve cross-check, and a review UI with mismatch flags. DPP
   reuses that engine pointed at a different destination.
2. **DPP gets its own tables, and that is what makes it cheap.** Because nothing
   public reads them, there is no visibility problem to solve, no draft-staging
   layer to build, and no shape to match. Most of the v1 plan's complexity
   existed to work around living inside `GeneratedQuestion`.

### Confirmed spec

| Decision | Value |
|---|---|
| Audience | **Operator only.** Super-admin panel at `/admin/dpp`. No student surface. |
| Scope | A DPP belongs to one `Pattern` (topic). Names are per-topic, so "DPP 1" exists under many topics. |
| Naming | Free-text `name` ("DPP 1", "Kinematics DPP 3"), plus an `order` for sorting. |
| Fill | Paste one question at a time **and** PDF import. Same validated write path. |
| Size | Soft target 15–20 questions. Hard cap 25 on import, matching the extractor's `MAX_IMAGES`. No cap on paste. |
| Storage | New `Dpp` + `DppQuestion` models. `GeneratedQuestion` is **not touched**. |

---

## Why two new tables — the reasoning

The v1 plan put sheet membership in four columns on `GeneratedQuestion`. Two
things kill that now.

**A DPP must exist before its questions.** v1 acknowledged the limitation and
dismissed it: *"a sheet cannot exist before its questions — irrelevant for an
import-driven flow."* Creating "DPP 1" empty and pasting into it is exactly that
case. A container row is now mandatory.

**Given a container is needed anyway, `GeneratedQuestion` stops paying for
itself.** Two hard constraints in the live schema:

- [`semantic_hash String @unique`](../prisma/schema/schema.prisma#L111) is
  **global**. Pasting a question that already exists anywhere in the bank fails
  the insert. For a *curated* sheet this is backwards — you often want a classic
  question in a DPP precisely because it is already good.
- [`pattern_id String`](../prisma/schema/schema.prisma#L105) is **required**, so
  every DPP question would claim a topic and immediately surface on public
  pages.

That second point is not theoretical. Every public read path fetches by
`pattern_id` with no `source` filter:

| Surface | Site |
|---|---|
| Practice feed | [`patterns/[id]/questions/route.ts:44`](../app/api/patterns/%5Bid%5D/questions/route.ts#L44) — nested relation select, no `where` |
| Public topic page | [`dataFetch.ts:149-154`](../app/%5BexamType%5D/%5Bsubject%5D/%5Btopic%5D/_lib/dataFetch.ts#L149-L154) |
| Topic counts | [`dataFetch.ts:84`](../app/%5BexamType%5D/%5Bsubject%5D/%5Btopic%5D/_lib/dataFetch.ts#L84), `:206`, `:264` — `_count: { questions: true }` |
| Sitemap | [`sitemap-data.ts:232`](../lib/sitemap-data.ts#L232) — `groupBy` `_count` + `_max(created_at)` |
| Question canonical | [`[questionId]/route.ts:47`](../app/%5BexamType%5D/%5Bsubject%5D/%5Btopic%5D/%5BquestionId%5D/route.ts#L47) — resolves any GQ id |

Filtering all five is more work than it looks: the `_count` at `dataFetch.ts:84`
feeds the `skip`/`take` math at `:152-153`, so filtering the `findMany` without
also filtering the count produces blank pages at the end of every topic.

**Own tables make all of that structurally absent** — nothing to filter, because
nothing reads them.

### What own tables also delete

- **No Redis draft layer.** v1 needed `lib/dppDraft.ts` for two reasons:
  half-vetted rows must never leak into the practice feed, and the extractor's
  flags (`answer_disputed`, `blind_answer`, `figure_missing`) had no columns in
  `GeneratedQuestion`. Both dissolve — nothing can leak from a table nothing
  reads, and a new table can simply have those columns. Extraction writes
  straight to the DB as `status: "draft"`; review happens in place. Refresh
  safety — the entire reason §2b existed — comes free from persistence.
- **No `$executeRaw` slot-clear.** Re-import is `deleteMany({ where: { dpp_id } })`
  then insert, or just a new DPP. No `updateMany`-throws-on-Neon-HTTP workaround.
- **No cache invalidation.** No public surface reads DPP, so there is no
  `revalidateTag` call anywhere in this feature. Admin pages are
  `force-dynamic`.

### The deferred cost, stated plainly

When DPPs eventually open to students, `Attempt` needs a third nullable FK
(`dpp_question_id`) alongside [`question_id` and `pyq_id`](../prisma/schema/schema.prisma#L147-L150),
plus an arm in the three `UNION ALL` sites: `app/api/patterns/[id]/questions/route.ts`,
`app/api/practice/progress/route.ts`, `app/api/practice/topics/route.ts`.

That is a real bill, but it is deferred, bounded, and owed only if you ship DPP
to students. The column design charges the visibility tax **today** in exchange
for a discount on a feature that may never be built.

---

## 1. Schema — new file `prisma/schema/dpp.prisma`

The schema is already multi-file (`schema.prisma`, `announcements.prisma`,
`attendance.prisma`, `fees.prisma`). Follow that convention.

```prisma
/// A named, curated problem set under one topic. Created empty, then filled by
/// paste or PDF import. Admin-only: no public surface reads this table, which
/// is why DPP questions live here instead of in GeneratedQuestion.
model Dpp {
  id          String        @id @default(uuid())
  pattern_id  String
  name        String        // "DPP 1" — free text, renameable
  order       Int           // sort position within the topic
  status      String        @default("draft")   // draft | ready
  is_public   Boolean       @default(false)     // reserved; nothing reads it yet
  created_at  DateTime      @default(now())
  updated_at  DateTime      @updatedAt
  pattern     Pattern       @relation(fields: [pattern_id], references: [id])
  questions   DppQuestion[]

  @@unique([pattern_id, order])
  @@index([pattern_id, order])
}

/// One question inside a DPP. Deliberately NOT GeneratedQuestion: no global
/// semantic_hash (a DPP may legitimately reuse a bank question), no required
/// pattern_id (the parent Dpp supplies the topic), and room for the extractor's
/// review flags as first-class columns.
model DppQuestion {
  id                  String   @id @default(uuid())
  dpp_id              String
  order               Int      // 1..N position within the DPP
  question_text       String
  options             Json     // flat string array; index → A/B/C/D
  correct_answer      String
  explanation         String
  question_type       String   @default("MCQ")   // MCQ | NAT | MSQ
  difficulty_level    String?
  marks               Int      @default(1)
  images              Json?
  question_text_hindi String?
  options_hindi       Json?
  explanation_hindi   String?

  // ── Extractor review flags ────────────────────────────────────────────────
  // In v1 these lived in Redis because GeneratedQuestion had nowhere to put
  // them. As columns they persist, so review survives a refresh for free.
  answer_disputed  Boolean? // extractor and blind re-solve disagreed
  blind_answer     String?  // what the blind DeepSeek pass answered
  figure_missing   Boolean? // question references a figure that failed to crop
  reviewed         Boolean  @default(false)
  source           String?  // "paste" | "pdf_import"

  created_at DateTime @default(now())
  dpp        Dpp      @relation(fields: [dpp_id], references: [id], onDelete: Cascade)

  @@index([dpp_id, order])
}
```

Add the back-relation `dpps Dpp[]` to `Pattern` in `schema.prisma`.

`onDelete: Cascade` is safe here in a way it would never be on
`GeneratedQuestion`: these rows have no attempts, no bookmarks, no reports.
Deleting a DPP deletes its questions, full stop.

### Migration

`prisma db push` (no `migrations/` dir). **Known trap:** the Prisma CLI
auto-loads `.env`, which points at production, and `db push` uses `DIRECT_URL`.
Verify the target before pushing:

```bash
node -e "console.log('DIRECT ->', new URL(process.env.DIRECT_URL).host)"
npx prisma db push       # additive only — never --accept-data-loss
npx prisma generate
```

Two new models and one back-relation: purely additive, no existing column
changes. For the VPS target, follow `docs/vps-db-direct-seed.md` (SSH tunnel on
:5433, flip the `.env` `DB_DRIVER` block, flip back).

---

## 2. Write paths

Both fill methods converge on **one** validated write. Paste is N=1, import is
N=18. Building the import path makes the paste form nearly free.

```
paste form ─┐
            ├─→ validate → adapt → insert at order = max + 1
PDF extract ─┘
```

### 2a. Validation + adapter — `lib/dppAdapter.ts`

Keep this in its own file: it is the riskiest logic in the feature and deserves
to be unit-testable in isolation.

Pre-adapter validation reuses
[`validateCoachingQuestion`](../lib/coachingQuestionValidate.ts#L132) from
`lib/coachingQuestionValidate.ts`. Note it is the **only** export there —
`normalizeMcqAnswer` / `normalizeMsqAnswer` are private and reached *through*
it, so call the validator rather than importing them. It leniently maps
`"Option A"` / `"(A)"` / `"Ans: A"` / full option text to a bare label, returns
MSQ answers as a `";"`-joined label list ordered by option position, and rejects
a row whose answer matches no option.

It returns the *coaching* `ValidatedQuestion` shape (`options` still
`[{label,text}]`, `solution`, `max_marks`), so the adapter runs on its output —
validate first, then adapt.

The extractor emits the *coaching* question shape. Mismatches against
`DppQuestion`:

| Field | Extractor (`ParsedQuestion`) | `DppQuestion` |
|---|---|---|
| `question_type` | `"mcq"` / `"msq"` / `"nat"` / `"subjective"` | `"MCQ"` / `"MSQ"` / `"NAT"` — **uppercase** |
| `options` | `[{label: "A", text: "…"}]` | **flat string array, each item prefixed with its own label**: `"A. …"` |
| answer field | `solution` | `explanation` (required column — `null` becomes `""`) |
| marks | `max_marks` | `marks` |
| `images` | `[{index, filename, type}]` | same `images` Json — passes through |

The adapter must:

- **Emit `` `${label}. ${text}` `` — never bare text.** See the box below; this
  is the one rule that, if broken, corrupts every rendered question.
- Uppercase `question_type`; **reject** `subjective` rows outright.
- `solution → explanation`, `max_marks → marks`; drop `section`/`topic` (the
  parent `Dpp`'s `Pattern` supplies those).
- Apply the **same** label order to `options_hindi`, matched by label — and drop
  the Hindi options entirely on any mismatch. A misaligned translation is worse
  than none.
- **Fold a NAT tolerance into `correct_answer` as a `"lo:hi"` range.** The
  validator returns `nat_tolerance` as a separate number and `DppQuestion` has
  no column for it — but it needs none. This app expresses NAT tolerance
  *inside* the answer string: [`PracticeButton.tsx:281`](../components/patterns/PracticeButton.tsx#L281)
  parses `/^([\d.-]+)\s*(?::|to)\s*([\d.-]+)$/`, and **1194 of 2864 PYQ NAT rows
  are already stored that way** (verified against prod). Drop the tolerance and
  grading silently falls back to exact match (`< 0.000001`), marking 9.81 wrong
  against 9.8 ± 0.05. Round the endpoints — `9.8 - 0.05` is `9.750000000000002`
  in IEEE754.

> ### The label must live inside the option string
>
> The v1 plan claimed `options` is a flat array where *"index position becomes
> the letter"*, and built its whole risk section around sorting before
> flattening. **That is wrong**, and acting on it would have been the worst bug
> in the feature.
>
> The app derives an option's letter from **the first character of the string**,
> not from its index. Six independent renderers agree, as does the prompt that
> generates the data:
>
> | Site | Code |
> |---|---|
> | [`prompts.ts:46`](../lib/prompts.ts#L46) | `"options": ["A. ...", "B. ...", "C. ...", "D. ..."]` |
> | [`AnswerSelector.tsx:45`](../components/patterns/AnswerSelector.tsx#L45) | `option.trim().charAt(0).toUpperCase()` |
> | [`PracticeButton.tsx:272`](../components/patterns/PracticeButton.tsx#L272) | `userAns.charAt(0) === dbAns.charAt(0)` |
> | [`PractiseTest.tsx:42,84`](../components/PractiseTest.tsx#L42) | `optionString.charAt(0)` |
> | [`FlashcardDeck.tsx:314`](../components/review/FlashcardDeck.tsx#L314) | `opt.charAt(0).toUpperCase()` |
> | [`MistakeCard.tsx:31,96`](../components/review/MistakeCard.tsx#L31) | `o.charAt(0).toUpperCase()` |
>
> Store bare text and `charAt(0)` reads the first character of the *content* —
> option `"42 m/s"` yields letter `"4"`, which matches no answer, so **every
> question renders as wrong** in all six components at once. Silent, total, and
> invisible until a human looks at a rendered question.
>
> The upside: because each label travels with its own text, **reordering options
> cannot invert the answer**. The v1 "sort before flattening" hazard does not
> exist. What replaces it is narrower and easier to test — strip any label the
> extractor already prefixed (`"A) 42"`, `"(A) 42"`, `"A. 42"`) before
> re-prefixing, so no row is ever stored as `"A. A) 42"`.

### 2b. Extract route — `app/api/admin/dpp/import/route.ts`

A near-copy of `app/api/coaching/questions/import/route.ts`. Keep verbatim:
`runtime = "nodejs"`, `maxDuration = 300`, the NDJSON stream with the 15s `"\n"`
heartbeat (survives Cloudflare's 100s origin cap), the `sharp` downscale to
`MAX_IMAGE_EDGE`, and `req.signal` propagation so a client disconnect aborts
in-flight Gemini calls.

Three changes:

1. **Auth** — swap `getCoachingActor()` + `actor.isSuperAdmin` for
   `isAdminRequest()` from [`lib/requireAdmin.ts:62`](../lib/requireAdmin.ts#L62).
   Admin gates key off the **Clerk session email**, never `userId` — dev and
   prod Clerk issue different userIds for the same person.
2. **Form fields** — replace `exam`/`set` with `dppId`. Keep `qtype` (force
   `"objective"` — DPP has no subjective), `verify`, `verifyModel`,
   `answerModel`, `hindi`, `topics`.
3. **Write rows on the terminal `done` event** as `status: "draft"`,
   `source: "pdf_import"`, preserving `answer_disputed` / `blind_answer` /
   `figure_missing`. Return the row ids in that event.

Call `extractQuestions()` from `lib/coachingImport.ts` unchanged.

**Image folder:** [`uploadCoachingImage`](../lib/coachingImageUpload.ts#L25)
hardcodes `/pattern-master/coaching/${coachingId}`. Generalize it to take a
folder segment (`uploadImportImage(buf, folder, ext)`); the coaching path passes
`coaching/${coachingId}`, DPP passes `dpp/${dppId}`. Keep the existing export as
a thin alias so no coaching call site changes.

### 2c. Insert

Use `createEach` from [`lib/dbHttp.ts:29`](../lib/dbHttp.ts#L29) — parallel
single `create()`s, because `createMany` and `$transaction` throw on the Neon
HTTP adapter. On the standard TCP driver it branches to native `createMany` per
that file's header comment.

`skipDuplicates` is no longer needed: `DppQuestion` has no unique constraint
beyond its PK, which is the point. Duplicates across DPPs are legal and
sometimes desirable.

Order assignment is `max(order) + 1` within the `dpp_id`. For a bulk import that
is one read then a contiguous run.

**Re-import appends — decided.** Importing a PDF into a DPP that already has
questions adds to it; nothing is ever deleted by an import. Replace-on-import is
rejected because one wrong click on the wrong DPP would destroy reviewed work
with no undo, whereas an accidental append is visible and individually
deletable. The "corrected PDF" case is served instead by an explicit **"Clear
all questions"** button in the editor (confirm dialog), plus per-question delete.

**Failure granularity differs by path, deliberately.** A *paste* is
all-or-nothing: it is cheap to fix the JSON and resubmit, and a partial save
would leave the admin guessing which rows landed. A *PDF import* skips the rows
it cannot convert and saves the rest, reporting the skips — sinking a
300-second, paid extraction over one malformed question would be the wrong
trade.

### 2d. Routes

| Route | Purpose |
|---|---|
| `POST /api/admin/dpp` | create an empty DPP `{ patternId, name, order? }` |
| `PATCH /api/admin/dpp/[id]` | rename, reorder, flip `status` to `ready` |
| `DELETE /api/admin/dpp/[id]` | delete DPP + questions (cascade) |
| `POST /api/admin/dpp/[id]/questions` | **paste** one question |
| `PATCH /api/admin/dpp/[id]/questions/[qid]` | edit any field / mark `reviewed` |
| `DELETE /api/admin/dpp/[id]/questions/[qid]` | remove one question |
| `POST /api/admin/dpp/import` | PDF extract stream (§2b) |

Every route gates on `isAdminRequest()` and answers 403, not a redirect.

---

## 3. Admin panel — `app/(app)/admin/dpp/`

Sits alongside the existing super-admin surfaces (`ai-review`, `questions`,
`reports`), guarded by `requireAdmin()` from
[`lib/requireAdmin.ts:29`](../lib/requireAdmin.ts#L29).

**`page.tsx` — list.** `export const dynamic = "force-dynamic"`. One `findMany`
over `Dpp` with `_count: { questions: true }`, joined to `Pattern` for names:
topic, exam/branch, DPP name, question count, `draft`/`ready` pill, last
updated. Follows the list-page shape from
`app/coaching-admin/(dashboard)/students/page.tsx` — dates serialized to ISO,
hand off to a `"use client"` component for mutations + `router.refresh()`.
Filter by topic. "New DPP" button.

No `groupBy`, no `EXPLAIN` worry — this is an indexed `findMany` over a small
table. (v1 needed a `groupBy` over the whole `GeneratedQuestion` bank here; that
concern is gone.)

**`[id]/page.tsx` — the DPP editor.** The main working surface:

- Header: editable name, topic, status toggle (`draft` → `ready`), question count.
- Question list in `order`, each with the review flag pills
  (`answer_disputed`, `figure_missing`, blind-answer disagreement badge),
  reorder (up/down → rewrites `order`), delete, and **full inline edit**.
- **Everything the AI produced is editable.** The extractor is good, not
  perfect, so nothing it writes is final: `question_text`, every option,
  `correct_answer`, `explanation`, `question_type`, `marks`, `difficulty_level`,
  and the Hindi fields. Same form component as the paste form
  (`DppQuestionForm`, prefilled) so paste and edit cannot drift apart. Live
  KaTeX preview on question and explanation. Saving marks the row `reviewed`.
- **Paste form** — question text, options A–D, correct answer, explanation,
  type, marks. Live KaTeX preview. Submits to
  `POST /api/admin/dpp/[id]/questions`.
- **Bulk paste JSON** — `components/dpp/DppBulkPaste.tsx`. Paste an array and add
  every question at once, with a live preview and per-row error flags.
  `coerceQuestionInput` in `lib/dppAdapter.ts` reconciles the key names and the
  four option encodings real-world JSON arrives in, so a paste is not rejected
  over `answer` vs `correct_answer`. The batch is **all-or-nothing** and the
  route reports *every* bad row at once rather than stopping at the first —
  pasting 20 questions should not mean 3 round-trips to find 3 problems.
- **Import button** — `components/dpp/DppImportModal.tsx`. **Not** a fork of
  [`QuestionImportModal.tsx`](../components/coaching/QuestionImportModal.tsx):
  that component is ~1450 lines almost entirely because the coaching flow holds
  review state in React and must render the whole review UI before anything is
  saved. The DPP import route persists rows as it finishes them, so **the editor
  is the review surface** and the modal only needs upload, model toggles, and
  the NDJSON progress stream. The extractor's flags are not lost — they became
  columns (§1) and render as pills on each question.
- **Guard:** soft warning outside 15–20 questions, hard block above 25 on import.
- **"Clear all questions"** — the counterpart to append-only re-import. Confirm
  dialog naming the DPP, scoped to one `dpp_id`.

**`new/page.tsx`** — cascading topic picker (exam → branch → subject → topic
against `Pattern`; reuse the approach in `PyqPicker` inside
`components/coaching/TestWizard.tsx`), name field defaulting to
`DPP {maxOrder + 1}`, create → redirect to `[id]`.

**No Redis, no autosave endpoint.** Edits write to the DB immediately, so a
refresh loses nothing.

---

## 4. Verification

1. **Schema** — confirm target with
   `node -e "console.log(new URL(process.env.DIRECT_URL).host)"`, then
   `npx prisma db push` + `generate`. Assert `Dpp` and `DppQuestion` exist and
   that **`GeneratedQuestion` is unchanged** (no `dpp_*` columns — that would be
   the v1 design leaking back in).
2. **Empty DPP** — create "DPP 1" under a topic with zero questions. It must
   list, open, and survive a reload. This is the workflow the v1 design could
   not express; if it doesn't work, nothing else matters.
3. **Adapter — the highest-risk test.** Unit-test `lib/dppAdapter.ts`: every
   stored option must **start with its own label** (`"A. 42 m/s"`), because six
   renderers read the letter via `charAt(0)`. Cover options arriving out of
   label order, options the extractor already prefixed (`"A) 42"`, `"(A) 42"` —
   must not become `"A. A) 42"`), and a numeric-labelled set (`"1"`, `"2"`).
   Then end-to-end: commit, open in the admin editor, confirm the correct option
   is marked right. This is the one place content corrupts invisibly.
4. **Adapter — types.** Stored rows must have uppercase `question_type`,
   `options` as a flat string array of label-prefixed strings, `explanation`
   populated from `solution` (never `null`), and `order` 1..N contiguous.
   `subjective` input must be rejected, not silently coerced. A NAT question
   with a tolerance must store a `"lo:hi"` range, not a bare value.

   > Covered by `lib/dppAdapter.test.ts` (`npx tsx --test lib/dppAdapter.test.ts`),
   > which is the fast feedback loop for all of §2a. Checks 5–11 below still
   > need a real DPP.
5. **Paste** — add three questions one at a time. `order` must be 1, 2, 3. Add a
   question whose text already exists verbatim in `GeneratedQuestion`; it must
   save (no `semantic_hash` collision — this is the constraint that made the v1
   design unworkable for curation).
6. **Extraction** — upload a real 18-question DPP PDF with at least two diagram
   questions. Watch the NDJSON stream: `phase` events fire, figures crop and
   land on ImageKit under `/pattern-master/dpp/<dppId>`, `figure_missing` is not
   set on the diagram questions.
7. **Refresh safety** — extract, reach review, **hard-refresh the browser**,
   reopen the DPP. Every extracted row and every edit must still be there. In v1
   this required a Redis layer; here it must work for free.
8. **Re-import appends** — import the same 18-question PDF into a DPP twice. The
   result is 36 questions with `order` 1..36 contiguous, and the first 18 still
   carry any edits made between the two imports. Nothing is silently deleted.
   Then use "Clear all questions" and confirm it empties the DPP without
   touching any other DPP.
9. **Edit persists** — import, then rewrite one question's text, an option, the
   correct answer and the explanation. Reload. All four edits survive, the row
   shows `reviewed`, and a re-import does not overwrite them.
10. **Delete cascade** — delete a DPP with 18 questions; all 18 rows go, and no
    `GeneratedQuestion` row is touched.
11. **No public bleed** — after importing 18 questions, the topic's public page
    question count, the practice feed, and `/sitemap/topics.xml` must be
    **byte-identical** to before. This should hold by construction; verify it
    once so the guarantee is documented rather than assumed.
11. **Auth** — every `/api/admin/dpp/*` route returns 403 for a signed-in
    non-admin and for a signed-out request. Test in **dev**, where Clerk issues
    a different userId than prod — that is what the email-keyed gate exists for.

---

## 5. Phasing

**Phase 1 — the operator tool (this document).**
`prisma/schema/dpp.prisma` + `db push` → `lib/dppAdapter.ts` → DPP CRUD routes →
`/admin/dpp` list + editor + paste form → import route + `DppImportModal`.
Stop here and build 3–4 real DPPs by hand and by PDF.

**Phase 2 — students can do it. BUILT.** Test mode (`TestEngine` + `DppRun` +
the challenge loop) and Practice mode (`PracticeButton`) both ship.

The two predicted `PracticeButton` edits were both real and both made:

1. The URL effect unconditionally `router.replace('/practice?q=…')` on every
   question change, which would yank a DPP user to `/practice`. Now guarded by
   `urlSync?: boolean` (default `true`, so existing callers are unaffected).
2. When the queue empties and `isPyqMode` is false, `handleNextFromQueue` called
   `handleGenerate()` → POSTs `/api/generate-question`, so finishing any DPP
   would silently fire AI generation. Now `onComplete?: () => void`, checked
   *before* the `isPyqMode` branch.

**A third hazard the plan missed, found during the build.** The bullet above
assumed `Attempt.dpp_question_id` would land first. It has not, and
`PracticeButton` persists per question — so a `DppQuestion` uuid would be posted
to `/api/save-attempt` as `questionId`, which FKs `GeneratedQuestion`. The insert
raises P2003, save-attempt reads that as "User row missing", syncs from Clerk and
retries, and the retry raises P2003 *outside* the catch → a 500 for every
answered question, plus an optimistic `bumpSolved` the server never agrees with.
`Bookmark.question_id`, `/api/questions/generate-explanation` and
`quickEditExplanation` have the identical problem.

Guarded by a `_isDpp` discriminator on the question object — the existing
`_isPyq` / `_isSubjectPyq` / `isMock` idiom — which short-circuits the four
writes and hides the three UI affordances that would otherwise be visible and
permanently broken. **When `Attempt.dpp_question_id` lands, remove the guard in
`handleSubmit` and pass the id instead.** Until then DPP practice is
deliberately not counted in streaks or solved totals.

**Practice is gated behind a submitted run** (`hasSubmittedRun` in
`lib/dppPractice.ts`), enforced in the practice route itself — not just by
hiding the tile, since the URL is guessable from the sheet id.

The reasoning, because it is easy to "simplify" this away later: practice ships
the answer key to the browser. Ungated, a student could read the answers and
then take the "timed test", which would quietly make every `DppRun` score — and
therefore the entire challenge loop, the only reason this feature exists —
meaningless. After a submission there is nothing left to protect, because the
result page already shows every answer and explanation. So the gate costs
nothing real and closes the hole completely: practice is a **review** tool, and
the result page is where it is discovered.

The rejected alternatives were test-only (practice duplicates the Question bank
and PYQ tabs, which sit in the same `PatternRow` and additionally record
attempts) and both-modes-open (the leak above).

### Attempt wiring — stage 1 of 2 (DONE)

`Attempt.dpp_question_id` exists, and **practice mode** writes one row per
answered question. Consequences, all intended:

- **Dashboard streak/activity works immediately.** That query is
  `COUNT(*) … GROUP BY DATE(created_at)` with no question join, so it needed no
  change at all.
- **Topic solved-counts deliberately exclude DPP.** `/api/practice/progress`
  joins only `GeneratedQuestion` and `PYQ`, and the bar's denominator is bank +
  PYQ. Counting DPP in the numerator would push topics past 100%. The optimistic
  `bumpSolved` in `PracticeButton` is skipped for the same reason. **If DPP is
  ever meant to count, the denominator must grow in the same commit.**
- **`onDelete: SetNull`, not Cascade.** Deleting a DPP must not retroactively
  erase a student's activity history and break their streak.
- **The mistakes/review queries were hardened, not extended.** Both partition on
  `COALESCE(question_id, pyq_id)`; a DPP row is null in both, so all DPP
  mistakes would have collapsed into one partition, kept one arbitrary row and
  burned a slot in the `LIMIT 100`. Both now carry the
  `COALESCE(...) IS NOT NULL` guard the dashboard already had.

The plan originally said "three `UNION ALL` sites". It is **seven**:
`app/(app)/{mistakes,review}/page.tsx`, two queries in
`app/(app)/dashboard/_lib/queries.ts`, `app/api/patterns/[id]/questions/route.ts`,
`app/api/practice/progress/route.ts`, `app/api/practice/topics/route.ts`.

### DPP mistakes — a third tab, not a third `Attempt` source (DONE)

The mistake room now has **Practice / Mocks / DPP** tabs, and the DPP tab reads
`DppRun.answers` directly. No `Attempt` rows, no `COALESCE` changes, no join.

This works because the **Mocks tab never used `Attempt` either** — it reads
`TestSession.answers` JSONB. And `DppRun.answers` was built byte-compatible with
that shape on purpose (see `prisma/schema/dpprun.prisma`). So the DPP panel is
structurally the mocks panel: `DISTINCT ON (dpp_id)` for the latest submitted
run per sheet, filter the breakdown to `isCorrect === false` (skips are `null`,
so they fall out without needing the mocks' `isSkipped` flag), group by sheet.

**This deleted the hard half of the original stage 2.** No test-mode `createEach`
fan-out at submit, no `MistakeCard` third source, no
`DppQuestion → Dpp → Pattern` join path — the breakdown already carries subject
and topic denormalised. Two link targets fall out for free: `/dpp/r/<code>` for
the full analysis, and `/dpp/<id>/practice`, which is guaranteed unlocked because
practice's gate *is* "has submitted a run".

Shared `WrongRows` now renders the expanded question list for both panels; the
mocks panel was refactored onto it rather than the markup being duplicated.

**Consequence to keep in mind:** the DPP tab shows only the LATEST submitted run
per sheet, matching mocks. Retake a DPP and the previous attempt's mistakes are
superseded, not merged.

**Still open:** DPP wrong answers are not in `Attempt`, so they do not reach the
Practice tab's pattern-grouping, the SRS review queue, or `currentMistakesCount`
on the dashboard. Only practice-mode answers write `Attempt` rows today. If test
mode should feed those too, that is the `createEach` fan-out in `gradeDppRun`
(note `$transaction`/`updateMany` throw on the Neon HTTP adapter) plus swapping
the `IS NOT NULL` guards for `COALESCE(question_id, pyq_id, dpp_question_id)`.

**Phase 3 (later) — public/SEO.** Routes under
`/[examType]/[subject]/[topic]/dpp`, `is_public` filtering, metadata + JSON-LD,
a `"dpp"` sitemap child. The v1 plan's §8 is a good starting point when this
comes up.

---

## Critical files

**New (all built):**
`prisma/schema/dpp.prisma` · `lib/dppAdapter.ts` · `lib/dppAdapter.test.ts` (27
tests) · `app/api/admin/dpp/route.ts` · `app/api/admin/dpp/[id]/route.ts` ·
`app/api/admin/dpp/[id]/questions/route.ts` ·
`app/api/admin/dpp/[id]/questions/[qid]/route.ts` ·
`app/api/admin/dpp/import/route.ts` ·
`app/(app)/admin/dpp/{page.tsx,new/page.tsx,[id]/page.tsx}` ·
`components/dpp/{DppListClient,DppNewClient,DppEditor,DppQuestionForm,DppBulkPaste,DppImportModal}.tsx`

**Modified:**
`prisma/schema/schema.prisma` (one back-relation `dpps Dpp[]` on `Pattern`) ·
`lib/coachingImageUpload.ts` (new `uploadImportImage(buf, folder, ext)`;
`uploadCoachingImage` kept as a wrapper) · `lib/coachingImport.ts` (the crop
chain threads a **folder segment** instead of a bare coaching id — 10
occurrences renamed, no behaviour change) ·
`app/api/coaching/questions/import/route.ts` (passes `coaching/${coachingId}`,
so its figures land on the same ImageKit path as before)

**Reused unchanged (the point of the design):**
`lib/coachingImport.ts` (`extractQuestions`, `verifyAnswers`,
`cropQuestionImage`, `mapLimit`) · `lib/coachingQuestionValidate.ts`
(`normalizeMcqAnswer`) · `lib/dbHttp.ts` (`createEach`) · `lib/pdfRaster.ts` ·
`lib/requireAdmin.ts`

**Deliberately NOT touched (contrast with v1):**
`GeneratedQuestion` · `app/api/patterns/[id]/questions/route.ts` ·
`app/[examType]/[subject]/[topic]/_lib/dataFetch.ts` · `lib/sitemap-data.ts` ·
`lib/draft.ts`

**Phase 2 additions:**
`lib/dppPractice.ts` (answer-INCLUDING loader — deliberately a separate module
from the answer-free `lib/dppPaper.ts`, so the Test path structurally cannot
serve a key) · `lib/dppOptions.ts` `sortStoredOptions` (permutes stored options
into label order for display; never rewrites a string, so the label cannot be
separated from its text) · `app/dpp/[dppId]/practice/page.tsx` ·
`components/dpp/DppPracticeClient.tsx` · additive edits to
`components/patterns/{PracticeButton,QuestionMetaBar,ExplanationPanel}.tsx`
