"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "./actions";

export default function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clerk = useClerk();
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteAccountAction(confirmText);
      if (!result.ok) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }
      // Clear the client-side Clerk session so the next request is unauth'd.
      try {
        await clerk.signOut();
      } catch {
        // Session is already invalid server-side; ignore.
      }
      // Full reload so middleware sees the cleared cookie.
      window.location.replace("/account-deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed.");
      setIsDeleting(false);
    }
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
      >
        Delete My Account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-300">
        To confirm, type <strong className="text-white">DELETE</strong> in the box below.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoFocus
        disabled={isDeleting}
        placeholder="DELETE"
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={confirmText !== "DELETE" || isDeleting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Permanently delete account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowConfirm(false);
            setConfirmText("");
            setError(null);
          }}
          disabled={isDeleting}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
