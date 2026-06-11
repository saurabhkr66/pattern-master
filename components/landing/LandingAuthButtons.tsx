"use client";

import { ArrowRight, Zap } from "lucide-react";
import SignUpButton from "@/components/auth/NativeAwareSignUpButton";

const primaryCls =
  "flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-95 active:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/30 select-none";

export function HeroCTAs() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <SignUpButton>
        <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.97] active:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-amber-500/30 select-none">
          <Zap size={15} className="fill-white" />
          Start free — no card needed
        </button>
      </SignUpButton>
      <a
        href="#topics"
        className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-medium border transition-all hover:border-indigo-500/40 hover:text-indigo-400 active:scale-95 select-none"
        style={{ color: "var(--text-secondary)", borderColor: "var(--border-strong)" }}
      >
        See topics <ArrowRight size={14} />
      </a>
    </div>
  );
}

export function TopicsSignUpButton() {
  return (
    <SignUpButton>
      <button className={primaryCls}>
        Practice all topics free <ArrowRight size={15} />
      </button>
    </SignUpButton>
  );
}

export function FinalCTAButton() {
  return (
    <SignUpButton>
      <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.97] active:bg-amber-700 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-all cursor-pointer shadow-xl shadow-amber-500/30 select-none">
        <Zap size={16} className="fill-white" />
        Start practicing free
        <ArrowRight size={16} />
      </button>
    </SignUpButton>
  );
}
