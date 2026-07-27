# Paid Special Tests — pay-per-test via Razorpay

## Context

BattleExam's mock tests are all free today. The goal: let admin mark individual seeded mocks as **paid "special tests"** — a user pays a one-off charge (not a subscription/series) and gets **lifetime access to that specific test** (retakes free). Audience is platform users (Clerk sign-in) on the consumer mock-test flow.

The repo has **zero payment-gateway code** (all existing "billing" is manual bookkeeping), so Razorpay Checkout integration is greenfield. `MockTestTemplate` has no price/visibility fields, and there is no per-test authorization anywhere — any signed-in user can fetch any test's questions via `app/api/test/generate/route.ts`.

**Confirmed decisions:** platform users · Razorpay Checkout · lifetime access per test · `is_paid` + `price` columns on the existing `MockTestTemplate`.

## Key design decisions

- **Entitlement identity = email, not Clerk userId.** `app/(app)/layout.tsx:70` rewrites `User.id` when the same email signs in from a different Clerk instance (dev vs prod) — purchases keyed on userId would be orphaned. `lib/requireAdmin.ts` already keys on email for this exact reason. Store `user_id` for audit only; all lookups by lowercased `user_email`.
- **Dual idempotent grant path** (solves webhook-vs-redirect race): entitlement flips to `paid` via *either* the client-side verify endpoint (HMAC `order_id|payment_id` with key secret) *or* the webhook (HMAC of raw body with webhook secret). Both call one shared `grantPurchase()` that is replay-safe; whichever arrives first wins, the second is a no-op. User unlocks instantly after checkout; webhook is the backstop.
- **Money:** Int rupees in DB (repo convention, like `BillingEvent.amount`); convert to paise (`×100`) only at the Razorpay API boundary. Server always computes amount from DB price — never trusts client.
- **Driver-aware writes:** single-row `create`/`update` by unique key only — no `$transaction`/`upsert`/`updateMany` (Neon HTTP constraint; keep parity with `lib/dbHttp.ts` patterns).
- **Free tests pay zero cost:** every gate checks `is_paid` on the already-cached template first; email/DB lookups only happen for paid templates.
- **No SDK dependency:** order-create is one `fetch` to Razorpay's REST API + two `crypto.createHmac` verifications.

## Phase 1 — Schema (`prisma/schema/schema.prisma`)

On `MockTestTemplate` (line ~183): add `is_paid Boolean @default(false)`, `price Int @default(0)` (rupees), `purchases TestPurchase[]`.

New model (near `BillingEvent`, which is the idempotency precedent):

```prisma
model TestPurchase {
  id                  String    @id @default(uuid())
  user_email          String    // stable identity (survives Clerk userId rewrites)
  user_id             String    // Clerk userId at purchase time — audit only
  template_id         String
  amount              Int       // rupees at time of purchase
  currency            String    @default("INR")
  razorpay_order_id   String    @unique   // idempotency anchor for webhook replays
  razorpay_payment_id String?   @unique   // guards double-capture
  status              String    @default("created") // created | paid | void
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  paid_at             DateTime?
  voided_at           DateTime? // void-not-delete, per coaching fees convention
  void_reason         String?
  template            MockTestTemplate @relation(fields: [template_id], references: [id])

  @@index([user_email, template_id, status])
  @@index([template_id, status])
}
```

Abandoned checkouts leave harmless `created` rows; only `status = "paid"` grants access.

**User runs `prisma db push` manually** — known trap: Prisma CLI reads `.env` (prod); confirm `DATABASE_URL` targets the intended DB (dev branch vs VPS) before pushing.

## Phase 2 — Payments library (new `lib/payments.ts`)

- `createRazorpayOrder({amountPaise, receipt, notes})` — `fetch` POST `https://api.razorpay.com/v1/orders`, Basic auth `RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`.
- `verifyCheckoutSignature(orderId, paymentId, sig)` — HMAC-SHA256 of `order_id|payment_id` with key secret, `timingSafeEqual`.
- `verifyWebhookSignature(rawBody, sigHeader)` — HMAC-SHA256 of raw body with `RAZORPAY_WEBHOOK_SECRET`.
- `grantPurchase(orderId, paymentId)` — the single idempotent grant: findUnique by `razorpay_order_id` → unknown = no-op; `paid` = replay no-op; `void` = refuse + log; else single-row `update` to `paid` (catch unique-violation on `razorpay_payment_id` as success — the other path won the race). Then fire-and-forget Redis entitlement key set.

**Env vars:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` (checkout.js needs key id client-side).

## Phase 3 — API routes (new)

- **`app/api/payments/order/route.ts` (POST):** `auth()` → resolve email → load template via `getCachedTemplateById` → reject if not paid (400) or already owned (409 `{alreadyOwned:true}`) → `amountPaise = price*100` from DB → create Razorpay order (`notes: {templateId, email, userId}`) → `testPurchase.create` status `created` → return `{orderId, amountPaise, currency, keyId, title}`.
- **`app/api/payments/verify/route.ts` (POST):** `auth()` → verify checkout signature → `grantPurchase` → `{ok:true}`.
- **`app/api/payments/webhook/route.ts` (POST):** **no Clerk/auth/cookies** (server-to-server; `clerkMiddleware()` doesn't block unauthenticated API routes — confirm in testing). `await req.text()` FIRST (raw body needed for HMAC), verify `x-razorpay-signature`, handle `payment.captured` (+ `order.paid` belt-and-braces) → `grantPurchase` → always 200 fast (Razorpay retries non-2xx; grant is idempotent). `export const dynamic = "force-dynamic"`. Don't log full bodies (PII) — order/payment ids + event only.
- **`app/api/admin/purchases/route.ts`:** GET list (filter by email/template), PATCH void `{purchaseId, reason}` → `status:"void"` + `voided_at` (never delete), then delete the Redis entitlement key. Refunds happen manually in the Razorpay dashboard (v1).

## Phase 4 — Entitlement helper + gates

- **`lib/mockTemplate.ts`:** add `is_paid`/`price` to `CachedTemplate` + `toCached()` with defaults (`!!t.is_paid`, `t.price ?? 0`) so pre-existing cached blobs deserialize as free — safe because a template only becomes paid via the admin route, which invalidates.
- **New `lib/sessionEmail.ts`:** `getSessionEmail()` — copy `requireAdmin`'s ladder (sessionClaims.email fast path → `currentUser()` retry → lowercase), plus Redis memo `user:email:{userId}` (TTL ~7d).
- **New `lib/entitlement.ts`:** `hasTestAccess(templateId, {template?})` — free template → allowed immediately; paid → email → Redis `ent:{email}:{templateId}` (no TTL) → miss → `testPurchase.findFirst({user_email, template_id, status:"paid"})` → backfill Redis. Export `grantEntitlementCache`/`revokeEntitlementCache`. Redis-down → straight to DB (warn-and-continue like `mockTemplate.ts`).
- **Gates (402 `{error:"payment_required", locked:true, templateId, price, title}` on failure):**
  - [app/api/test/generate/route.ts](app/api/test/generate/route.ts) — `templateId` branch (~L218) and `seeded` branch (~L237): check after template resolves, before returning questions. `random` branch (~L252): add `is_paid: false` to the `where` so paid templates never enter the random pool (no per-user check needed).
  - [app/api/test/session/start/route.ts](app/api/test/session/start/route.ts) — check before draft create when `mockTestId` present.
  - [app/api/test/submit/route.ts](app/api/test/submit/route.ts) (~L121) — template already fetched; pass into `hasTestAccess` (defense in depth, free for free tests).

## Phase 5 — Listings (`app/api/test/mocks/route.ts`)

Add `is_paid`/`price` to both `unstable_cache` selects; after the shared list, if any mock is paid, resolve email once + one `testPurchase.findMany({template_id: {in: paidIds}, status:"paid"})` → emit `is_paid`, `price`, `purchased` per mock (list and single-id shapes). Stale cache post-deploy renders as free for ≤10 min — harmless; `POST /api/admin/revalidate-mocks` busts on demand.

## Phase 6 — Client UI

- **New `components/payments/BuyTestButton.tsx`:** on-demand inject `checkout.razorpay.com/v1/checkout.js` (cached promise) → `POST /api/payments/order` → `new window.Razorpay({...})` → handler POSTs `/api/payments/verify` → `onUnlocked()`. Handle `modal.ondismiss` (reset), verify failure ("payment received, verification pending — webhook will land it"), and order 409 `alreadyOwned` as instant unlock.
- **[components/test/MockTestPage.tsx](components/test/MockTestPage.tsx) + BriefPhase + SetupPhase:** extend `SeededMock` with the three fields; setup list shows lock + ₹price badge; brief screen swaps Begin for `BuyTestButton` when `is_paid && !purchased`; `onUnlocked` patches state → Begin appears. `startTest` 402 → bounce to brief with "purchase required" (covers deep links/stale state).
- **ISR landing page [app/mock-tests/[examType]/[branch]/[mockId]/page.tsx](app/mock-tests/[examType]/[branch]/[mockId]/page.tsx):** add fields to select, static "Premium · ₹{price}" badge + "Unlock & Start →" CTA copy. Per-user owned state NOT resolved here (public ISR) — the brief screen is the real gate.
- **My purchases (optional, last):** `GET /api/payments/mine` + small account-page section.

## Phase 7 — Admin pricing

- **New `app/api/admin/mock-pricing/[mockId]/route.ts` (PATCH)** — mirror [app/api/admin/mock-images/[mockId]/route.ts](app/api/admin/mock-images/[mockId]/route.ts): `isAdminRequest()` guard, validate (`price > 0` when `is_paid`), `mockTestTemplate.update`, then invalidate **all three cache layers**: `invalidateMockTemplate(id)` (Redis blob) + `revalidateTag("mocks", "max")` (repo's existing two-arg form, e.g. `app/actions/admin.ts:213`) + `revalidatePath` of the landing page using `toSlug` from `lib/seo`.
- **New `app/(app)/admin/pricing/page.tsx`:** `requireAdmin()`; list seeded mocks with inline is_paid/price editor; purchases/void table can share this page or defer.

## Build order

1. Schema → user runs `prisma db push` (everything depends on it).
2. `lib/mockTemplate.ts` fields + `lib/sessionEmail.ts` + `lib/entitlement.ts`.
3. `lib/payments.ts` + order/verify/webhook routes (testable with curl + Razorpay test keys; nothing user-visible).
4. Gates in generate/start/submit (no user impact until a mock is flagged paid).
5. Mocks API payload → client UI (BuyTestButton, MockTestPage, landing page).
6. Admin pricing route + page; flag one cheap test mock in dev.
7. Void route + my-purchases.

## Verification

- **Razorpay test mode:** `rzp_test_*` keys; card 4111 1111 1111 1111 (+ a failure card). Dev webhook via `cloudflared tunnel --url http://localhost:3000` registered in Razorpay dashboard → `/api/payments/webhook`, events `payment.captured` + `order.paid`; or rely on verify locally and test webhook on the VPS.
- **Free tests unaffected:** free/random mocks generate/start/submit with zero extra lookups.
- **Lock enforced:** paid mock + no purchase → 402 from generate (both branches), session/start, submit; random branch never serves paid templates.
- **Purchase unlocks instantly** via verify; retake later still free.
- **Webhook idempotency:** resend same webhook from Razorpay dashboard → 200, no state change, exactly one paid row. Also verify webhook-alone grants (verify disabled) and verify-before-webhook ends in one paid row.
- **Identity stability:** purchase under prod Clerk, sign in on dev Clerk (same email, different userId) → entitlement still resolves (email-keyed).
- **Cache layers:** admin price flip → landing badge, `/api/test/mocks`, and Redis template blob all update.
- **Void:** void purchase → Redis key deleted → next generate returns 402.

## Deferred: credit packs (v2, do not build in v1)

At ₹10–15/test the per-purchase Razorpay ceremony (UPI PIN, app bounce, ~40s) costs the user more than the money does. If live data shows Checkout opens without completions, the fix is prepaid credit packs (₹99/10 tests, ₹199/25) — still pay-per-test (one credit per test, user picks which), but one payment flow instead of many.

Decisions already made, so they don't get relitigated:
- **One universal wallet, not per-exam wallets.** Audiences are disjoint (a GATE CSE user never spends on NEET; `User.preferred_exam` already records which they are). Per-exam balances add stranded balances, split-balance UI, and messier refunds to prevent something that doesn't happen. Sell the pack *in context* (offer surfaced on the GATE CSE listing) so it reads exam-specific while staying generic in the DB.
- **Variable cost per test:** add `credit_cost Int @default(1)` to `MockTestTemplate` alongside `price`. This is what keeps one credit meaningful when a 180-Q full mock sits next to a 30-Q topic test, and it also covers per-exam price differences — which is the only real reason someone would reach for separate wallets.
- **No rework of v1:** a credit ledger becomes a second thing that writes an entitlement. `grantPurchase()` and `hasTestAccess()` are already separate, so the gates in generate/start/submit are untouched.

## Risks / notes

- The entitlement gate must sit before ANY `NextResponse.json` containing questions (`questions Json` holds correct answers; `safeQuestions` strips them but the payload itself is the product).
- Seed scripts mutate `mockTestTemplate` without invalidating the Redis cache — fine for pricing (admin route is the only price mutator), but don't set prices via scripts without calling `invalidateMockTemplate`.
- This Next.js version has breaking changes (per AGENTS.md) — consult `node_modules/next/dist/docs/` for any API in doubt; repo already uses the two-arg `revalidateTag(tag, "max")` profile form and async route params.
