import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uruvia.app',
  appName: 'Uruvia',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // During development on emulator, uncomment the line below and use your machine's local IP or hosted URL
    // url: 'https://uruvia.web.app',
    cleartext: true
  }
};

export default config;
