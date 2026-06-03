import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

// Student paths that require a valid student_session cookie.
// Public student paths (/c/[slug], /c/[slug]/join, /c/[slug]/login) are intentionally excluded.
const STUDENT_PROTECTED = /^\/c\/[^/]+\/(dashboard|test|result)(\/.*)?$/;

// Student API routes that need student_session validation (not Clerk)
const STUDENT_API = /^\/api\/student\//;

// Public student auth endpoints — no session yet, so they must NOT be gated.
const STUDENT_API_PUBLIC = /^\/api\/student\/(join|login)$/;

// Students are NOT Clerk users — they carry a signed `student_session` cookie.
// Middleware only checks its PRESENCE; validity is verified server-side in Node
// route handlers / server components (lib/studentAuth). This path deliberately
// never invokes Clerk.
function handleStudentRoute(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Student-facing pages.
  if (pathname.startsWith("/c/")) {
    if (STUDENT_PROTECTED.test(pathname) && !req.cookies.get("student_session")?.value) {
      const slug = pathname.split("/")[2];
      return NextResponse.redirect(new URL(`/c/${slug}/login`, req.url));
    }
    return NextResponse.next();
  }

  // Student API. join/login are public (no session exists yet) and are exempted.
  if (!STUDENT_API_PUBLIC.test(pathname) && !req.cookies.get("student_session")?.value) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

// Consumer + coaching-admin routes run under Clerk; their route handlers call
// auth() / auth().protect() as needed (no global gating here).
const clerk = clerkMiddleware();

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Student paths are cookie-authed, not Clerk. Skip the Clerk wrapper entirely
  // so the highest-frequency calls — autosave (every 2 min) and tab-switch (every
  // visibilitychange), multiplied across a whole batch mid-exam — don't pay
  // Clerk's edge overhead for an auth scheme they don't use.
  if (pathname.startsWith("/c/") || STUDENT_API.test(pathname)) {
    return handleStudentRoute(req);
  }

  return clerk(req, event);
}

export const config = {
  matcher: [
    "/",
    // Existing consumer routes + coaching-admin added
    "/(account|onboarding|sso-callback|dashboard|practice|test|review|mistakes|bookmarks|admin|coaching-admin)(/.*)?",
    // Student-facing pages (public profile, join, login, dashboard, test, result)
    "/c/(.*)",
    // API routes — exclude static share-card and search; include student API
    "/api/((?!share-card|search).*)",
    "/trpc/(.*)",
  ],
};
