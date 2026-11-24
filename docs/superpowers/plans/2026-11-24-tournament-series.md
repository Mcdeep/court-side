# Tournament Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins group tournaments into named series and view rankings and tournament lists for one series.

**Architecture:** New `series` table and optional `tournaments.seriesId`. Series rankings are computed live in `ratings.getRankings` from `ratingHistory` rows of the series' tournaments. The existing org-wide ranking path is untouched. UI adds series pickers to Settings, the new-tournament wizard, the edit modal, the tournaments list and the rankings page.

**Tech Stack:** Convex (convex-test + vitest), React, TanStack Router, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-24-tournament-series-design.md`

## Global Constraints

- Read `convex/_generated/ai/guidelines.md` before writing Convex code. Bounded queries (`.take(n)`), index names list all fields, no `.filter()` where an index works.
- Org-admin checks use `requireOrgAdmin(ctx, organizationId)` from `convex/lib/auth.ts`.
- The "All tournaments" ranking (no `seriesId`) must behave exactly as today.
- `members.startingPoints` is never read for series rankings.
- Series names: trimmed, non-empty, unique per org case-insensitively.
- A tournament has at most one series; `seriesId` is optional.
- Run `npm run fmt` and `npm run lint` before each commit (pre-commit hook enforces it).
- Work on branch `docs/tournament-series-design` (already holds the spec). Don't push.

## Review Focus

- **A member linked to an account part-way through the series.** Their earlier `ratingHistory` rows carry `memberId`, later ones `userId`. They must appear once in the series ranking with points summed, not twice. Test: Task 3 `merges member and linked-user rows`.
- **A series or tournament from another org passed by id.** `create`/`update`/`setSeries` must reject a `seriesId` whose `organizationId` differs from the tournament's. Test: Task 2 `rejects series from another org`.
- **Clearing a tournament's series in the edit modal.** `update` currently drops `undefined` fields, so "None" must be sent as `null` and stored as unset. Test: Task 2 `update clears seriesId with null`.
- **More than 50 tournaments.** `listWithDetails` takes 50. Filtering by series must happen server-side via the index, so the Tuesday view isn't truncated by other tournaments. Test: Task 2 `listWithDetails filters by series`.
- **Deleting a series that tournaments use.** Tournaments must lose `seriesId` and keep everything else, including ratings. Test: Task 1 `remove clears seriesId on tournaments`.

---

### Task 1: `series` table and CRUD

**Files:**
- Modify: `convex/schema.ts` (new table; `seriesId` + index on `tournaments`)
- Create: `convex/series.ts`
- Test: `convex/series.test.ts`

**Interfaces:**
- Produces:
  - Table `series`: `{ organizationId: Id<"organizations">, name: string }`, index `by_organization` `["organizationId"]`.
  - `tournaments.seriesId: v.optional(v.id("series"))`, index `by_organization_and_seriesId` `["organizationId", "seriesId"]`.
  - `api.series.list({ organizationId }) => Doc<"series">[]` sorted by name (take 100, no auth, same as `ratings.getRankings`).
  - `api.series.create({ organizationId, name }) => Id<"series">`
  - `api.series.rename({ seriesId, name }) => null`
  - `api.series.remove({ seriesId }) => null`
  - Helper in `convex/series.ts`: `export async function requireSeriesInOrg(ctx: QueryCtx | MutationCtx, seriesId: Id<"series">, organizationId: Id<"organizations">): Promise<Doc<"series">>`. Throws `"Series not found"` if the series is missing or belongs to another org.

- [ ] **Step 1: Write failing tests** in `convex/series.test.ts`, using the same setup pattern as `convex/standings.test.ts` (org + venue + organizer identity `{ tokenIdentifier: "organizer", org_id: "club", org_role: "org:admin" }`, plus an `organizer` row in `users`):
  - `create and list`: create "Tuesday Americano" and "Summer League". `list` returns names `["Summer League", "Tuesday Americano"]`.
  - `create trims and rejects blank or duplicate`: `"  Tuesday  "` is stored as `"Tuesday"`. `"   "` throws `/name/i`. `"tuesday"` after `"Tuesday"` throws `/already exists/i`.
  - `rename`: rename updates the name. Renaming to another existing series' name throws `/already exists/i`. Renaming to its own name in different case is allowed.
  - `remove clears seriesId on tournaments`: insert two tournaments with `seriesId` and a `ratingHistory` row for one of them. After `remove`, both tournaments have `seriesId === undefined`, the `ratingHistory` row still exists, and the series doc is gone.
  - `requires org admin`: an identity with `org_id: "other"` calling `create` throws.
- [ ] **Step 2: Run** `npx vitest run convex/series.test.ts`. Expected: FAIL (module/table missing).
- [ ] **Step 3: Add the schema changes and implement `convex/series.ts`.** `remove` reads tournaments via `by_organization_and_seriesId` (`take(500)`) and patches `seriesId: undefined`.
- [ ] **Step 4: Run** `npx vitest run convex/series.test.ts`. Expected: PASS. Also run `npx vitest run` to confirm the schema change broke nothing.
- [ ] **Step 5: Commit** `Add tournament series table and CRUD`.

### Task 2: Tournament ↔ series wiring

**Files:**
- Modify: `convex/tournaments.ts` (`create`, `update`, `duplicate`, `listWithDetails`, new `setSeries`)
- Test: `convex/series.test.ts` (append)

**Interfaces:**
- Consumes: `requireSeriesInOrg` (Task 1).
- Produces:
  - `tournaments.create` args: `seriesId: v.optional(v.id("series"))`.
  - `tournaments.update` args: `seriesId: v.optional(v.union(v.id("series"), v.null()))`. `null` means unset: patch `seriesId: undefined` explicitly, because the existing undefined-filter would drop it.
  - `tournaments.duplicate` copies `seriesId`.
  - `api.tournaments.setSeries({ organizationId, tournamentIds: Id<"tournaments">[], seriesId: Id<"series"> | null }) => null`. At most 100 ids. Every tournament must belong to `organizationId`, otherwise throw `"Tournament not found"`.
  - `tournaments.listWithDetails` args gain `seriesId: v.optional(v.id("series"))`. When given, query `by_organization_and_seriesId`. Otherwise keep `by_organization`. Both are `.order("desc").take(50)`.

- [ ] **Step 1: Write failing tests:**
  - `create with seriesId stores it`. `rejects series from another org`: a series inserted under a second org, passed to `create`, `update` and `setSeries`, throws `/series not found/i` each time.
  - `update clears seriesId with null`: set a series, then `update({ seriesId: null })` and the doc has `seriesId === undefined`. Also check that `update` without `seriesId` leaves it unchanged.
  - `duplicate copies seriesId`.
  - `setSeries assigns and clears in bulk`: three tournaments, assign two, then clear one.
  - `listWithDetails filters by series`: three tournaments, two in series S. With `{ seriesId: S }` it returns exactly those two. With no `seriesId` it returns all three.
- [ ] **Step 2: Run** `npx vitest run convex/series.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the arg and handler changes above.
- [ ] **Step 4: Run** `npx vitest run`. Expected: all PASS.
- [ ] **Step 5: Commit** `Let tournaments belong to a series`.

### Task 3: Series rankings

**Files:**
- Modify: `convex/ratings.ts` (`getRankings`)
- Test: `convex/series.test.ts` (append)

**Interfaces:**
- Consumes: index `tournaments.by_organization_and_seriesId`, `ratingHistory.by_tournament`.
- Produces: `api.ratings.getRankings({ organizationId, seriesId?: Id<"series"> })`, with the same row shape as today: `{ _id: string, name: string, email: string, totalPoints: number, tournamentsPlayed: number }[]` sorted by `totalPoints` desc.

Series branch algorithm (when `seriesId` given):
1. Tournaments in the series: `by_organization_and_seriesId`, `take(500)`.
2. For each, `ratingHistory` via `by_tournament`, `take(200)`.
3. Resolve each row to a player key. If `userId` is set, use it. Otherwise load the member (cache by id); if `member.userId` is set, use that userId, otherwise use the memberId.
4. Group by key: sum `pointsEarned`, count distinct `tournamentId`.
5. Name/email: for a userId key, use `user.name`/`user.email`, falling back to the member name. For a memberId key, use `member.name` and `""`. `_id` is the key string.
6. Sort by `totalPoints` desc.

- [ ] **Step 1: Write failing tests.** Insert `ratingHistory` rows directly with `t.run`; there's no need to play matches.
  - `series ranking sums only that series`: tournaments T1, T2 in series S and T3 with no series. Player P has 10 (T1), 6 (T2), 8 (T3). P's series row is `totalPoints: 16, tournamentsPlayed: 2`.
  - `series ranking ignores startingPoints`: an unlinked member with `startingPoints: 50` and one series award of 4 shows `totalPoints: 4`. A member with no series awards is absent.
  - `merges member and linked-user rows`: member M with `userId: U`, a T1 row with `memberId: M` (4 pts) and a T2 row with `userId: U` (6 pts) give exactly one row: `totalPoints: 10, tournamentsPlayed: 2`.
  - `no seriesId keeps existing behaviour`: given the same data, the result equals what `getRankings` returned before. Assert that the startingPoints member appears with 50.
- [ ] **Step 2: Run** `npx vitest run convex/series.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the series branch as a separate helper (`getSeriesRankings(ctx, organizationId, seriesId)`) and return early. Leave the existing body untouched.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** `Compute rankings per series`.

### Task 4: Manage series in Settings

**Files:**
- Modify: `src/routes/$slug/settings.tsx` (new `SeriesSection` between General and Danger zone)

**Interfaces:**
- Consumes: `api.series.list/create/rename/remove`.

- [ ] **Step 1: Add `SeriesSection({ org })`** using the file's existing `Section`/`Field` components, `Input`, `Button` and `useAsyncAction`. The description reads "Group recurring tournaments, like a weekly Tuesday Americano, to rank them on their own." It lists the series, each with an inline rename (pencil → input + Save/Cancel) and a delete with inline confirm (same pattern as `DangerSection`). The confirm copy reads "Tournaments in this series keep their results but won't belong to a series." Below the list are an "Add series" input and button. Show mutation errors in `text-red-500 text-sm`.
- [ ] **Step 2: Verify** with `npx tsc --noEmit` (no errors) and `npm run lint`. Then run the app (`npx convex dev` + `npm run dev`) and add, rename and delete a series on `/<slug>/settings`.
- [ ] **Step 3: Commit** `Add series management to settings`.

### Task 5: Series picker on create and edit

**Files:**
- Modify: `src/routes/$slug/tournaments/new.tsx` (`StepFormat` "Basics" card; wizard data and the `createTournament` call near line 1275)
- Modify: `src/features/tournaments/edit-tournament-modal.tsx`
- Create: `src/features/tournaments/series-select.tsx`

**Interfaces:**
- Produces: `SeriesSelect({ organizationId, value, onChange, className? })` with `value: Id<"series"> | ""` (`""` = None). It renders a `<select>` with "None", each series, and "New series…". Choosing "New series…" opens a `window.prompt`-free inline input: a text input + Add button replacing the select. On Add it calls `api.series.create` and selects the new id. If the org has no series, the select shows only "None" and "New series…".

- [ ] **Step 1: Create `SeriesSelect`.**
- [ ] **Step 2: Wizard.** Add `seriesId: string` (default `""`) to the wizard data. Render a "Series" label + `SeriesSelect` in the Basics grid after Venue, using the same label markup. Pass `seriesId: data.seriesId || undefined` to `createTournament`.
- [ ] **Step 3: Edit modal.** Add a `Field label="Series"` after Name, initialised from `tournament.seriesId ?? ""`. Send `seriesId` in `update` only when changed: the id, or `null` when changed to None.
- [ ] **Step 4: Verify** with `npx tsc --noEmit`, `npm run lint` and `npx vitest run`. Then in the app: create a tournament with a series, edit it to another series, then to None, and check each state in the Convex dashboard or on the list (Task 6).
- [ ] **Step 5: Commit** `Pick a series when creating or editing a tournament`.

### Task 6: Tournaments list: filter, label, bulk assign

**Files:**
- Modify: `src/routes/$slug/tournaments/index.tsx`

**Interfaces:**
- Consumes: `api.series.list`, `api.tournaments.listWithDetails({ organizationId, seriesId? })`, `api.tournaments.setSeries`.

- [ ] **Step 1: Filter.** Add a series `<select>` ("All series" + each series) next to the `SegTabs`. Hide it when the org has no series. Pass the selected `seriesId` to `listWithDetails`.
- [ ] **Step 2: Label.** Under each row's name/date line, show the series name (looked up from `series.list`) as a small `text-ink-mute` chip when set.
- [ ] **Step 3: Bulk assign.** Add a "Select" toggle button to the filter row. In select mode each row shows a checkbox and clicking a row toggles it instead of navigating. A bar appears showing "N selected", a series `<select>` (including "No series") and an "Assign" button that calls `setSeries` and then exits select mode. Hide "Select" when the org has no series.
- [ ] **Step 4: Verify** with `npx tsc --noEmit` and `npm run lint`. In the app, bulk-assign 3 completed tournaments, filter by the series to see exactly those, then clear one.
- [ ] **Step 5: Commit** `Filter and bulk-assign tournaments by series`.

### Task 7: Rankings page series picker

**Files:**
- Modify: `src/routes/$slug/rankings.tsx`

**Interfaces:**
- Consumes: `api.series.list`, `api.ratings.getRankings({ organizationId, seriesId? })`.

- [ ] **Step 1: URL state.** Add `validateSearch: (s) => ({ series: typeof s.series === "string" ? s.series : undefined })` to the route. Read it with `Route.useSearch()` and update it with `navigate({ search: { series } })`. If the param isn't a series in `series.list`, treat it as All.
- [ ] **Step 2: Picker.** Add a `<select>` in the header before "Point Tiers": "All tournaments" + each series. Hide it when the org has no series. Pass `seriesId` to `getRankings`.
- [ ] **Step 3: Copy.** The table heading reads `All-time Rankings` for All and `{series.name} Rankings` otherwise. The empty state for a series reads "No completed tournaments in this series yet."
- [ ] **Step 4: Verify** with `npx tsc --noEmit`, `npm run lint` and `npx vitest run`. In the app, switch to the series and check the totals match the awards in its tournaments. Reload to check the choice survives, and switch back to All to check it's unchanged.
- [ ] **Step 5: Commit** `Filter rankings by series`.
