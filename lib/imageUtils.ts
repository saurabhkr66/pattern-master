/**
 * Converts a database image path or URL into a Cloudinary URL.
 * It uses the NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable.
 * This file is safe to use in Client Components.
 */
export function getCloudinaryUrl(dbPath: string | null | undefined): string {
  if (!dbPath) return "";
  
  // If it's already a full URL or a base64 string, return it
  if (dbPath.startsWith("http://") || dbPath.startsWith("https://") || dbPath.startsWith("data:")) {
    // If it's already a cloudinary URL, just return it
    if (dbPath.includes("res.cloudinary.com")) return dbPath;
    
    // Otherwise, if it's some other external URL, we can either proxy it or return as is.
    // For now, return as is.
    return dbPath;
  }

  // Remove leading slashes
  let cleanPath = dbPath.replace(/^\/+/, "");
  
  // Cloudinary sanitization: handle '&' characters which were replaced with 'and' during upload
  cleanPath = cleanPath.replace(/&/g, 'and');
  
  // Clean up old hardcoded placeholder prefixes if they exist in the DB
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    // Fallback to local path if Cloudinary is not configured
    return `/${cleanPath}`;
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/pattern-master/${cleanPath}`;
}
