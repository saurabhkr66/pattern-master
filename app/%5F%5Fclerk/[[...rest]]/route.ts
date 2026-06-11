import { createFrontendApiProxyHandlers } from "@clerk/nextjs/server";

/**
 * Clerk Frontend API proxy — serves Clerk's API from our own origin
 * (www.battleexam.com/__clerk/*) so its cookies are FIRST-party.
 *
 * Why: the Android WebView drops Set-Cookie for clerk.battleexam.com even
 * with setAcceptThirdPartyCookies(true), so Clerk saw a brand-new anonymous
 * client on every request — sign-in completed but the very next call was
 * "signed out" (verified via the FAPI client-persistence probe in
 * /sso-callback). First-party cookies on www.battleexam.com provably work in
 * the WebView, so proxying fixes native sign-in for good; web browsers are
 * unaffected (first-party is strictly more compatible).
 *
 * The official handler forwards Clerk-Proxy-Url + Clerk-Secret-Key so FAPI
 * scopes its cookies to this domain. Unlike the May 2026 attempt, this is NOT
 * a bare rewrite — those headers are what make Clerk proxy-aware.
 *
 * Activation requires BOTH:
 *  1. NEXT_PUBLIC_CLERK_PROXY_URL=https://www.battleexam.com/__clerk in the
 *     server env (picked up by ClerkProvider and clerkMiddleware at build).
 *  2. Clerk Dashboard → Domains → battleexam.com → Frontend API → Proxy URL
 *     set to https://www.battleexam.com/__clerk.
 * Until both are set, this route is inert.
 *
 * Must stay OUT of the middleware matcher — Clerk traffic must not recurse
 * through clerkMiddleware.
 *
 * Folder is named %5F%5Fclerk because app-router folders starting with a
 * literal underscore are "private" (excluded from routing); %5F is the
 * documented escape that decodes to "_", yielding the /__clerk URL.
 */
export const { GET, POST, PUT, DELETE, PATCH } = createFrontendApiProxyHandlers();
