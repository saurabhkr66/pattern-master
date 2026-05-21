import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.battleexam.app',
  appName: 'BattleExam',

  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 BattleExamApp",
  
  // 'out' is the standard Next.js static export directory. 
  // 'public' only contains raw assets and will fail to load the app.
  webDir: 'out', 

  server: {
    url: 'https://battleexam.com',
    allowNavigation: [
      'battleexam.com',
      '*.battleexam.com',
      '*.clerk.accounts.dev',
      '*.clerk.services',
      'accounts.google.com',
      '*.google.com'
    ]
  }
};

export default config;