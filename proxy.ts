import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  "/",                    // Landing page (unauthenticated)
  "/sign-in(.*)",         // Clerk sign-in pages
  "/sign-up(.*)",         // Clerk sign-up pages
  "/sso-callback(.*)",    // OAuth callback (must be public for Clerk to complete handshake)
  "/api/cron/(.*)",       // Cron jobs (secured via CRON_SECRET)
  "/api/maintenance/(.*)",// One-off maintenance endpoints
  "/:examType/:subject/:topic/:questionId", // Public SEO question pages
  "/practice",            // Practice page — browsable without login; answer submission is gated client-side
  "/practice/(.*)",
  "/api/practice/topics", // Used by PatternTable to filter by subject; works for guests (solvedCounts default to 0)
  "/mock-tests(.*)",      // Public SEO mock test landing pages
]);

export default clerkMiddleware(async (auth, request) => {
  // Stamp the pathname so server layouts can read it without param drilling
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
