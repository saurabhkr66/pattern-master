
export const ADMIN_EMAILS = [
  "sauravkum4200@gmail.com",
  "sauravkum420@gmail.com",
];

export function isAdmin(email?: string | null) {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();

  // Check hardcoded list
  if (ADMIN_EMAILS.includes(lowerEmail)) return true;

  // Check env variable (only on server)
  if (typeof process !== 'undefined' && process.env.ADMIN_EMAILS) {
    const envEmails = process.env.ADMIN_EMAILS.toLowerCase().split(",").map(e => e.trim());
    if (envEmails.includes(lowerEmail)) return true;
  }

  return false;
}
