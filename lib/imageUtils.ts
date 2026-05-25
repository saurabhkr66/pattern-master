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
  cleanPath = sanitizeIkPath(cleanPath);

  if (!endpoint) return `/${cleanPath}`;

  // All uploads (flat and foldered) live under pattern-master/ in ImageKit.
  const ikPath = `pattern-master/${cleanPath}`;

  return `${endpoint}/${ikPath}?tr=${IMAGEKIT_TRANSFORMS}`;
}
