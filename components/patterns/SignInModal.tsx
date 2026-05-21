"use client";

import { useRouter } from "next/navigation";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm rounded-2xl p-8 shadow-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-xs"
          style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h2 className="text-xl font-black text-center mb-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.4px" }}>
          Sign in to check your answer
        </h2>
        <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Create a free account to submit answers, track your progress, and build a streak.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/sign-up")}
            className="w-full py-3 rounded-xl font-black text-sm text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            Sign up free — takes 30 seconds
          </button>
          <button
            onClick={() => router.push("/sign-in")}
            className="w-full py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Already have an account? Sign in
          </button>
        </div>

        <p className="text-center text-[10px] mt-4" style={{ color: "var(--text-muted)" }}>
          Free forever · No credit card
        </p>
      </div>
    </div>
  );
}
