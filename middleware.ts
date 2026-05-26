import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk runs ONLY on paths that actually call `auth()` / `currentUser()`.
// SEO surface (`/[examType]/...`, `/mock-tests/...`, `/share/...`, etc.) is
// excluded so bot crawls don't pay Clerk's per-request JWT-verification cost.
//
// Auth-required URLs (verified by grepping for `auth()` / `currentUser`):
//   /                 — homepage redirects signed-in users to /dashboard
//   /account, /onboarding, /sso-callback
//   /dashboard, /practice, /test, /review, /mistakes, /bookmarks, /admin/*
//                     — all live under the (app) route group whose layout
//                       calls auth()
//   /api/*, /trpc/*   — most call auth(); safer to run middleware on all
export default clerkMiddleware();

export const config = {
  matcher: [
    "/",
    "/(account|onboarding|sso-callback|dashboard|practice|test|review|mistakes|bookmarks|admin)(/.*)?",
    // Public API routes (share-card, search) never call auth();
    // exclude them so Clerk's JWT verification doesn't run on each request.
    "/api/((?!share-card|search).*)",
    "/trpc/(.*)",
  ],
};
