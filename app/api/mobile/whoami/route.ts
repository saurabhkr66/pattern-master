import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Tells the client what the SERVER sees for its session. /sso-callback polls
// this after redeeming a sign-in ticket: the Android WebView can lag flushing
// freshly written cookies, so navigating to /dashboard immediately after
// setActive() races the (app)/layout auth() gate and bounces to /sign-in.
export async function GET() {
  const { userId } = await auth();
  return NextResponse.json(
    { userId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
