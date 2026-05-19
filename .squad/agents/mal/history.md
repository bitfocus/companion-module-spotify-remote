# Mal — History

## Project Seed (2026-05-19)

**Requested by:** Justin James

**Project:** companion-module-spotify-remote — Bitfocus Companion module for Spotify playback control via the Spotify Web API.

**Stack:** TypeScript, Node.js 22, @companion-module/base ~1.14.1, `got` HTTP client, `p-queue` for rate limiting, ESLint + Prettier, Husky + lint-staged.

**Source layout:**
- `src/main.ts` — module entry point
- `src/actions.ts` — Companion actions (play, pause, skip, volume, etc.)
- `src/feedback.ts` — Companion feedbacks (track info, playback state)
- `src/config.ts` — module config schema (OAuth/PKCE credentials)
- `src/state.ts` — playback state management
- `src/helpers.ts` — shared utilities
- `src/types.ts` — TypeScript types
- `src/upgrades.ts` — config migration helpers
- `src/api/` — Spotify API client layer

**Current version:** 2.6.0. Multiple prior releases. Mature codebase.

**Build:** `yarn build` — compiles TypeScript to `dist/`. `yarn lint` for ESLint.

## Learnings

