import { createFrontendApiProxyHandlers } from "@clerk/nextjs/server";

/**
 * Clerk Frontend API Proxy
 *
 * Android WebView (Chromium 91+) silently blocks third-party SameSite=None
 * cookies. Clerk sets its critical `__client` cookie on clerk.battleexam.com,
 * but the WebView origin is www.battleexam.com — making it cross-site.
 * Without the cookie, every Clerk API call returns 403.
 *
 * This catch-all route proxies all Clerk Frontend API requests through our
 * own domain (www.battleexam.com/__clerk/*), turning them into first-party
 * requests. Clerk then sets cookies on our domain instead, which the WebView
 * accepts.
 *
 * Requires:
 *  1. NEXT_PUBLIC_CLERK_PROXY_URL env var set to https://www.battleexam.com/__clerk
 *  2. Clerk Dashboard → Domains → Proxy URL set to https://www.battleexam.com/__clerk
 */
const { GET, POST } = createFrontendApiProxyHandlers();

export { GET, POST };
