import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require auth
const isPublicRoute = createRouteMatcher([
  "/",                    // Landing page (unauthenticated)
  "/sign-in(.*)",         // Clerk sign-in pages
  "/sign-up(.*)",         // Clerk sign-up pages
  "/api/cron/(.*)",       // Cron jobs (secured via CRON_SECRET)
]);
// /practice, /dashboard, /onboarding, etc. are protected by default

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
