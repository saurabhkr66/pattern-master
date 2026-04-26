import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.battleexam.app',
  appName: 'BattleExam',

  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 BattleExamApp",
  
  // 'out' is the standard Next.js static export directory. 
  // 'public' only contains raw assets and will fail to load the app.
  webDir: 'out', 

  server: {
    // During production, we want to bundle the code for offline use and performance.
    // Set this to the live URL only for development or if you strictly want a webview wrapper.
    url: 'https://battleexam.com',
    cleartext: true,

    // This tells the app to keep your domain inside the native screen!
    allowNavigation: [
      '*',
      'battleexam.com',
      '*.battleexam.com',
      '*.clerk.accounts.dev', // Allows Clerk's fallback domains
      '*.clerk.services',     // Allows Clerk's API
      'accounts.google.com',  // Allows Google Login
      '*.google.com'
    ]
  }
};

export default config;