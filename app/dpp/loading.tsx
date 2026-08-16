import LoadingLogo from "@/components/ui/LoadingLogo";

// Moved down from app/loading.tsx.
//
// The root loading.tsx put a Suspense boundary above EVERY route, which meant
// every response streamed — and once streaming starts the HTTP status is
// already flushed, so notFound() could render the 404 UI but never set a 404
// code (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// loading.md, "Status Codes"). Every unmatched public URL was answering 200,
// which is what kept thousands of dead URLs alive in Google's crawl set.
//
// The public SEO routes need real status codes far more than they need a
// spinner (they're ISR-cached and answer in milliseconds), so the root boundary
// is gone. /dpp does genuine per-request work and has no SEO stake, so it keeps
// its loading UI here. (app), /c/[slug] and /coaching-admin already had their
// own loading.tsx and are unaffected.
export default function Loading() {
  return <LoadingLogo />;
}
