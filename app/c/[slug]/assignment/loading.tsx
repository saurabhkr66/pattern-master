import LoadingLogo from "@/components/ui/LoadingLogo";

// Deliberately scoped to this segment rather than hoisted to /c/[slug].
// A loading.tsx creates a Suspense boundary, and once a fallback renders the
// response has already been flushed as 200 — so notFound() can no longer set a
// 404 (see the "Status Codes" note in Next's loading.js docs). This segment is
// behind a student_session cookie, so crawlers never reach it and the streamed
// 200 is harmless here. The public pages (/c/[slug], join, login) must keep a
// real 404, which is why they have no loading.tsx above them.
export default function Loading() {
  return <LoadingLogo />;
}
