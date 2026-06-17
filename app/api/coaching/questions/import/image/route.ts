import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { uploadCoachingImage } from "@/lib/coachingImageUpload";

// ImageKit upload needs the Node runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

// 8MB cap — a pasted screenshot of a figure is tiny; this just stops an
// accidental huge file.
const MAX_BYTES = 8 * 1024 * 1024;

// POST /api/coaching/questions/import/image  (multipart, field: image)
// Uploads ONE pasted/dropped/selected image to ImageKit and returns its URL, so
// the import review step can fix a figure the AI cropped wrong (or add one that
// was missed) before the questions are saved. Super-admin only, like the import
// extract/commit routes it pairs with — no DB writes here.
export const POST = withCoachingContext(async (req, { coachingId, actor }) => {
  if (!actor.isSuperAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData();
  const entry = form.get("image");
  if (!(entry instanceof File)) {
    return NextResponse.json({ error: "no image provided" }, { status: 400 });
  }
  if (!entry.type.startsWith("image/")) {
    return NextResponse.json({ error: "file must be an image" }, { status: 400 });
  }
  if (entry.size > MAX_BYTES) {
    return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
  }

  const buf = Buffer.from(await entry.arrayBuffer());
  // image/png → "png", image/jpeg → "jpeg"; sanitize and default defensively.
  const ext = entry.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const url = await uploadCoachingImage(buf, coachingId, ext);
  if (!url) {
    return NextResponse.json({ error: "upload failed" }, { status: 502 });
  }
  return NextResponse.json({ url });
});
