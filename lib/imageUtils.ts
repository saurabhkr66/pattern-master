const IMAGEKIT_TRANSFORMS = "f-auto,q-auto";

// Strip Cloudinary's leading version (v\d+) and transform segments so the
// remaining path can be appended to the ImageKit endpoint, which proxies the
// configured Cloudinary base URL.
// ImageKit folders cannot contain spaces. The migration script uploaded
// space-containing Cloudinary folders (e.g. "Current Electricity") with
// spaces replaced by underscores. Mirror that mapping here so legacy DB
// paths/URLs resolve to the migrated assets.
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
 * Resolves a DB image path (or a legacy Cloudinary URL) into an ImageKit
 * delivery URL.
 *
 * ImageKit is the active image CDN. The Cloudinary handling here is only a
 * fall-through for old DB rows that still store full Cloudinary URLs — those
 * get rewritten to point at ImageKit's Web Folder origin, which proxies the
 * Cloudinary bucket so the same filenames keep working without re-uploading.
 *
 * Safe to use in Client Components.
 */
export function getImageUrl(dbPath: string | null | undefined): string {
  if (!dbPath) return "";

  if (dbPath.startsWith("data:")) return dbPath;

  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (dbPath.startsWith("http://") || dbPath.startsWith("https://")) {
    // Legacy: rewrite Cloudinary URLs to ImageKit. New URLs (e.g. already
    // ik.imagekit.io) pass straight through.
    if (endpoint && dbPath.includes("res.cloudinary.com")) {
      const path = cloudinaryToImagekitPath(dbPath);
      if (path) return `${endpoint}/${path}?tr=${IMAGEKIT_TRANSFORMS}`;
    }
    return dbPath;
  }

  let cleanPath = dbPath.replace(/^\/+/, "");
  cleanPath = cleanPath.replace(/&/g, "and");
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }
  cleanPath = sanitizeIkPath(cleanPath);

  if (!endpoint) return `/${cleanPath}`;

  // All uploads (flat and foldered) live under pattern-master/ in ImageKit.
  const ikPath = `pattern-master/${cleanPath}`;

  return `${endpoint}/${ikPath}?tr=${IMAGEKIT_TRANSFORMS}`;
}

/**
 * @deprecated Misleading name — this function returns ImageKit URLs, not
 * Cloudinary. Use {@link getImageUrl} instead. Kept as an alias so existing
 * callers continue to work during the migration.
 */
export const getCloudinaryUrl = getImageUrl;
