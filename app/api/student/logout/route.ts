import { NextResponse } from "next/server";
import { clearStudentSession } from "@/lib/studentAuth";

// Clears the student session cookie. Requires a session (gated by middleware).
export async function POST() {
  await clearStudentSession();
  return NextResponse.json({ ok: true });
}
