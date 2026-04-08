"use client";

import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { ChevronRight, Brain } from "lucide-react";

export function HeroCTAs() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <SignUpButton mode="modal">
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
          Start Practicing Free <ChevronRight size={18} />
        </button>
      </SignUpButton>
      <SignInButton mode="modal">
        <button className="border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium px-8 py-4 rounded-2xl text-base transition-all">
          Sign In
        </button>
      </SignInButton>
    </div>
  );
}

export function TopicsSignUpButton() {
  return (
    <SignUpButton mode="modal">
      <button className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-2xl text-sm hover:bg-white/90 transition-all">
        <Brain size={16} /> Start Practicing Free
      </button>
    </SignUpButton>
  );
}

export function FinalCTAButton() {
  return (
    <SignUpButton mode="modal">
      <button className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5">
        Start Free — No Credit Card <ChevronRight size={20} />
      </button>
    </SignUpButton>
  );
}
