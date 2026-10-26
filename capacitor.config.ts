import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iOS app wrapper (Capacitor). The app packages the `pnpm build:app` bundle (dist-app/) and
 * serves it locally, so it installs and launches like any app: no browser bar, no
 * "Add to Home Screen", no page zoom. See docs/IOS_APP.md for building and sideloading.
 */
const config: CapacitorConfig = {
  appId: 'io.github.albertgil.roadsterrace',
  appName: 'Roadster Race',
  webDir: 'dist-app',
  backgroundColor: '#111820',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
    backgroundColor: '#111820',
    preferredContentMode: 'mobile',
  },
};

export default config;
