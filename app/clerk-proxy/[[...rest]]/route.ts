import { clerkFrontendApiProxy } from "@clerk/backend/proxy";

/**
 * Clerk Frontend API Proxy
 *
 * Android WebView (Chromium 91+) silently blocks third-party SameSite=None
 * cookies. Clerk sets its critical `__client` cookie on clerk.battleexam.com,
 * but the WebView origin is www.battleexam.com — making it cross-site.
 * Without the cookie, every Clerk API call returns 403.
 *
 * This catch-all route proxies all Clerk Frontend API requests through our
 * own domain, turning them into first-party requests. Clerk then sets cookies
 * on our domain instead, which the WebView accepts.
 *
 * Path note: must NOT start with `_` — Next.js excludes any folder prefixed
 * with `_` from routing entirely. `app/_clerk/...` or `app/__clerk/...` would
 * never match and traffic would fall through to dynamic page routes.
 *
 * Host override: Clerk Dashboard hardcodes the proxy URL prefix to the
 * primary domain (battleexam.com apex). The proxy SDK derives the request
 * origin from x-forwarded-host and includes it in the `Clerk-Proxy-Url`
 * header upstream — Clerk's FAPI rejects the request with host_invalid if
 * it doesn't match what's saved in the dashboard. Since the WebView loads
 * from www.battleexam.com, Vercel's x-forwarded-host is the www variant
 * and the upstream mismatch breaks every call. We rewrite x-forwarded-host
 * to apex before handing the request to the SDK so the saved-vs-sent proxy
 * URLs match.
 *
 * Requires:
 *  1. NEXT_PUBLIC_CLERK_PROXY_URL env var (e.g. https://www.battleexam.com/clerk-proxy)
 *     — informs the client-side ClerkProvider, can use either www or apex.
 *  2. Clerk Dashboard → Domains → Proxy URL: https://battleexam.com/clerk-proxy
 *     — what we send in upstream `Clerk-Proxy-Url` header must match this.
 */
const PROXY_PATH = "/clerk-proxy";
const UPSTREAM_HOST = "battleexam.com";

async function handle(request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", UPSTREAM_HOST);
  headers.set("x-forwarded-proto", "https");

  const rewritten = new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-expect-error duplex is required by Node fetch for streamed bodies
    duplex: "half",
    signal: request.signal,
  });

  return clerkFrontendApiProxy(rewritten, {
    proxyPath: PROXY_PATH,
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function PUT(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}

export async function PATCH(request: Request) {
  return handle(request);
}
