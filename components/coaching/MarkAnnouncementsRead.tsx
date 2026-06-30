"use client";

import { useEffect } from "react";

// Fires once on mount to mark the listed announcements as read for the current
// student, so the dashboard unread badge clears. Best-effort: a failed POST just
// leaves them unread (the badge stays, no user-facing error). Renders nothing.
export default function MarkAnnouncementsRead({ ids }: { ids: string[] }) {
  useEffect(() => {
    if (ids.length === 0) return;
    fetch("/api/student/announcements/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
    // ids is the stable visible set for this render; mark once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
