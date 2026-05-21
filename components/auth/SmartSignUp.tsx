"use client";

import { useEffect, useState } from "react";
import { SignUp } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import MobileGoogleSignIn from "./MobileGoogleSignIn";

export default function SmartSignUp() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  if (isNative) {
    // Native: external-browser Google OAuth only. Clerk auto-creates the user
    // on first sign-in via Google, so the same button covers sign-up.
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-white">Create your BattleExam account</h1>
        <MobileGoogleSignIn />
      </div>
    );
  }

  return <SignUp />;
}
