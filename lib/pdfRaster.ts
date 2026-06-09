import "server-only";
import * as mupdf from "mupdf";

// Rasterize PDF pages to PNG bitmaps so figure regions can be cropped out (the
// import pipeline needs a source bitmap; pdf-lib/sharp can't render PDF pages).
// mupdf is WASM — works on Windows dev and Vercel serverless alike.

export type RenderedPage = { png: Buffer; width: number; height: number };

/**
 * Build a page renderer bound to one PDF buffer. Rendered pages are cached, so
 * several figures on the same page rasterize that page only once.
 *
 * `scale` multiplies the PDF's native 72dpi (2.5 ≈ 180dpi — sharp enough to crop
 * a question's figures without blowing up memory on a big paper).
 */
export function pdfPageRenderer(pdf: Buffer, scale = 2.5) {
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const pageCount = doc.countPages();
  const cache = new Map<number, RenderedPage>();

  return {
    pageCount,
    render(pageIndex: number): RenderedPage | null {
      if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) return null;
      const hit = cache.get(pageIndex);
      if (hit) return hit;
      const page = doc.loadPage(pageIndex);
      const pix = page.toPixmap(
        mupdf.Matrix.scale(scale, scale),
        mupdf.ColorSpace.DeviceRGB,
        false,
        true // no alpha → white background
      );
      const out: RenderedPage = {
        png: Buffer.from(pix.asPNG()),
        width: pix.getWidth(),
        height: pix.getHeight(),
      };
      cache.set(pageIndex, out);
      return out;
    },
  };
}
