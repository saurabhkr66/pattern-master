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
 * own domain (www.battleexam.com/clerk-proxy/*), turning them into first-party
 * requests. Clerk then sets cookies on our domain instead, which the WebView
 * accepts.
 *
 * Path note: must NOT start with `_` — Next.js excludes any folder prefixed
 * with `_` from routing entirely. `app/_clerk/...` or `app/__clerk/...` would
 * never match and traffic would fall through to dynamic page routes.
 *
 * Requires:
 *  1. NEXT_PUBLIC_CLERK_PROXY_URL env var set to https://www.battleexam.com/clerk-proxy
 *  2. Clerk Dashboard → Domains → Proxy URL set to https://www.battleexam.com/clerk-proxy
 */
// Must pass proxyPath explicitly — Clerk's default is "/__clerk", and any
// folder starting with "_" is excluded from Next.js routing, so the SDK's
// default is unusable in app router. We route from /clerk-proxy.
const { GET, POST } = createFrontendApiProxyHandlers({
  proxyPath: "/clerk-proxy",
});

export { GET, POST };
