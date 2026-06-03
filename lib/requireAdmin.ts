import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;

/**
 * currentUser() hits the Clerk Backend API over the network (unlike auth(),
 * which only reads the JWT cookie). Under load — e.g. right after an AI-review
 * batch finishes — that call intermittently returns a messageless
 * ClerkAPIResponseError, which otherwise crashes the Server Component render.
 * Retry the transient failure with a short backoff before giving up.
 */
async function currentUserWithRetry(retries = 2): Promise<ClerkUser> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await currentUser();
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

/**
 * Guards an admin Server Component. Redirects to /sign-in when unauthenticated
 * and to / when the signed-in user is not an admin. Returns the admin email.
 */
export async function requireAdmin(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  // Fast path: email embedded in the session token. To enable, add a custom
  // claim in Clerk Dashboard → Sessions: {"email": "{{user.primary_email_address}}"}.
  // This avoids the Clerk Backend API round-trip on every admin page load.
  let email = (sessionClaims as { email?: string } | null)?.email?.toLowerCase();

  if (!email) {
    try {
      const user = await currentUserWithRetry();
      email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    } catch {
      // Clerk Backend API still unavailable after retries — degrade to
      // sign-in rather than throwing a 500 from the render.
      redirect("/sign-in");
    }
  }

  if (!isAdmin(email)) redirect("/");
  return email!;
}
