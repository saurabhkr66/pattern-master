"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Hard-delete the signed-in user. Required by Google Play (account deletion
 * mandate, 2024).
 *
 * Order matters: Prisma first (cascade removes attempts/bookmarks/notes/etc.),
 * then Clerk (auth record). If Clerk fails after Prisma succeeds, the app data
 * is gone but the auth record lingers — they can retry, and on next sign-in
 * we'd just create a fresh User row.
 */
export async function deleteAccountAction(
  confirmation: string,
): Promise<DeleteAccountResult> {
  if (confirmation !== "DELETE") {
    return { ok: false, error: "Confirmation text does not match." };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Not signed in." };
  }

  // Prisma cascade removes all related rows (attempts, bookmarks, notes,
  // preferences, etc.) via onDelete: Cascade in the schema. If the user has
  // no Prisma row yet (e.g., signed up via Clerk but never used the app),
  // P2025 is thrown — that's fine, we still want to remove the Clerk record.
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code !== "P2025") {
      console.error("[deleteAccountAction] Prisma delete failed:", e);
      return { ok: false, error: "Failed to delete account data." };
    }
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (e) {
    console.error("[deleteAccountAction] Clerk delete failed:", e);
    return {
      ok: false,
      error:
        "Your app data was deleted but the auth record could not be removed. Please contact support.",
    };
  }

  return { ok: true };
}
