import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

// Cookie a super admin sets (via /admin/coachings "Manage") to act on behalf of
// a specific coaching. Read here so EVERY coaching-admin page/API transparently
// scopes to it without per-page impersonation logic.
export const SA_IMPERSONATE_COOKIE = "sa_coaching_id";

/**
 * Resolved identity of the signed-in Clerk user within the coaching layer.
 *
 * Two distinct actors share /coaching-admin:
 *   - Super admins (ADMIN_EMAILS) — platform owners. `coachingId` stays null
 *     here; they pick which coaching to act on via query/body, resolved in
 *     `withCoachingContext`.
 *   - Coaching admins — linked to exactly one coaching through the
 *     `CoachingAdmin` table (clerk_id → coaching_id).
 *
 * Students are NOT Clerk users; they use the cookie session handled in
 * middleware and `lib/studentAuth`. Do not route students through here.
 */
export type CoachingActor = {
  clerkId: string;
  isSuperAdmin: boolean;
  coachingId: string | null;
  role: "owner" | "admin" | null;
  adminId: string | null;
};

/**
 * Fast, read-only resolution of the current actor. One Clerk `auth()` call
 * plus (at most) two cheap indexed lookups, run in parallel. Returns null if
 * the user is signed out, or signed in but neither a super admin nor a linked
 * coaching admin (e.g. a brand-new owner who hasn't claimed yet — call
 * `claimCoachingIfPending` for that path).
 */
export async function getCoachingActor(): Promise<CoachingActor | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Email lives in our own User table for consumer accounts (super admins use
  // the consumer app). Looking it up here avoids a Clerk API round-trip on the
  // hot path. Coaching admins won't have a User row, so this returns null for
  // them and the super-admin branch is simply skipped.
  const [dbUser, admin] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
    prisma.coachingAdmin.findUnique({
      where: { clerk_id: userId },
      select: { id: true, coaching_id: true, role: true },
    }),
  ]);

  if (isAdmin(dbUser?.email)) {
    // If the super admin picked a coaching to manage, surface it as coachingId
    // so the normal coaching-admin pages scope to it automatically.
    const jar = await cookies();
    const impersonating = jar.get(SA_IMPERSONATE_COOKIE)?.value || null;
    return {
      clerkId: userId,
      isSuperAdmin: true,
      coachingId: impersonating,
      role: null,
      adminId: null,
    };
  }

  if (admin) {
    return {
      clerkId: userId,
      isSuperAdmin: false,
      coachingId: admin.coaching_id,
      role: admin.role === "owner" ? "owner" : "admin",
      adminId: admin.id,
    };
  }

  return null;
}

/**
 * Claim-on-first-login: if the signed-in user's email matches an unclaimed
 * `Coaching.owner_email`, create the owner `CoachingAdmin` row linking their
 * clerk_id. Idempotent — safe to call on every /coaching-admin entry.
 *
 * Returns the linked coachingId, or null if there was nothing to claim.
 * This is the only path that hits the Clerk API (to read the email of a user
 * who isn't a consumer `User`), and only runs until the link exists.
 */
export async function claimCoachingIfPending(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Already linked? Nothing to do.
  const existing = await prisma.coachingAdmin.findUnique({
    where: { clerk_id: userId },
    select: { coaching_id: true },
  });
  if (existing) return existing.coaching_id;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (!email) return null;

  // Find a coaching that named this email as owner, is approved, and has no owner
  // linked yet. Pending/rejected applications are deliberately unclaimable — the
  // owner can sign in but won't gain dashboard access until a super admin approves.
  const coaching = await prisma.coaching.findFirst({
    where: {
      owner_email: email,
      status: "approved",
      admins: { none: { role: "owner" } },
    },
    select: { id: true },
  });
  if (!coaching) return null;

  // Race-safe via the unique clerk_id constraint: if a parallel request already
  // created the row, swallow the conflict and re-read.
  try {
    await prisma.coachingAdmin.create({
      data: { coaching_id: coaching.id, clerk_id: userId, role: "owner" },
    });
  } catch {
    const row = await prisma.coachingAdmin.findUnique({
      where: { clerk_id: userId },
      select: { coaching_id: true },
    });
    return row?.coaching_id ?? null;
  }

  return coaching.id;
}

/**
 * Guard for coaching-admin server components / route handlers. Resolves the
 * actor, attempting a claim first for pending owners. Returns the actor or
 * null — callers decide whether to redirect (pages) or 401 (APIs).
 */
export async function resolveCoachingAdmin(): Promise<CoachingActor | null> {
  const actor = await getCoachingActor();
  if (actor) return actor;
  // Pending owner on first login: try to claim, then re-resolve.
  const claimed = await claimCoachingIfPending();
  if (claimed) return getCoachingActor();
  return null;
}
