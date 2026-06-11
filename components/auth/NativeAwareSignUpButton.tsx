"use client";

import { cloneElement, isValidElement, useEffect, useState } from "react";
import { SignUpButton } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { launchNativeSignIn } from "@/lib/nativeAuth";

/**
 * Drop-in replacement for <SignUpButton mode="modal"> that works in the
 * native app. On web it renders the normal Clerk sign-up modal; on native it
 * reuses the child button but routes the tap to the system-browser Google
 * flow instead — Clerk's modal is a dead end inside the WebView.
 */
export default function NativeAwareSignUpButton({
  children,
}: {
  children: React.ReactElement<{ onClick?: () => void }>;
}) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  if (isNative && isValidElement(children)) {
    return cloneElement(children, {
      onClick: () => void launchNativeSignIn(),
    });
  }

  return <SignUpButton mode="modal">{children}</SignUpButton>;
}
