import type { Metadata } from "next";
import NotesPreviewClient from "./NotesPreviewClient";

// Dev/authoring sandbox: paste Mastery-notes markdown and see it render through
// the real NotesRenderer pipeline (remark-gfm + remark-math + rehype-katex).
// No DB dependency, so it works without backend secrets. Not indexed; safe to
// delete once note formatting is dialed in.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NotesPreviewPage() {
  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        Notes Preview Sandbox
      </h1>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16, maxWidth: 760 }}>
        Paste Mastery-notes markdown on the left; the right pane shows exactly how
        it renders in the editor — GFM tables, <strong>bold</strong>, bullets and
        KaTeX math. This page is not indexed and has no database dependency.
      </p>
      <NotesPreviewClient />
    </div>
  );
}
