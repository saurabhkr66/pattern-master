"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <h2 className="text-2xl font-black mb-4" style={{ color: "var(--text-primary)" }}>Something went wrong</h2>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl font-bold text-sm bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
