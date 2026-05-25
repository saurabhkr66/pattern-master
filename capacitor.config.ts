import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.battleexam.app',
  appName: 'BattleExam',

  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 BattleExamApp",

  // 'out' is the standard Next.js static export directory.
  // 'public' only contains raw assets and will fail to load the app.
  webDir: 'out',

  server: {
    // www is the canonical host (apex 307-redirects to www). Pointing the
    // WebView directly at www avoids the redirect, which keeps the Capacitor
    // bridge origin stable and matches where Clerk sets its cookies.
    url: 'https://www.battleexam.com',
    allowNavigation: [
      'battleexam.com',
      '*.battleexam.com',
      '*.clerk.accounts.dev',
      '*.clerk.services',
      'accounts.google.com',
      '*.google.com'
    ]
  },

  android: {
    // Allow Chrome DevTools (chrome://inspect) to attach to the WebView in
    // release builds. Without this, release APKs are opaque and we can't
    // diagnose runtime issues on real devices. Capacitor production apps
    // commonly leave this on — there's no secret logic in the JS layer to
    // protect (auth happens at Clerk, business logic on the server).
    webContentsDebuggingEnabled: true,
  },
};

export default config;
