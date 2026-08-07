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

// Relative DB path -> the path segment under pattern-master/, with every
// rename the migration applied. Shared by delivery (getImageUrl) and upload
// (getImageKitPath) so the two can never disagree about where a file lives.
function normalizeRelPath(dbPath: string): string {
  let cleanPath = dbPath.replace(/^\/+/, "");
  cleanPath = cleanPath.replace(/&/g, "and");
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }
  return sanitizeIkPath(cleanPath);
}

/**
 * Media-library path for a DB ref — no leading slash, no query — or null when
 * the ref isn't ours to address (data: URI, third-party host).
 *
 * This is what the ImageKit *upload* API addresses (as folder + fileName), so
 * it must stay byte-identical to what {@link getImageUrl} resolves for
 * delivery. If the two sanitized differently, an "overwrite" would quietly
 * create a second file while the original kept serving.
 */
export function getImageKitPath(dbPath: string | null | undefined): string | null {
  if (!dbPath) return null;
  if (dbPath.startsWith("data:")) return null;

  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (dbPath.startsWith("http://") || dbPath.startsWith("https://")) {
    if (endpoint && dbPath.startsWith(endpoint)) {
      const rest = dbPath.slice(endpoint.length).split("?")[0].replace(/^\/+/, "");
      return rest ? decodeURIComponent(rest) : null;
    }
    // Legacy Cloudinary URLs already carry the pattern-master/ prefix in their
    // path, so this one is NOT prefixed again.
    if (dbPath.includes("res.cloudinary.com")) return cloudinaryToImagekitPath(dbPath);
    return null;
  }

  return `pattern-master/${normalizeRelPath(dbPath)}`;
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

  const cleanPath = normalizeRelPath(dbPath);

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
