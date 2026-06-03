"use client";
import { useEffect } from "react";
import { addMembership } from "@/lib/coachingMemberships";

/**
 * Rendered on the student dashboard (a page you only reach with a valid
 * session). Quietly records this coaching in the device's local list so it
 * shows up as a tappable card on the coaching home screen next time.
 */
export default function RememberCoaching({ slug, name }: { slug: string; name: string }) {
  useEffect(() => {
    addMembership({ slug, name });
  }, [slug, name]);
  return null;
}
