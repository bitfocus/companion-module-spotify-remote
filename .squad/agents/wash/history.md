# Wash — History

## Project Seed (2026-05-19)

**Requested by:** Justin James

**Project:** companion-module-spotify-remote — Bitfocus Companion module for Spotify playback control via the Spotify Web API.

**Stack:** TypeScript, Node.js 22, Spotify Web API, `got` ^14.4.7 HTTP client, `p-queue` ^8.1.0 for rate limiting, `@types/spotify-api` ^0.0.25.

**My domain:**
- `src/api/` — Spotify API client layer
- OAuth/PKCE auth flow (token acquisition and refresh)
- Rate limiting and request queuing
- `src/state.ts` — playback state (shared with team)
- `src/helpers.ts` — shared utilities (shared with team)

**Build:** `yarn build` compiles to `dist/`. Always verify build passes after changes.

**Current version:** 2.6.0. Multiple prior releases.

## Learnings

