import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/requireAdmin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: patternId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  const pattern = await prisma.pattern.update({
    where: { id: patternId },
    data: { short_notes: content },
    select: { id: true, short_notes: true },
  });

  // The topic notes page and the practice-page pattern panel both cache
  // reads from this row under the "patterns" tag for up to 7 days. Expire
  // immediately (rather than "max"'s stale-while-revalidate) so the admin
  // sees the pasted note show up right away instead of on a later visit.
  revalidateTag("patterns", { expire: 0 });

  return NextResponse.json(pattern);
}
