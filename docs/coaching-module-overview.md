# BattleExam — Coaching Module (B2B)
### Complete Functionality Overview — for PDF / Presentation

> A multi-tenant testing platform that lets a coaching institute run its own
> branded online tests: build a question bank (manually or via AI), schedule
> tests, have students attempt them on phones, auto-grade server-side, and see
> leaderboards, per-student analytics, and billing — all isolated per institute.

---

## 1. What it is (one line)

A white-label, multi-tenant online test engine for coaching institutes — each
institute gets its own space at `/c/<slug>`, its own students, question bank,
tests, leaderboards, analytics, and billing, fully isolated from every other
institute.

---

## 2. Who uses it (roles)

| Role | Signs in with | Scope |
|------|---------------|-------|
| **Super admin** (platform owner) | Clerk email (allowlist) | Everything; can approve institutes and "act as" any coaching via an impersonation cookie |
| **Coaching owner / admin** | Clerk login (linked by email → `CoachingAdmin`) | Exactly one coaching's dashboard |
| **Student** | Phone + PIN cookie session (not Clerk) | Their own attempts inside one coaching |

- Owner identity is **claimed on first login**: a Clerk user whose email matches an approved coaching's `owner_email` automatically becomes its owner.
- Super-admin checks key off the **Clerk session email**, not user ID (dev/prod Clerk issue different IDs).

---

## 3. Tech stack

- **Framework:** Next.js (App Router, server components)
- **Auth:** Clerk (admins) + custom cookie sessions (students)
- **DB:** Prisma → **Neon Postgres** (HTTP adapter — no transactions, so find-then-create with unique constraints)
- **Cache:** Upstash Redis (multi-tier — see §13)
- **AI:** Google Gemini (`gemini-3.1-flash-lite`) for bulk question import
- **Images:** ImageKit (question diagrams, cropped via `sharp`)
- **Delivery:** PWA install (native Capacitor app on hold); hosted on Vercel + Cloudflare

---

## 4. Institute onboarding (multi-tenancy lifecycle)

1. **Apply** — public form at `/for-coachings` → `POST /api/coaching/apply`. Creates a `pending`, inactive `Coaching` with a unique slug + join code.
2. **Approve** — super admin reviews at `/admin/coachings`, sets pricing, and activates (`pending → approved`).
3. **Claim** — owner signs in with the application email; the system links their Clerk ID and unlocks the dashboard.
4. **Operate** — owner manages students, questions, tests, billing.

Application states: `pending → approved | rejected`. Pending/rejected institutes can sign in but get a "pending access" screen.

---

## 5. Student authentication

- **Join** (`/c/<slug>/join`): name + phone + PIN + the coaching's **join code**. Creates the student (find-or-create on `coaching_id + phone`). Re-joining acts as a **self-service PIN reset**.
- **Login** (`/c/<slug>/login`): phone + PIN.
- **PIN** is the secret — scrypt-hashed; phone alone can't log in. Phone is unique **per coaching** (siblings can't share).
- **Single active session** ("newest login wins"): each login writes a fresh `session_token`; older sessions are kicked.
- **Rate limiting** on login throttles PIN guessing (keyed by coaching + phone) before the expensive hash verify.
- **"Remember coaching"** so returning students land on their institute directly.

---

## 6. Question bank

Per-coaching bank of `CoachingQuestion` rows.

- **Question types:** MCQ, NAT (numeric answer, with tolerance), Subjective.
- **Bilingual:** every field has an English + Hindi counterpart (Hindi falls back to English when blank).
- **Rich content:** LaTeX math, images/diagrams (ImageKit), worked solutions (pre-rendered HTML for fast display).
- **Taxonomy / folders:** `grade` (exam/class) → `subject` (section) → `set_name` (mock/chapter) → `topic`. Drives a folder-style browse + filter UI.
- **Bank operations:** create, edit, delete, filter by grade/subject/set/type, "recently added" view, full-text search on question text, paginated ("load more").
- **Difficulty** tagging and **per-question marks**.

---

## 7. AI bulk import (Gemini)

`/api/coaching/questions/import` → review modal → `/commit`.

- **Inputs:** photos of a question paper **or** a PDF. Admin picks the Exam + Set once; it's applied to every extracted row.
- **Gemini extracts** each question into strict JSON: text, type, options, correct answer, marks, solution.
- **Auto-translate** English ↔ Hindi (LaTeX/numbers preserved).
- **Auto-classify** each question into one of the exam's **exact section names** (never invents one) + optional topic.
- **Diagram handling:** Gemini returns a bounding box; `sharp` crops the diagram and uploads it to ImageKit.
- **Confidence score** per question + a **mandatory human review** step before anything is saved to the bank.

---

## 8. Test creation (Test Wizard)

`/coaching-admin/tests/new` — multi-step `TestWizard`.

- **Pull questions from 3 sources:** the coaching's own bank, **PYQ** (previous-year questions, with filters), and **generated** questions.
- **Sections:** group questions into named sections (e.g. Quant / Reasoning) for sectioned scoring.
- **Pooling:** `pool_size` — give each student a *random subset* of the question set.
- **Shuffling:** randomize question order (and option order) per student.
- **Marks & negative marking** per question.
- **Scheduling:** `duration_secs`, `start_at`, `end_at` (submission window).
- **Lifecycle:** `draft → active → closed`.

---

## 9. Test-taking engine (student side)

`/c/<slug>/test/<testId>` — `StudentTestRunner`.

- **Deterministic per-student assembly:** the question set + order is derived from a seed (`studentId:testId`), so the **same set is shown on render and used at grading** — nothing extra to persist, stable across reloads/resume.
- **Per-student option shuffle:** option order is permuted per student; the server de-shuffles back to the original letters at grading.
- **Server-authoritative timer:** the browser shows a countdown, but the effective deadline = `min(started_at + duration, end_at)` and the **server decides when time is up** (with a grace window for jitter).
- **Autosave:** in-progress answers are continuously saved to **Redis (no DB hit)**, scoped to the student's attempt — a whole batch saving every couple minutes adds zero DB load.
- **Resume:** an interrupted attempt (closed app, dead battery) resumes exactly where it left off.
- **Anti-cheat — tab-switch tracking:** each time the student leaves the tab, a counter increments (Redis `INCR` via `sendBeacon`); the total is flushed into the attempt at submit and shown to the admin.
- **Idempotent attempts:** one attempt per (test, student); already-submitted redirects to results.

---

## 10. Submission & grading (server-side)

`POST /api/student/test/<testId>/submit` → shared `gradeAndWrite`.

- **Server-authoritative scoring:** answers are graded on the server against the exact resolved question set; the client score is never trusted.
- **Deadline enforcement:** submits past the deadline + grace are refused (answers are finalized from autosave instead — see below).
- **Guarded, race-safe write:** the write is gated on `status: "in_progress"`, so a double-click / retry / second tab / replay can't overwrite an existing submission (**first valid submit wins**).
- **Scoring rules:** negative marking supported; per-section tally; total floored at 0.
- **Finalize-on-view (no scheduler):** a student who never submitted (app closed, lost Wi-Fi) is **auto-graded from their last autosaved draft** the next time a coach or student opens the results/leaderboard — so no attempt is lost.

---

## 11. Results & analytics (per student)

- **Student result page** (`/c/<slug>/result/<attemptId>`) and **admin per-attempt view** (`/coaching-admin/attempts/<attemptId>`) share **one** analysis builder, so they grade identically.
- **Breakdown:** overall score, **section-wise** scores, per-question correct/wrong/skipped, time spent per question, tab-switch count.
- **Peer comparison:** a student's performance relative to peers on the same test.
- Result data is **cached per attempt** (grading is frozen once submitted).

---

## 12. Leaderboard & institute insights

- **Per-test leaderboard** (`/c/<slug>/leaderboard/<testId>`): all submitted attempts ranked by **score, then speed, then submit time**; Redis-cached and busted the instant any attempt is graded. Same ranking used by the admin results page.
- **Institute insights** (`/coaching-admin/insights`), cached, derived entirely from existing attempts:
  - **Weak students** — lowest average %
  - **Improving students** — biggest upward trend
  - **Absent students** — active students who missed closed tests
- **Owner dashboard** (`/coaching-admin`): live aggregates (submissions, recent activity, monthly totals) + per-student drill-down.

---

## 13. Billing

- **Two modes per coaching:** `per_test` (₹ `price_per_test` × submitted attempts) or `monthly` (flat `monthly_fee`).
- **Billing periods** (`BillingPeriod`): one row per coaching per month, status `due → paid`, with a snapshot of submissions + amount.
- **Manual/offline reconciliation:** the dashboard derives the amount due from submission counts; a super admin marks periods paid. (No automatic charge in v1.)
- Bills view at `/coaching-admin` → bills, and super-admin bills at `/api/admin/coachings/<id>/bills`.

---

## 14. Admin experience & mobile/PWA

- **Responsive admin shell:** desktop sidebar (`AdminSidebar`) + mobile bottom nav + mobile header.
- **Loading states** (skeletons) on every heavy page.
- **PWA install** is the primary mobile path; the service worker is deliberately **non-caching** to avoid stale-chunk crashes. (Native Capacitor app is paused.)

---

## 15. Performance & caching architecture

Multi-tier Redis caching keeps Neon compute low even during exam-day spikes:

| Cached | Why |
|--------|-----|
| Coaching by slug | every page in `/c/<slug>` needs it |
| Full test row + runtime config | identical for all students, immutable while window open |
| Leaderboard (per test) | a whole batch reloads it after a test |
| Attempt result data | grading is frozen after submit |
| Taxonomy / sections | rarely changes |
| Autosave drafts + tab-switch counters | keep the hot path **off** the DB entirely |
| "Test finalized" marker | lets repeat result views skip DB reads once everyone's graded |

Other choices: find-then-create instead of `upsert` (Neon HTTP adapter has no transactions); composite DB indexes per tenant; DB-retry wrapper for transient Neon blips.

---

## 16. Security model (highlights)

- **Strict tenant isolation:** every query is scoped by `coaching_id`; students/admins can't reach another institute's data.
- **Server-authoritative** grading + deadlines (client never trusted).
- **Race-safe submit** (guarded status write).
- **Hashed PINs** (scrypt), single-session enforcement, login rate limiting.
- **Mandatory human review** before AI-imported questions go live.

*(Known hardening backlog: unify login error responses to stop phone enumeration; add a rate limit to the join endpoint.)*

---

## 17. Data model (core tables)

```
Coaching ─┬─ CoachingAdmin (owner/admin ↔ Clerk)
          ├─ Batch ─── Student ─── TestAttempt
          ├─ CoachingQuestion        │
          ├─ CoachingTest ───────────┘
          ├─ ExamSection (section catalog)
          ├─ BillingEvent
          └─ BillingPeriod
```

Key tables: **Coaching** (tenant), **CoachingAdmin** (admin link), **Batch**,
**Student**, **CoachingQuestion** (bank), **ExamSection** (sections per exam),
**CoachingTest**, **TestAttempt** (the graded record), **BillingPeriod / BillingEvent**.

---

## 18. End-to-end flow (the story for a slide)

```
Institute applies → Super admin approves & prices → Owner claims login
   → Owner builds question bank (manual or AI import)
   → Owner creates a scheduled test (bank + PYQ, sections, pool, shuffle)
   → Students join (code + PIN) → attempt on phone (timer, autosave, anti-cheat)
   → Server grades on submit (or auto-finalizes no-shows on view)
   → Students see results + leaderboard; owner sees insights
   → Billing accrues per submission / per month
```

---

## 19. Suggested slide deck outline (PPT)

1. **Title** — BattleExam Coaching: white-label online testing for institutes
2. **The problem** — institutes run tests on paper / generic tools; no analytics, no scale
3. **The solution** — one line + screenshot of `/c/<slug>`
4. **Who uses it** — the 3 roles (table from §2)
5. **How an institute gets started** — the 4-step onboarding (§4)
6. **Question bank** — types, bilingual, taxonomy (§6)
7. **AI import** — photo/PDF → reviewed questions in minutes (§7) ⭐ wow-factor slide
8. **Building a test** — wizard, sources, sections, scheduling (§8)
9. **The student experience** — timer, autosave, resume, anti-cheat (§9)
10. **Fair & reliable grading** — server-side, race-safe, no-show recovery (§10)
11. **Results & leaderboard** — analytics screenshots (§11–12)
12. **Institute insights** — weak / improving / absent (§12)
13. **Billing** — per-test vs monthly (§13)
14. **Built for mobile** — PWA (§14)
15. **Under the hood** — multi-tenant + caching diagram (§13, §17)
16. **Security & reliability** (§16)
17. **Roadmap** — homework, attendance, parent app, question-bank scale
18. **Close / ask**

> ⭐ Lead the demo with **AI import (slide 7)** and the **mobile attempt + anti-cheat (slide 9)** — those land hardest with institute owners.
```
