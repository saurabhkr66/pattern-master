"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Invisible component — mounts in the root layout.
 * When a user signs in/up, if there's a stored redirect destination
 * (set by TopicsExplorer when clicking a subject pill), navigate there.
 */
export default function PostLoginRedirect() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (!isSignedIn || handled.current) return;

    try {
      const dest = sessionStorage.getItem("battleexam_post_login_redirect");
      if (dest) {
        handled.current = true;
        sessionStorage.removeItem("battleexam_post_login_redirect");
        router.push(dest);
      }
    } catch {
      // ignore storage errors
    }
  }, [isSignedIn, router]);

  return null;
}
