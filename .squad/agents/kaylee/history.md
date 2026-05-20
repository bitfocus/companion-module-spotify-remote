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

- **FadeVolume implementation pattern**: Use `setIntervalAsync` from `set-interval-async/dynamic` to schedule volume steps. Dynamic mode waits for the async callback to complete before firing the next tick — this ensures sequential, non-overlapping Spotify API calls.
- **AbortController cancellation pattern**: `SpotifyInstanceBase.startVolumeFade()` calls `abort()` on any existing `AbortController` before creating a fresh one, providing clean cancellation when a new fade supersedes an in-progress one.
- **500ms minimum interval**: `FADE_MIN_INTERVAL_MS = 500` enforces the Spotify API rate-limit floor; `numSteps = Math.floor(duration / 500)` maximises smoothness within that constraint.
- **Import path for set-interval-async**: Use `'set-interval-async/dynamic'` — the package exports this sub-path for the dynamic (async-safe) mode. Works with `"moduleResolution": "node16"`.
- **FadeVolume action fire-and-forget pattern** (2026-05-19): Action callback changed from `await FadeVolume(...)` to fire-and-forget with `.catch(...)` to avoid Companion's 5-second action timeout. The action returns immediately; the fade continues async in the background. AbortController cancellation pattern remains fully functional — calling `abort()` on the controller cleanly stops the fade timer without affecting return timing.
