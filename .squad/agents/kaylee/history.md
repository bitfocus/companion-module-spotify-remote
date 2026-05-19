# Kaylee — History

## Project Seed (2026-05-19)

**Requested by:** Justin James

**Project:** companion-module-spotify-remote — Bitfocus Companion module for Spotify playback control via the Spotify Web API.

**Stack:** TypeScript, Node.js 22, @companion-module/base ~1.14.1, `got` HTTP client, `p-queue` for rate limiting, ESLint + Prettier.

**My domain:**
- `src/actions.ts` — Companion actions
- `src/feedback.ts` — Companion feedbacks
- `src/config.ts` — module config schema
- `src/upgrades.ts` — config migration helpers
- `src/main.ts` — module entry point (shared with team)
- `src/types.ts` — TypeScript types (shared)

**Build:** `yarn build` compiles to `dist/`. Always verify build passes after changes.

**Current version:** 2.6.0. Multiple prior releases.

## Learnings

