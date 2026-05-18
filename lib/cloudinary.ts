import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

const IMAGEKIT_TRANSFORMS = "f-auto,q-auto";

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

  if (!endpoint) return `/${cleanPath}`;

  return `${endpoint}/pattern-master/${cleanPath}?tr=${IMAGEKIT_TRANSFORMS}`;
}
