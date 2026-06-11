import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Mints a short-lived, single-use Clerk sign-in token for the CALLER's own
// user. Used by the native-app sign-in handoff: the user authenticates in the
// system browser (where the normal web flow works), this token rides the
// battleexam:// deep link back into the app, and the WebView redeems it via
// signIn.create({ strategy: "ticket" }) — creating the session on the
// WebView's own Clerk client. This sidesteps Clerk's oauth_callback client
// binding, which rejects callbacks arriving from a different browser than the
// one that created the sign-in attempt (err_code=authorization_invalid).
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const token = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 300,
  });

  return NextResponse.json({ token: token.token });
}
