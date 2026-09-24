import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// currentUser() is a Clerk Backend API round-trip (auth() only reads the JWT),
// and pages that call it on every render pay that latency — and share Clerk's
// rate limit — just to print a first name. A display name almost never changes,
// so cache it per user for a day. The `user-${userId}` tag is the same one the
// (app) layout's user cache uses, so busting it refreshes both.
const getCachedFirstName = (userId: string) =>
  unstable_cache(
    async () => {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      return user.firstName || user.username || null;
    },
    ["clerk-first-name", userId],
    { revalidate: 86400, tags: [`user-${userId}`] }
  )();

/**
 * The user's first name for greetings. Never throws: a Clerk outage degrades
 * to null (the caller shows a generic greeting) instead of failing the page.
 * Failures aren't cached, so the next render retries.
 */
export async function getFirstName(userId: string): Promise<string | null> {
  try {
    return await getCachedFirstName(userId);
  } catch (err) {
    console.warn("[clerkProfile] first-name lookup failed", err);
    return null;
  }
}
