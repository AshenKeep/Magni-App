# Changelog

All notable changes to the Magni mobile app are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.0.13] — 2026-07-02

### Changed
- Added `"type": "module"` to package.json — removes the PostCSS build warning.
- ESLint upgraded to v9 with a flat config (`eslint.config.js`). `npm run lint`
  previously did nothing at all: the script existed but no config file did, so
  ESLint silently no-opped. It now runs as a real gate.
- Removed a duplicate `isolatedModules` key in tsconfig.json (build warning).

### Fixed
- `ExercisesPage`: `let` → `const` for a never-reassigned query (caught by the
  newly-working lint).
- `healthService`: removed a redundant eslint-disable directive.

## [0.0.12] — 2026-05-21

### Fixed
- Exercise GIFs render — uses the reactive `serverUrl` store hook rather than
  `getState()` (which can be null on first render); empty `gif_url` treated as no image.
- "Starting early" warning shows correctly — the original scheduled date is captured
  before the start time is reset to now.
- Calendar template scheduling writes the correct date to both server and local DB.

### Added
- Health Connect data pushed to the server via `POST /api/stats/daily`, so the web
  portal Activity tab reflects phone-synced Garmin data.
- Per-exercise workout logger pages with rest timers and set completion.
- Active-workout notification and Dashboard "jump back in" banner.
- First-launch permissions setup screen (notifications + Health Connect).

## [0.0.8] — 2026-05-15

### Changed
- GitHub Actions migrated to Node 24 compatible action versions.
- Consistent signing keystore via the `KEYSTORE_BASE64` secret — app updates no
  longer require uninstalling the previous build first.

## [0.0.1 – 0.0.7]

- Initial Capacitor app: offline-first Dexie storage, full/delta sync, WiFi-only
  toggle, Health Connect integration, calendar, templates, exercises and activity
  screens, plus automated APK builds via GitHub Actions.
