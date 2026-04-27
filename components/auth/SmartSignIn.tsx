"use client";

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SignIn, useSignIn } from '@clerk/nextjs';
import { Browser } from '@capacitor/browser';

function MobileNativeLogin() {
  const { signIn } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);

  // Ref so the browserFinished listener always sees the latest signIn object.
  const signInRef = useRef(signIn);
  signInRef.current = signIn;

  // Clerk v7: signIn.status is reactive. When the OAuth completes in the
  // Chrome Custom Tab, Clerk updates the status to 'complete' and we call
  // finalize() to activate the session in the WebView — no cookie sharing needed.
  useEffect(() => {
    if (!oauthPending || !signIn || signIn.status !== 'complete') return;
    setOauthPending(false);
    signIn.finalize().then(({ error }) => {
      if (!error) window.location.href = '/dashboard';
    });
  }, [signIn?.status, oauthPending]);

  const handleGoogleLogin = async () => {
    if (!signIn) return;

    if (!Capacitor.isNativePlatform()) {
      alert('Native bridge not available. Please reinstall the app.');
      return;
    }

    setLoading(true);
    try {
      // Always use the production URL — this is a native app, the redirect must
      // be whitelisted in Clerk regardless of which server the WebView is loading from.
      await signIn.create({
        strategy: 'oauth_google',
        redirectUrl: 'https://battleexam.com/sso-callback',
        actionCompleteRedirectUrl: '/dashboard',
      });

      const verification = signIn.firstFactorVerification;

      if (!verification?.externalVerificationRedirectURL) {
        setLoading(false);
        alert('Sign-in failed: could not get Google redirect URL. Please try again.');
        return;
      }

      const rawUrl =
        typeof verification.externalVerificationRedirectURL === 'string'
          ? verification.externalVerificationRedirectURL
          : verification.externalVerificationRedirectURL.href;

      // Use URLSearchParams to properly set prompt — Clerk's URL may already
      // have a prompt param and simple concatenation would create duplicates.
      const url = new URL(rawUrl);
      url.searchParams.set('prompt', 'select_account');

      setOauthPending(true);
      await Browser.open({ url: url.toString() });

      // Fallback: if the reactive status update hasn't fired by the time the
      // Custom Tab closes, try finalize() directly.
      const listener = await Browser.addListener('browserFinished', async () => {
        listener.remove();
        setLoading(false);
        const current = signInRef.current;
        if (current?.status === 'complete') {
          const { error } = await current.finalize();
          if (!error) { window.location.href = '/dashboard'; return; }
        }
        setOauthPending(false);
        window.location.href = 'https://battleexam.com/';
      });
    } catch (err: unknown) {
      setLoading(false);
      setOauthPending(false);
      const msg = err instanceof Error ? err.message : String(err);
      console.error('OAuth error', msg);
      alert('Sign-in error: ' + msg);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl max-w-[340px] w-full mx-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Welcome Back</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in to continue to BattleExam</p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border transition-all hover:bg-gray-50 active:scale-95"
        style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)", background: "var(--bg-base)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="font-medium text-[15px]">{loading ? "Opening..." : "Continue with Google"}</span>
      </button>
    </div>
  );
}

export default function SmartSignIn() {
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    const isApp = Capacitor.isNativePlatform();
    setIsNative(isApp);
  }, []);

  if (isNative === null) {
    return (
      <div className="w-[340px] h-[300px] animate-pulse rounded-3xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}></div>
    );
  }

  if (isNative) {
    return <MobileNativeLogin />;
  }

  return <SignIn />;
}
