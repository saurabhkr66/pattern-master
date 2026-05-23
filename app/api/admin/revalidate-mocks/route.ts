import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  revalidateTag("mocks", "max");
  return NextResponse.json({ revalidated: true });
}
