"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Clock, XCircle, LogOut, ArrowRight } from "lucide-react";

/**
 * Shown when a Clerk user is signed in but resolves to no coaching — i.e. their
 * application is still pending, was rejected, or their email matches no
 * coaching. Without this, the layout would redirect to /coaching-admin/login,
 * which (since they're already signed in) bounces them straight back here → an
 * infinite redirect loop. This terminates the loop with an explanation.
 */
export default function CoachingAccessPending({
  status,
  coachingName,
  email,
}: {
  status: string | null; // "pending" | "rejected" | "approved" | null
  coachingName: string | null;
  email: string | null;
}) {
  const pending = status === "pending";

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "#06060c" }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${
            pending ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-400"
          }`}
        >
          {pending ? <Clock size={28} /> : <XCircle size={28} />}
        </div>

        <h1 className="mt-5 text-xl font-bold text-white">
          {pending ? "Application under review" : "No coaching linked to this account"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {pending ? (
            <>
              We review every coaching personally. {coachingName ? <span className="font-medium text-white">{coachingName}</span> : "Your application"} is
              pending approval — you&apos;ll get access here as soon as it&apos;s activated.
            </>
          ) : (
            <>
              {email ? (
                <>
                  <span className="font-medium text-white">{email}</span> isn&apos;t linked to an
                  active coaching.
                </>
              ) : (
                "This account isn't linked to an active coaching."
              )}{" "}
              If you run a coaching, apply for access below.
            </>
          )}
        </p>

        {!pending && (
          <Link
            href="/for-coachings"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Apply for access <ArrowRight size={15} />
          </Link>
        )}

        <div className="mt-6 border-t border-slate-800 pt-5">
          <SignOutButton redirectUrl="/coaching-admin/login">
            <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white">
              <LogOut size={15} /> Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
