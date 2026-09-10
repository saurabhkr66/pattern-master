import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.battleexam.app',
  appName: 'BattleExam',

  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 BattleExamApp",

  // 'out' is the standard Next.js static export directory.
  // 'public' only contains raw assets and will fail to load the app.
  webDir: 'out',

  server: {
    // The apex is the canonical host — deploy/Caddyfile 301-redirects
    // www -> apex (www was getting crawled as a duplicate site). This URL MUST
    // be the origin the server actually serves, not one that redirects:
    // Bridge.java injects the native-bridge script (which defines
    // Capacitor.PluginHeaders) into this single origin only, ignoring
    // allowNavigation. Land on any other origin and androidBridge still exists
    // — so isNativePlatform() is true — but every plugin call throws
    // "not implemented on android". It also keeps us same-origin with the
    // Clerk FAPI proxy at battleexam.com/__clerk.
    url: 'https://battleexam.com',
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
