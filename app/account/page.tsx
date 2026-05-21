import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import DeleteAccountSection from "./DeleteAccountSection";

// /account is intentionally NOT inside the (app) group so it skips the
// onboarding-modal layout. It's also the URL we'll list on the Play Store as
// the account-deletion web URL — so it must be reachable without going
// through the in-app preference setup.

export default async function AccountPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <h1 className="mb-4 text-2xl font-bold text-white">Manage your account</h1>
        <p className="mb-6 text-neutral-300">
          Sign in to manage or delete your BattleExam account.
        </p>
        <Link
          href="/sign-in?redirect_url=/account"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "(unknown)";
  const name = user?.firstName ?? user?.username ?? "";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold text-white">Your Account</h1>

      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm text-neutral-400">Email</p>
        <p className="mb-4 font-medium text-white">{email}</p>
        {name && (
          <>
            <p className="text-sm text-neutral-400">Name</p>
            <p className="font-medium text-white">{name}</p>
          </>
        )}
      </div>

      <div className="rounded-lg border border-red-900 bg-red-950/20 p-6">
        <h2 className="mb-2 text-xl font-semibold text-red-400">Danger Zone</h2>
        <p className="mb-4 text-sm text-neutral-300">
          Deleting your account is permanent. All your test attempts, bookmarks,
          notes, and preferences will be removed. This cannot be undone.
        </p>
        <DeleteAccountSection />
      </div>
    </div>
  );
}
