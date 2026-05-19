# Zoe — History

## Project Seed (2026-05-19)

**Requested by:** Justin James

**Project:** companion-module-spotify-remote — Bitfocus Companion module for Spotify playback control via the Spotify Web API.

**Stack:** TypeScript, Node.js 22, @companion-module/base ~1.14.1, `got` HTTP client, `p-queue`.

**Key edge cases to keep in mind:**
- Spotify token expiry mid-session (should auto-refresh)
- Rate limiting (429 responses from Spotify API)
- Network unreachability (Companion modules run live on stage)
- Playback active on a different device than expected
- No active playback device
- Premium vs free account differences in API capabilities
- Polling interval edge cases (state staleness)

**Build:** `yarn build` compiles to `dist/`. `yarn lint` for ESLint.

**Current version:** 2.6.0. Multiple prior releases.

## Learnings

