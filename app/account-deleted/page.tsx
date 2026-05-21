import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold text-white">Account deleted</h1>
      <p className="text-neutral-300">
        Your BattleExam account and all associated data have been permanently
        removed. We&apos;re sorry to see you go.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500"
      >
        Return to homepage
      </Link>
    </div>
  );
}
