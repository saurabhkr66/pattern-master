import { SignIn } from "@clerk/nextjs";

// Coaching-admin sign-in. Separate from the consumer /sign-in so admins land
// in /coaching-admin (not the consumer /dashboard onboarding flow). Owners
// sign in with the email the platform set as the coaching's owner_email; the
// /coaching-admin layout claims the coaching for them on first entry.
export const metadata = {
  title: "Coaching Admin Sign In",
  robots: { index: false, follow: false },
};

export default function CoachingAdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-white">Coaching Admin</h1>
        <SignIn
          forceRedirectUrl="/coaching-admin"
          signUpUrl="/coaching-admin/login"
          routing="hash"
        />
      </div>
    </div>
  );
}
