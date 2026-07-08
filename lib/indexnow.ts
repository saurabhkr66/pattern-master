// lib/indexnow.ts
// IndexNow (indexnow.org) lets us push freshly created/updated URLs straight to
// Bing (and Yandex, Naver, Seznam) instead of waiting for a crawl. This is the
// GEO fast-path: ChatGPT Search and Perplexity both lean on the Bing index, so
// getting new PYQ/topic pages into Bing quickly is what makes them citable soon
// after publish. (Google does NOT consume IndexNow — Google discovery still
// relies on the sitemap + Googlebot, which also feeds Gemini's grounding.)
//
// Key is verified via /public/<KEY>.txt served at https://battleexam.com/<KEY>.txt

const INDEXNOW_KEY = "6c8ea8b8242abd3e3f36f145dc702e41";
const HOST = "battleexam.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notify IndexNow of created/updated URLs. Accepts absolute URLs or root-
 * relative paths ("/gate-cse/pyq"). Fire-and-forget: never throws, so callers
 * can `void pingIndexNow(...)` from a Server Action without risking the request.
 * IndexNow allows up to 10,000 URLs per call.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const urlList = Array.from(
    new Set(
      urls
        .filter(Boolean)
        .map((u) => (u.startsWith("http") ? u : `https://${HOST}${u.startsWith("/") ? "" : "/"}${u}`))
    )
  );
  if (urlList.length === 0) return;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    // 200 = accepted, 202 = accepted (pending). Anything else: log, don't throw.
    if (!res.ok && res.status !== 202) {
      console.warn(`[indexnow] ${res.status} ${res.statusText} for ${urlList.length} url(s)`);
    }
  } catch (err) {
    console.warn("[indexnow] ping failed:", err);
  }
}
