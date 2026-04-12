"use client";

import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

const primaryCls =
  "flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 active:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-indigo-500/25 select-none";

const ghostCls =
  "px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-strong)] hover:border-indigo-500/40 hover:text-indigo-400 active:scale-95 transition-all cursor-pointer select-none";

export function HeroCTAs() {
  return (
    <div className="flex items-center gap-3">
      <SignUpButton mode="modal">
        <button className={primaryCls}>
          Start for free <ArrowRight size={15} />
        </button>
      </SignUpButton>
      <SignInButton mode="modal">
        <button className={ghostCls} style={{ color: "var(--text-secondary)" }}>
          Sign in
        </button>
      </SignInButton>
    </div>
  );
}

export function TopicsSignUpButton() {
  return (
    <SignUpButton mode="modal">
      <button className={primaryCls}>
        Start practicing free <ArrowRight size={15} />
      </button>
    </SignUpButton>
  );
}

export function FinalCTAButton() {
  return (
    <SignUpButton mode="modal">
      <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 active:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-base transition-all cursor-pointer shadow-xl shadow-indigo-500/25 select-none">
        Start free — no credit card <ArrowRight size={16} />
      </button>
    </SignUpButton>
  );
}
