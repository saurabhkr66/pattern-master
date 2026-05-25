import { NextRequest, NextResponse } from "next/server";
import ImageKit, { toFile } from "@imagekit/nodejs";

const ik = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || `upload-${Date.now()}`;
    const fileForUpload = await toFile(buffer, fileName);

    const result = await ik.files.upload({
      file: fileForUpload,
      fileName,
      folder: "/pattern-master",
      useUniqueFileName: true,
    });

    // Keep response shape backwards-compatible: callers read result.secure_url
    return NextResponse.json({
      success: true,
      result: {
        secure_url: result.url,
        public_id: result.fileId,
        ...result,
      },
    });
  } catch (error: any) {
    console.error("ImageKit upload error:", error);
    return NextResponse.json(
      { error: "Image upload failed", details: error.message },
      { status: 500 }
    );
  }
}
