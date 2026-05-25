import { clerkMiddleware } from "@clerk/nextjs/server";

// Default Clerk middleware: enables `auth()` everywhere but does NOT
// auto-protect routes. Pages/route handlers that need auth must call
// `auth()` themselves and handle the unauthenticated case (the existing
// routes already do this — they check `if (!userId) return 401` or redirect).
//
// The public mock leaderboard and dashboard remain public because they
// don't call `auth()`.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals, static files, AND the Clerk Frontend API proxy.
    // The proxy is excluded so clerkMiddleware doesn't intercept upstream Clerk
    // traffic and return 400 — that route is handled by createFrontendApiProxyHandlers
    // and must reach the route handler unprocessed.
    "/((?!_next|clerk-proxy|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
