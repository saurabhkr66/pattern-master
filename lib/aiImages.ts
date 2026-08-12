import { getImageUrl } from "@/lib/imageUtils";

/**
 * Helper to fetch a question image and return base64 inline data for an AI model.
 *
 * Resolution order:
 *   1. If the input is already a full http(s) URL (ImageKit, Cloudinary, etc.),
 *      fetch it directly — skip the local filesystem (path.join would mangle
 *      the URL into a bogus disk path).
 *   2. Otherwise treat it as a DB path: try local /public first (dev/seeded
 *      assets), then resolve via getImageUrl (which now returns ImageKit
 *      delivery URLs since the Cloudinary → ImageKit migration).
 *
 * Failures are logged with the resolved URL so missing/broken images are
 * obvious in the console — silent failures previously made it look like the
 * model was ignoring images when in reality the fetch had 404'd.
 *
 * Lives outside app/actions/admin.ts (a "use server" file) so standalone
 * scripts can import it without pulling in Clerk/next-cache/Redis.
 */
export async function getImageBase64(filename: string) {
  const isHttpUrl = /^https?:\/\//i.test(filename);

  // Step 1: local filesystem (skipped for URLs)
  if (!isHttpUrl) {
    const fs = await import("fs");
    const path = await import("path");
    const possiblePaths = [
      path.join(process.cwd(), "public", "images", "questions", filename),
      path.join(process.cwd(), "public", filename.startsWith("/") ? filename.slice(1) : filename),
    ];
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath);
          const ext = path.extname(filePath).slice(1).toLowerCase();
          const mimeType = ext === "png" ? "image/png" : (ext === "jpg" || ext === "jpeg") ? "image/jpeg" : "image/webp";
          console.log(`[AI] Image loaded from local: ${filePath}`);
          return { data: data.toString("base64"), mimeType };
        }
      } catch { }
    }
  }

  // Step 2: resolve to a delivery URL. Full URLs pass through unchanged.
  const url = isHttpUrl ? filename : getImageUrl(filename);
  if (!url || !/^https?:\/\//i.test(url)) {
    console.warn(`[AI] No URL resolved for image input: "${filename}" — model will not see this image.`);
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[AI] Image fetch failed: ${response.status} ${response.statusText} — ${url}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[AI] Image loaded from URL (${buffer.length} bytes): ${url}`);
    return { data: buffer.toString("base64"), mimeType: response.headers.get("content-type") || "image/jpeg" };
  } catch (err) {
    console.error(`[AI] Image fetch threw for ${url}:`, err);
    return null;
  }
}
