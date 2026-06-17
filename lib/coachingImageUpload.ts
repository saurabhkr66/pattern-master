import "server-only";
import ImageKit, { toFile } from "@imagekit/nodejs";

// Shared ImageKit upload for coaching question figures. Used by the import
// pipeline's auto-crop (lib/coachingImport) AND the review step's manual
// paste-a-screenshot replace route — both land figures in the same per-coaching
// folder so they're cleaned up together and served from the same CDN path.
const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

/**
 * Upload an image buffer to ImageKit under the coaching's folder; returns its
 * URL, or null on failure (callers treat a missing figure as best-effort).
 */
export async function uploadCoachingImage(
  buf: Buffer,
  coachingId: string,
  ext = "png"
): Promise<string | null> {
  try {
    const fileName = `q-${globalThis.crypto.randomUUID()}.${ext}`;
    const file = await toFile(buf, fileName);
    const result = await ik.files.upload({
      file,
      fileName,
      folder: `/pattern-master/coaching/${coachingId}`,
      useUniqueFileName: true,
    });
    return result.url ?? null;
  } catch {
    return null;
  }
}
