"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SignIn, useSignIn } from '@clerk/nextjs';
import { Browser } from '@capacitor/browser';

function MobileNativeLogin() {
  const { signIn } = useSignIn();
  const isLoaded = !!signIn;
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      // 1. Tell Clerk we want to use Google OAuth
      const absoluteRedirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/sso-callback` : '/sso-callback';
      
      const response = await signIn.create({
        strategy: 'oauth_google',
        // In Capacitor, we redirect back to our app's custom scheme or web domain
        redirectUrl: absoluteRedirectUrl, 
      });

      // @ts-ignore - Clerk v7 type definitions hide the internal response properties
      const verification = response.firstFactorVerification || response?.signIn?.firstFactorVerification;
      
      if (verification && verification.externalVerificationRedirectURL) {
        // In some versions this is a URL object, in others it's a raw string
        const authUrl = verification.externalVerificationRedirectURL.href || verification.externalVerificationRedirectURL;
        
        if (typeof authUrl === 'string') {
          await Browser.open({ url: authUrl });
        } else {
          alert("Error: Extracted URL is invalid: " + JSON.stringify(verification));
        }
      } else {
        // DEBUG: find out what's inside the response object
        const anyResponse = response as any;
        const keys = Object.getOwnPropertyNames(anyResponse).concat(Object.keys(anyResponse));
        const status = anyResponse.status;
        alert("Debug Clerk v7 object. Status: " + status + ". Keys: " + keys.join(', '));
      }
    } catch (err) {
      console.error('OAuth error', err);
    } finally {
      setLoading(false);
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
    // Check if the Capacitor bridge is active, or fallback to our custom User Agent
    const isApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('BattleExamApp');
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
