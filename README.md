# Magni App

Mobile app for the [Magni fitness tracker](https://github.com/AshenKeep/Magni).
Built with Capacitor + React + TypeScript.

## Installing

Download the latest APK from the [Releases](../../releases) page and install it on your Android phone.

**First time connecting to your server:**

Your Magni server uses a self-signed SSL certificate. Open your server URL (`https://your-server:8443`) in Chrome on your phone and accept the certificate warning. Android will then trust it for the app.

## Architecture

- **Capacitor** — native Android wrapper
- **Vite + React + TypeScript** — the UI
- **Dexie.js** — local IndexedDB storage (works fully offline)
- **Sync** — full sync on first run, delta sync on open, WiFi-only option
- **Health Connect** — reads Garmin data (steps, HR, sleep, calories) from Android Health Connect
- **GitHub Actions** — auto-builds APK on every push to `main`

## Releases

Every push to `main` triggers an automatic build. The APK is published to the [Releases](../../releases) page as `magni_vX.X.X.apk`.
