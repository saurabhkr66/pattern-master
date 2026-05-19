const IMAGEKIT_TRANSFORMS = "f-auto,q-auto";

// Percent-encode characters that are unsafe in URL path segments:
// spaces and any non-ASCII chars (e.g. ω → %CF%89, µ → %C2%B5, space → %20).
// ASCII chars that are safe in paths (- _ . ~) are left as-is.
// Slashes are kept as segment separators and never encoded.
function encodePathSegments(path: string): string {
  return path
    .split("/")
    .map((seg) => seg.replace(/[ \x80-￿]/g, (c) => encodeURIComponent(c)))
    .join("/");
}

// Strip Cloudinary's leading version (v\d+) and transform segments so the
// remaining path can be appended to the ImageKit endpoint, which proxies the
// configured Cloudinary base URL.
function cloudinaryToImagekitPath(cloudinaryUrl: string): string | null {
  const match = cloudinaryUrl.match(/\/image\/upload\/(.+)$/);
  if (!match) return null;
  const segments = match[1].split("/");
  let i = 0;
  while (i < segments.length - 1 && (/^v\d+$/.test(segments[i]) || segments[i].includes(","))) {
    i++;
  }
  return segments.slice(i).join("/");
}

/**
 * Resolves a DB image path or legacy Cloudinary URL into an ImageKit delivery URL.
 * ImageKit proxies our Cloudinary bucket via the Web Folder origin, so the same
 * filenames continue to work without re-uploading. Transformations are applied
 * server-side by ImageKit (free, unlimited on free tier).
 *
 * This file is safe to use in Client Components.
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
  cleanPath = cleanPath.replace(/&/g, "and");
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }

  if (!endpoint) return `/${cleanPath}`;

  // Old images (flat filename, no subfolder) live under pattern-master/ in Cloudinary.
  // New images scraped with a topic subfolder (e.g. "Electrostatics/img.webp") were
  // uploaded directly to Cloudinary without the pattern-master/ prefix.
  const ikPath = cleanPath.includes("/")
    ? cleanPath
    : `pattern-master/${cleanPath}`;

  return `${endpoint}/${encodePathSegments(ikPath)}?tr=${IMAGEKIT_TRANSFORMS}`;
}
