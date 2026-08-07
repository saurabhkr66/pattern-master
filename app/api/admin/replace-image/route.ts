import { NextRequest, NextResponse } from "next/server";
import ImageKit, { toFile } from "@imagekit/nodejs";
import sharp from "sharp";
import { isAdminRequest } from "@/lib/requireAdmin";
import { getImageKitPath, getImageUrl } from "@/lib/imageUtils";

// ImageKit upload + sharp re-encode both need the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 2000; // a question diagram never needs more; keeps CDN bytes sane
const ik = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY! });

/**
 * Re-encode the pasted bytes into the format the existing filename claims.
 *
 * The point of this endpoint is that the path — extension included — does not
 * change, so pasting a JPEG over `diagram.png` would leave the name lying about
 * the contents. Formats we can't round-trip (gif, svg, …) pass through untouched
 * rather than being silently converted to something the name doesn't match.
 */
async function reencode(buf: Buffer, ext: string): Promise<Buffer> {
  const pipeline = sharp(buf, { animated: false }).resize(MAX_EDGE, MAX_EDGE, {
    fit: "inside",
    withoutEnlargement: true,
  });
  switch (ext) {
    case "png":
      return pipeline.png().toBuffer();
    case "jpg":
    case "jpeg":
      return pipeline.jpeg({ quality: 90 }).toBuffer();
    case "webp":
      return pipeline.webp({ quality: 90 }).toBuffer();
    default:
      return buf;
  }
}

/**
 * POST — overwrite ONE image in place, keeping its ImageKit path.
 * multipart: image (File), ref (string — the DB image path, unchanged)
 *
 * Deliberately different from /api/admin/mock-images, which uploads under a new
 * unique name and rewrites the DB ref. Here the filename is the whole point: no
 * DB write happens, so every question referencing this file is fixed at once and
 * nothing can go out of sync.
 *
 * The flip side is that this is a SHARED write — if the file is referenced by
 * other questions, they all change too. The UI says so at the point of use.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const entry = form.get("image");
  const ref = form.get("ref");

  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "no image provided" }, { status: 400 });
  }
  if (!entry.type.startsWith("image/")) {
    return NextResponse.json({ error: "file must be an image" }, { status: 400 });
  }
  if (entry.size > MAX_BYTES) {
    return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
  }
  if (typeof ref !== "string" || !ref.trim()) {
    return NextResponse.json({ error: "no ref provided" }, { status: 400 });
  }

  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json({ error: "ImageKit endpoint not configured" }, { status: 500 });
  }

  const ikPath = getImageKitPath(ref.trim());
  if (!ikPath) {
    return NextResponse.json(
      { error: "this image is not hosted in our ImageKit library — it can't be replaced in place" },
      { status: 400 }
    );
  }

  const segments = ikPath.split("/");
  const fileName = segments.pop()!;
  const folder = `/${segments.join("/")}`;
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();

  try {
    const raw = Buffer.from(await entry.arrayBuffer());
    const bytes = await reencode(raw, ext);
    const file = await toFile(bytes, fileName);

    // useUniqueFileName:false + overwriteFile:true is what makes this replace
    // rather than create — same folder + same name = same delivery URL.
    const result = await ik.files.upload({
      file,
      fileName,
      folder,
      useUniqueFileName: false,
      overwriteFile: true,
    });

    // The old bytes are cached at the CDN edge under an unchanged URL, so
    // without this the replacement stays invisible until the TTL lapses.
    // Async on ImageKit's side — it may take a moment to propagate, which is
    // why the client also cache-busts its own preview.
    let purged = false;
    try {
      await ik.cache.invalidation.create({ url: `${endpoint}/${ikPath}` });
      purged = true;
    } catch (e) {
      console.error("[replace-image] purge failed (upload succeeded):", e);
    }

    return NextResponse.json({
      ok: true,
      ref,
      path: ikPath,
      url: getImageUrl(ref),
      fileId: result.fileId ?? null,
      purged,
      version: Date.now(),
    });
  } catch (e) {
    const err = e as { message?: string; status?: number; body?: unknown };
    console.error("[replace-image] upload failed:", {
      message: err?.message,
      status: err?.status,
      body: err?.body,
      ikPath,
      privateKeyPresent: !!process.env.IMAGEKIT_PRIVATE_KEY,
    });
    return NextResponse.json({ error: err?.message || "upload failed" }, { status: 502 });
  }
}
