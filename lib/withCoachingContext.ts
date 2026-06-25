import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCoachingAdmin, type CoachingActor } from "@/lib/coachingAuth";

/**
 * Tenant context handed to every coaching-admin route handler. `coachingId` is
 * always present and authoritative — handlers MUST filter every query by it.
 * This is the app-layer substitute for RLS (the Neon HTTP adapter is stateless,
 * so SET LOCAL / Postgres RLS can't persist across queries — see lib/prisma).
 */
export type CoachingContext = {
  coachingId: string;
  actor: CoachingActor;
};

// Next 16 route handlers receive async params as the second arg.
type RouteContext = { params: Promise<Record<string, string>> };

type CoachingHandler = (
  req: NextRequest,
  ctx: CoachingContext,
  route: RouteContext
) => Promise<Response> | Response;

/**
 * Wraps a coaching-admin API route handler, resolving and enforcing the tenant
 * boundary before the handler runs:
 *
 *   - Coaching admins: `coachingId` is taken from their CoachingAdmin link.
 *     They cannot act on any other coaching, regardless of what they pass.
 *   - Super admins (ADMIN_EMAILS): may impersonate any coaching by passing
 *     `?coachingId=` (query) or an `x-coaching-id` header. We deliberately do
 *     NOT read it from the JSON body — that would consume the request stream
 *     the handler still needs. The target is validated to exist.
 *
 * Returns 401 for non-admins, 400 when a super admin omits the target.
 *
 * Usage:
 *   export const POST = withCoachingContext(async (req, { coachingId }) => {
 *     const students = await prisma.student.findMany({ where: { coaching_id: coachingId } });
 *     ...
 *   });
 *
 * Pass `{ ownerOnly: true }` to restrict the route to the coaching owner (and
 * super admins). Used for team management — inviting/removing teachers is the
 * owner's privilege; teachers run everything else.
 */
export function withCoachingContext(
  handler: CoachingHandler,
  opts: { ownerOnly?: boolean } = {}
) {
  return async (req: NextRequest, route: RouteContext): Promise<Response> => {
    const actor = await resolveCoachingAdmin();
    if (!actor) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (opts.ownerOnly && !actor.isSuperAdmin && actor.role !== "owner") {
      return NextResponse.json({ error: "owner only" }, { status: 403 });
    }

    let coachingId: string | null;

    if (actor.isSuperAdmin) {
      // Priority: explicit query/header override, then the impersonation cookie
      // (surfaced as actor.coachingId by getCoachingActor).
      const target =
        req.nextUrl.searchParams.get("coachingId") ??
        req.headers.get("x-coaching-id") ??
        actor.coachingId;

      if (!target) {
        return NextResponse.json(
          { error: "super admin must select a coaching (impersonate) or pass ?coachingId=" },
          { status: 400 }
        );
      }

      // Validate the impersonated coaching exists — a bad id would otherwise
      // silently scope every query to a tenant that returns nothing.
      const exists = await prisma.coaching.findUnique({
        where: { id: target },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json({ error: "coaching not found" }, { status: 404 });
      }
      coachingId = target;
    } else {
      coachingId = actor.coachingId;
    }

    if (!coachingId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return handler(req, { coachingId, actor }, route);
  };
}
