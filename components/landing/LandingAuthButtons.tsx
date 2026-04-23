"use client";

import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Zap } from "lucide-react";

const primaryCls =
  "flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-95 active:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/30 select-none";

const ghostCls =
  "px-5 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-strong)] hover:border-amber-500/40 hover:text-amber-400 active:scale-95 transition-all cursor-pointer select-none";

export function HeroCTAs() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <SignUpButton mode="modal">
        <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.97] active:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/30 select-none">
          <Zap size={15} className="fill-white" />
          Start free — no card needed
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
        Practice all topics free <ArrowRight size={15} />
      </button>
    </SignUpButton>
  );
}

export function FinalCTAButton() {
  return (
    <SignUpButton mode="modal">
      <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.97] active:bg-amber-700 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-all cursor-pointer shadow-xl shadow-amber-500/30 select-none">
        <Zap size={16} className="fill-white" />
        Start practicing free
        <ArrowRight size={16} />
      </button>
    </SignUpButton>
  );
}
