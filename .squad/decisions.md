# Squad Decisions

## Active Decisions

### Use set-interval-async dynamic mode with AbortController for FadeVolume

**Date:** 2026-05-19  
**Author:** Kaylee

Use `setIntervalAsync` / `clearIntervalAsync` from `set-interval-async/dynamic` combined with an `AbortController` held on the `SpotifyInstance` to implement the `FadeVolume` action.

**Rationale:**
- **Non-overlapping API calls:** `set-interval-async` dynamic mode waits for the async callback to finish before scheduling the next tick. This guarantees each `setVolume` Spotify API call completes before the next one starts, preventing request pile-up under slow network conditions.
- **Clean cancellation:** Storing a single `AbortController` as `activeVolumeAbort` on the instance means triggering a new `FadeVolume` while one is already running simply calls `abort()` on the old controller. The in-progress timer checks `signal.aborted` at the top of each tick and exits cleanly — no orphaned timers or race conditions.
- **Rate-limit compliance:** A hard minimum interval of 500ms between API calls matches Spotify's recommended rate-limit floor. `numSteps = Math.floor(duration / 500)` maximises the number of smooth volume steps within that constraint.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
