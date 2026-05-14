import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

const CLOUDINARY_TRANSFORMS = "f_auto,q_auto";

function injectTransforms(url: string): string {
  if (url.includes(CLOUDINARY_TRANSFORMS)) return url;
  return url.replace("/image/upload/", `/image/upload/${CLOUDINARY_TRANSFORMS}/`);
}

/**
 * Converts a database image path or URL into a Cloudinary URL.
 * It uses the NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable.
 */
export function getCloudinaryUrl(dbPath: string | null | undefined): string {
  if (!dbPath) return "";

  if (dbPath.startsWith("data:")) return dbPath;

  if (dbPath.startsWith("http://") || dbPath.startsWith("https://")) {
    if (dbPath.includes("res.cloudinary.com")) return injectTransforms(dbPath);
    return dbPath;
  }

  let cleanPath = dbPath.replace(/^\/+/, "");
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return `/${cleanPath}`;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${CLOUDINARY_TRANSFORMS}/pattern-master/${cleanPath}`;
}
