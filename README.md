# Magni App

Mobile app for the [Magni fitness tracker](https://github.com/AshenKeep/Magni).
Built with Capacitor + React + TypeScript.

## Setup

```bash
npm install
npm run build
npx cap add android    # first time only
npx cap sync android
```

Then open `android/` in Android Studio and build, or let GitHub Actions do it.

## Architecture

- **Capacitor** — native Android wrapper
- **Vite + React + TypeScript** — the UI
- **Dexie.js** — local IndexedDB storage (works fully offline)
- **Sync** — full sync on first run, delta sync on open, WiFi-only option
- **Health Connect** — reads Garmin data (steps, HR, sleep, calories) from Android Health Connect
- **GitHub Actions** — auto-builds APK on every push to `main`

## Distribution

Every push to `main` triggers a build. Download the APK from the [Releases](../../releases) page.
