import { NextResponse } from "next/server";

// This route is no longer used for onboarding. 
// Onboarding is now handled via Server Actions in /app/onboarding/actions.ts
export async function GET() {
    return NextResponse.json({ message: "OK" });
}