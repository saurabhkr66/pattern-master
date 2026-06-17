// Pure, browser-safe URL helpers. Uploads land in ImageKit (see
// lib/coachingImageUpload.ts) and legacy assets live in Cloudinary; this module
// only builds delivery URLs, so it intentionally has no SDK import — pulling the
// Cloudinary Node SDK in here would break client bundles (it requires `fs`).

const IMAGEKIT_TRANSFORMS = "f-auto,q-auto";

function sanitizeIkPath(p: string): string {
  return p.split("/").map((seg) => seg.replace(/ /g, "_").replace(/%20/g, "_")).join("/");
}

function cloudinaryToImagekitPath(cloudinaryUrl: string): string | null {
  const match = cloudinaryUrl.match(/\/image\/upload\/(.+)$/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]);
  const segments = decoded.split("/");
  let i = 0;
  while (i < segments.length - 1 && (/^v\d+$/.test(segments[i]) || segments[i].includes(","))) {
    i++;
  }
  return sanitizeIkPath(segments.slice(i).join("/"));
}

/**
 * Server-side helper. Returns an ImageKit delivery URL for the given path.
 * Mirrors lib/imageUtils.ts but lives next to the Cloudinary SDK config used
 * by upload routes (uploads still land in Cloudinary; delivery goes via the
 * ImageKit Web Folder origin pointed at Cloudinary).
 */
export function getCloudinaryUrl(dbPath: string | null | undefined): string {
  if (!dbPath) return "";

  if (dbPath.startsWith("data:")) return dbPath;

  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (dbPath.startsWith("http://") || dbPath.startsWith("https://")) {
    if (endpoint && dbPath.includes("res.cloudinary.com")) {
      const path = cloudinaryToImagekitPath(dbPath);
      if (path) return `${endpoint}/${path}?tr=${IMAGEKIT_TRANSFORMS}`;
    }
    return dbPath;
  }

  let cleanPath = dbPath.replace(/^\/+/, "");
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }
  cleanPath = sanitizeIkPath(cleanPath);

  if (!endpoint) return `/${cleanPath}`;

  const ikPath = `pattern-master/${cleanPath}`;

  return `${endpoint}/${ikPath}?tr=${IMAGEKIT_TRANSFORMS}`;
}
