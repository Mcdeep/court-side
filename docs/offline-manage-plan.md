# Offline support for `/manage/:tournamentId`

## Context

Courtside staff run live tournaments from `/manage/:tournamentId` on a phone,
authenticated by a 4-digit PIN (no Clerk login) — see `CLAUDE.md` and the
PIN-gate flow in `src/routes/manage/$tournamentId.tsx`. Venues regularly have
dead spots or unreliable WiFi, and Convex requires a live connection for
every query and mutation today — there's no offline infrastructure at all
(no service worker, no IndexedDB usage, no `vite-plugin-pwa`/Dexie/
idb-keyval in the repo). `PLAN.md` Phase 6 has an unchecked backlog item for
a read-only offline shell, nothing for writes.

Goal: staff can keep entering scores and starting/completing rounds with
zero signal, and it syncs automatically once connectivity returns, without
silently losing or corrupting data.

**Scope:**
- **Offline-capable**: score entry (`scores.saveResult`), round
  start/complete (`rounds.start`/`rounds.complete`), including the existing
  auto-complete-when-all-scored effect.
- **Requires a live connection**: generating the next round
  (`rounds.generate` — reruns expensive, format-specific algorithms against
  full match history server-side), finishing the tournament
  (`tournaments.finish`), resetting the schedule (`rounds.resetSchedule`),
  and generator settings (`tournaments.update`). These happen between
  rounds or at the end, when a few seconds of signal is realistic.
- **Conflict handling**: if two offline devices queue different scores for
  the same match, sync must flip the match to the existing `disputed`
  state for an admin to resolve — not last-write-wins.
- **State management**: use **Zustand** for the shared queue/connectivity
  state (pending ops, sync status, needs-reauth flag) that `MatchCell`,
  `ManageRoundCard`, and the page header all need to read/update — a store
  lets each component subscribe to just the slice it needs (e.g. "is *this*
  match's score pending?") without re-rendering the whole schedule on every
  queue change, and lets the non-React queue-drain logic update state
  directly without a dispatch/context wiring layer. New dependency, not
  currently in `package.json`.

## Key facts (so implementation doesn't need to re-derive them)

- `requireOrgAdminOrPin` (`convex/lib/auth.ts`) throws exactly
  `new Error("Invalid PIN")` on a bad/rotated PIN — reliable to match on,
  though wrapping it as a structured `ConvexError({ code: 'pin_invalid' })`
  is more robust than string-matching and cheap to do while touching this
  code.
- `ConvexReactClient` (installed `convex@^1.41.0`) exposes
  `subscribeToConnectionState(cb): () => void` and `connectionState()`,
  returning `{ isWebSocketConnected, hasInflightRequests, hasEverConnected,
  connectionCount, connectionRetries, inflightMutations, inflightActions }`
  — this is the connectivity source of truth, not `navigator.onLine` (which
  only reflects "some network interface is up", not "can reach Convex").
- No `zustand`, `idb-keyval`, `vite-plugin-pwa`, or `convex-test` currently
  installed. Existing Convex tests (`convex/formats/*.test.ts`) are
  pure-function tests, not mutation-harness tests — there's no existing
  `convex-test` convention to follow for testing the new `saveResult`
  conflict branch; that's new test infra if we want it (kept optional/
  Phase-3, not blocking).

## Design

### 1. Local persistence — `idb-keyval`

Two flat key spaces, no schema/migrations needed since this is "one active
tournament's state on one phone", not a general sync engine:
- `mirror:{tournamentId}` — last-known `{ tournament, rounds, participants,
  leaderboard }` blob, refreshed on every successful live query resolution.
- `mirror:matches:{roundId}` — last-known `matches.listByRound` result per
  round.
- `outbox:{tournamentId}` — one ordered array of `QueuedOp` records.

**New file** `src/features/manage/offline-store.ts`: `getMirror`,
`setMirror`, `getMatchesMirror`, `setMatchesMirror`, `getOutbox`,
`appendToOutbox`, `removeFromOutbox`, `updateOutboxOp`. Also defines the
`QueuedOp` union:
```ts
type QueuedOp =
  | { id: string; kind: 'saveResult'; matchId: Id<'matches'>; scoreA: number; scoreB: number; queuedAt: number; status: 'pending' | 'error'; lastError?: string }
  | { id: string; kind: 'startRound'; roundId: Id<'rounds'>; queuedAt: number; status: 'pending' | 'error'; lastError?: string }
  | { id: string; kind: 'completeRound'; roundId: Id<'rounds'>; queuedAt: number; status: 'pending' | 'error'; lastError?: string }
```

### 2. Shared state — Zustand store

**New file** `src/features/manage/manage-store.ts`: a Zustand store scoped
per mount (created via a factory + React context so each `/manage/:id`
session gets its own store instance, avoiding cross-tournament leakage if
the app is ever used for two tournaments in one browser session):
```ts
type ManageState = {
  pendingOps: QueuedOp[]
  isOnline: boolean
  isSyncing: boolean
  needsReauth: boolean
  setPendingOps: (ops: QueuedOp[]) => void
  setConnection: (state: { isOnline: boolean }) => void
  setSyncing: (syncing: boolean) => void
  setNeedsReauth: (needs: boolean) => void
}
```
- `MatchCell` subscribes with a selector (`useManageStore(s =>
  s.pendingOps.some(op => op.kind === 'saveResult' && op.matchId === match._id))`)
  so only the affected card re-renders when the queue changes.
- The header badge subscribes to `pendingOps.length`, `isOnline`,
  `isSyncing`.
- `offline-queue.ts`'s drain loop (plain TS, no React) calls the store's
  setters directly (`store.getState().setPendingOps(...)`) after each op
  settles — no context/dispatch plumbing needed outside React.

### 3. PWA app shell (read-only offline load)

- Add `vite-plugin-pwa` (dev dependency) with `strategies: 'injectManifest'`
  in `vite.config.ts` — custom SW gives explicit control so it never
  intercepts/caches Convex API/WebSocket calls (data freshness comes from
  the IndexedDB mirror, not SW response caching), and the navigation
  fallback stays scoped to `/manage/*` (must not hijack the Clerk-authed
  desktop dashboard routes).
- **New file** `src/sw.ts`: `precacheAndRoute(self.__WB_MANIFEST)` +
  `NavigationRoute` fallback to the shell for `/manage/*`, `NetworkOnly`
  passthrough for the Convex deployment origin, `skipWaiting`/
  `clientsClaim` for auto-update.
- **New file** `src/lib/register-sw.ts`: registers `/sw.js` client-side
  only (`useEffect` in the root route, SSR-safe).
- Fix `public/manifest.json` (currently unmodified Create-TanStack-App
  boilerplate — wrong name/icons) with real branding, `display:
  "standalone"`, real theme colors pulled from the app's actual CSS
  tokens (don't invent hex values).
- `netlify.toml`: confirm/add a `Cache-Control: no-cache` header rule for
  `/sw.js` so Netlify's CDN doesn't serve a stale worker for a long TTL —
  the static `dist/client` publish target needs no other changes.
- **Modify** `src/routes/manage/$tournamentId.tsx` and
  `ManageRoundCard` (in `manage-schedule.tsx`): on every successful query
  resolution, mirror the data into IndexedDB (`setMirror`/
  `setMatchesMirror`); on mount, if the live query hasn't resolved yet,
  render from `getMirror`/`getMatchesMirror` instead of a spinner, with a
  small "showing last-synced data" indicator.

This phase (shell + read mirror) is independently shippable and testable:
kill the network entirely, reload `/manage/:id`, confirm it boots and
shows last-known state.

### 4. Offline-write abstraction

**New file** `src/features/manage/offline-queue.ts` (pure TS, unit-testable
without React):
```ts
export async function enqueueOp(tournamentId, op: QueuedOp): Promise<void>
export async function drainQueue(tournamentId, convexClient, pin, store): Promise<void>
```
`drainQueue` runs strictly FIFO (a `for` loop, not `Promise.all` — score
ordering for the same match matters). Per op:
- Dispatch the matching mutation (`scores.saveResult`, `rounds.start`,
  `rounds.complete`).
- On success or a `{status: 'noop'}` response (see backend change below):
  remove from outbox, continue.
- On a PIN error: **stop draining**, set `needsReauth` in the store, leave
  the op and everything behind it queued (don't discard).
- On any other error (still offline, transient): **stop draining** (no
  skip-ahead — an out-of-order replay could apply a later score before an
  earlier one), mark the op `status: 'error'`, rely on the next reconnect
  event to retry from the front.

**New file** `src/features/manage/use-manage-actions.ts` — the hook
`MatchCell`/`ManageRoundCard` call instead of `useMutation` directly:
`saveResult(matchId, scoreA, scoreB)`, `startRound(roundId)`,
`completeRound(roundId)`. Each: optimistically patches the local mirror
immediately (so the UI feels instant and `allDone` computation for the
auto-complete effect keeps working off local state), then tries the live
Convex mutation; on failure/offline, falls back to `enqueueOp`. Always
attempts the live call first rather than gating purely on a cached
`isOnline` flag, to avoid a race where connectivity flips back before a
drain fires.

**New file** `src/lib/use-convex-connection-state.ts`: thin hook around
`client.subscribeToConnectionState`, feeding `manage-store`'s
`setConnection`; also listens to `window`'s `online` event purely as an
extra trigger to attempt a drain (never as the authoritative "are we
online" signal).

**Wiring**: a `ManageActionsProvider` (holding both the Zustand store
instance and the `useManageActions` hook's return value via context) is
mounted once in `src/routes/manage/$tournamentId.tsx`; `MatchCell` and
`ManageRoundCard` consume it instead of calling `useMutation` directly.
The existing auto-complete `useEffect` in `ManageRoundCard`
(`round.state === 'in_progress' && allDone && ...`) needs no changes — it
keeps calling `handleComplete`, which now routes through the queue-aware
`completeRound` transparently.

`resetSchedule`/`finishTournament`/`onGenerate`/`update` stay as direct
`useMutation` calls (per scope decision) — just get `disabled={!isOnline}`
added.

### 5. Backend: no-op replay + conflict detection

**Modify `convex/rounds.ts`**: `start`/`complete` currently `throw` when
the round isn't in the expected state. Change so that if the round has
*already reached or passed* the target state (e.g. `start` called on an
already-`in_progress` or `completed` round), return `{ status: "noop" }`
instead of throwing — this is what makes replaying a queued op after a
page reload (or after another device already advanced the round) safe
rather than a spurious error. Only throw for genuinely unexpected states.

**Modify `convex/scores.ts`**: `saveResult` currently always overwrites.
New behavior:
- If the match is already `completed`/`disputed` with the *same*
  `scoreA`/`scoreB` being written again → return `{ status: "noop" }`
  (idempotent replay).
- If already `completed` with *different* scores → this is the two-device
  conflict case: patch the match to `disputed`, insert both the existing
  and incoming scores into the `scores` table as `disputed` rows (mirrors
  the existing conflict branch in `scores.submit`), and — critically — do
  **not** call `leaderboard.recalculate` (matching how `submit`'s dispute
  branch already behaves; the previously-applied score's delta stays until
  an admin resolves it).
- Otherwise, unchanged (patch to completed, schedule recalculate with
  `prevScoreA`/`prevScoreB`).

**Modify `convex/schema.ts`**: `scores.submittedBy` is currently
`v.id("participants")` (required) — `saveResult` is called from a
PIN-only device with no participant identity, so this must become
`v.optional(v.id("participants"))`. Before landing, grep for every reader
of `scores.submittedBy` (likely an admin dispute-resolution UI outside
`/manage`) to confirm it degrades gracefully (e.g. shows "Courtside
device") when absent.

**Also fix in the same PR** (adjacent, causally linked bug): `scores.resolve`
currently calls `leaderboard.recalculate` without passing
`prevScoreA`/`prevScoreB`, so resolving a dispute on a match that was
already once completed will double-count rather than undo-then-reapply.
This bug already exists today via the online `submit`/`resolve` path, but
offline conflict handling makes same-match double-writes routine, so it's
worth fixing alongside: capture the match's current score before patching
in `resolve` and pass it as `prevScoreA`/`prevScoreB`, same pattern
`saveResult` already uses.

**Auth error clarity**: wrap the "Invalid PIN" throw in
`requireOrgAdminOrPin` as a structured `ConvexError({ code: "pin_invalid" })`
so `offline-queue.ts`'s `isPinError(e)` check doesn't rely on string
matching.

### 6. UI additions

- Header badge (next to the existing Live/Completed pill in
  `$tournamentId.tsx`): amber "Offline — N pending" when `!isOnline`,
  "Syncing…" while draining.
- `MatchCell`: a 4th visual state (alongside Live/Final/Scheduled) for
  "pending sync" on cards with a queued `saveResult` op.
- `ManageRoundCard`: extend the existing "Finishing round…" auto-complete
  copy to also cover "queued, will sync when back online".
- Generate/Finish/Reset/Settings buttons: `disabled={!isOnline}` (additive
  to their existing disabled conditions) with an inline "Requires
  connection" caption.
- Blocking re-auth banner when `needsReauth` is true: explains the PIN may
  have changed, offers a button that clears the stored PIN and routes back
  to the existing `PinGate` — the outbox is untouched (keyed by
  `tournamentId`, not PIN) and resumes draining once a valid PIN is
  re-entered.

## Phasing (each independently mergeable, per this repo's branch→PR→merge workflow)

1. **App shell + read-only mirror** — `vite-plugin-pwa`, `src/sw.ts`,
   `register-sw.ts`, manifest fix, `idb-keyval` + `offline-store.ts`
   (mirror only), read-fallback wiring in the route and
   `ManageRoundCard`. Verify: DevTools offline, reload `/manage/:id`,
   confirm last-synced state renders.
2. **Offline score entry + round start/complete** (the core feature) —
   backend no-op/conflict changes, `offline-queue.ts`,
   `use-manage-actions.ts`, `manage-store.ts` (Zustand),
   `use-convex-connection-state.ts`, wiring into `MatchCell`/
   `ManageRoundCard`. Verify: DevTools offline, score several matches +
   trigger auto-complete, go back online, confirm correct replay and
   leaderboard state; reload mid-queue to confirm the outbox survives.
3. **Dispute UX + connectivity indicators + tests** — header badge,
   per-card pending state, blocking online-required styling, re-auth
   banner, any admin dispute-UI tolerance for `submittedBy: undefined`.
   Unit tests for `offline-queue.ts` (mock Convex client: FIFO order, halt
   on error, no-op handling, PIN-error halts without discarding). Manual
   two-device conflict verification: score the same match differently
   from two offline sessions, bring both online, confirm it lands in
   `disputed` rather than one overwriting the other.

## Verification

- `npx tsc --noEmit` and `npx vitest run` after each phase.
- Live verification in Chrome (real local Convex dev deployment, not
  mocks) using DevTools Network → Offline against a real test tournament
  for each phase's scenarios described above.
- Follow the existing git workflow: feature branch per phase, `npm run
  changelog`, PR via `gh pr create`, merge only with explicit user
  confirmation (Netlify auto-deploys `main`).

## Critical files

- `convex/scores.ts`, `convex/rounds.ts`, `convex/schema.ts`,
  `convex/lib/auth.ts`
- `src/routes/manage/$tournamentId.tsx`,
  `src/features/tournaments/manage-schedule.tsx`,
  `src/features/tournaments/match-cell.tsx`
- New: `src/features/manage/offline-store.ts`,
  `src/features/manage/offline-queue.ts`,
  `src/features/manage/use-manage-actions.ts`,
  `src/features/manage/manage-store.ts`,
  `src/lib/use-convex-connection-state.ts`,
  `src/lib/register-sw.ts`, `src/sw.ts`
- `vite.config.ts`, `public/manifest.json`, `netlify.toml`
- New dependencies: `zustand`, `idb-keyval`, `vite-plugin-pwa`
