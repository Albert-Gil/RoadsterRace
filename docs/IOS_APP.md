# iOS app (test builds without the Apple Developer Program)

Roadster Race can be installed as a real iOS app instead of a web page saved to the Home Screen.
The app is the same game: the `pnpm build:app` bundle wrapped by [Capacitor](https://capacitorjs.com/)
(`capacitor.config.ts`, native project in `ios/`). It launches full screen, has no browser bar,
cannot be pinch- or double-tap-zoomed, hides the status bar and home indicator while playing,
and asks for a second swipe at the screen edges so corner thrust pads do not trigger Home or
Control Centre.

This page covers testing on your own iPhone/iPad **for free** from a Windows PC. Nothing here
needs a Mac, an Apple Developer Program membership ($99/year), certificates or GitHub secrets.

> Status: the build pipeline and project are prepared and verified up to the web bundle and
> Capacitor sync. The first macOS build and a physical-device install have **not** been
> performed yet; record the results here once you have run them.

## 1. Get the unsigned app (.ipa)

GitHub builds it on a hosted Mac (`.github/workflows/ios.yml`, macOS 26 image with Xcode 26,
which Capacitor 8 requires). Hosted runners are free for public repositories.

1. Push a branch and open a pull request into `main`, push to `main`, or start the workflow by
   hand: GitHub → **Actions** → **iOS test app (unsigned IPA)** → **Run workflow**.
2. When the run is green, open it and download the artifact
   **RoadsterRace-unsigned-ipa-N** (a .zip). Unzip it to get `RoadsterRace-unsigned.ipa`.

The .ipa is unsigned on purpose; the next step signs it with your own free Apple ID.

## 2. One-time PC setup (Windows)

1. Install **iTunes and iCloud from Apple's website** (the "web"/standalone installers), not
   the Microsoft Store versions. Uninstall the Store versions first if you have them; Sideloadly
   needs the desktop versions' device drivers.
2. Install **Sideloadly** from its official site (sideloadly.io).
3. Connect the iPhone/iPad with a cable, unlock it, tap **Trust This Computer**, and open
   iTunes once so the device is recognised.

## 3. Install with Sideloadly

1. Open Sideloadly, drag `RoadsterRace-unsigned.ipa` onto it, pick your device, and enter your
   Apple ID (a free account is enough; a secondary Apple ID works too).
2. Press **Start**. Sideloadly signs the app for your account and installs it.
3. On the device, before the first launch:
   - **Settings → General → VPN & Device Management** → your Apple ID → **Trust**.
   - **Settings → Privacy & Security → Developer Mode** → On (iOS 16 and later). The device
     restarts; confirm **Turn On** and enter your passcode.
4. Launch **Roadster Race** from the Home Screen.

## Free-account limits

- A free Apple ID signs apps for **7 days**. After that the app will not open until you install
  it again (step 3, same .ipa or a newer one). Sideloadly can refresh it automatically while the
  device is reachable from the PC.
- At most **3** sideloaded apps can be active at once on a device with a free account.
- Free accounts are also limited in how many new app identifiers they can register per week, so
  keep the same bundle identifier (`io.github.albertgil.roadsterrace`) when reinstalling.

These limits are why a free install is for testing. The paid Apple Developer Program removes
them: one-year signing, TestFlight for other testers, and App Store distribution.

## What to check on the device

- First launch shows the dark launch screen and then the welcome screen with sound on.
- Double-tap and pinch anywhere never zoom; swipes from the bottom edge need a second swipe.
- **Race setup → 05 / Graphics**: *Auto* shows the detected tier (iPhones and iPads start at
  High). Try Low, Medium, High and Ultra and note smoothness and heat; Auto steps down on its
  own if frames stay slow.
- Draw, race, multiplayer touch pads, tutorial, tournaments, and that saved settings persist
  across app restarts.

## Building the app bundle locally

```powershell
pnpm build:app      # dist-app/, relative paths for the app
pnpm ios:sync       # build:app, then copy it into ios/App/App/public (cap sync ios)
```

`pnpm ios:sync` works on Windows and Linux; compiling the native app needs macOS and Xcode,
which the GitHub workflow provides. On a Mac you can open `ios/App/App.xcodeproj` in Xcode and
run it directly on a connected device with a free Apple ID (Signing & Capabilities → Team).

## Project notes

- `ios/App/App/SceneDelegate.swift` holds `GameViewController` (home indicator and edge-gesture
  behaviour). `Info.plist` hides the status bar and requires full screen on iPad.
- `cap sync` regenerates `ios/App/CapApp-SPM/Package.swift` (Swift Package Manager; no
  CocoaPods). `ios/App/App/public` and `capacitor.config.json` are generated and ignored by git.
- App icon and launch images come from `public/assets/mark.svg` via
  `node tools/generate-app-icons.mjs`.
