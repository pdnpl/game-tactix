import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pdnpl.tactix',
  appName: 'Tactix',
  webDir: 'dist',

  // No `server.url`: the bundle ships inside the app, so it runs offline and
  // makes no network requests at all.
  android: {
    backgroundColor: '#08080c',
  },
  ios: {
    backgroundColor: '#08080c',
    contentInset: 'never',
  },

  plugins: {
    SplashScreen: {
      // The bundle is a few kilobytes and paints immediately, so a timed splash
      // would be dead time. Native code hides it as soon as the game is ready.
      launchAutoHide: false,
      backgroundColor: '#08080c',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
}

export default config
