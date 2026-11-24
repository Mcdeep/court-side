# Tournament series — design

## Intent

An organisation runs a recurring weekly tournament (e.g. every Tuesday) but
also uses the app for other one-off or other-day tournaments. Today rankings
are org-wide only, so there is no way to see "who's top of Tuesday nights".
Admins need to group tournaments into a named **series** and view rankings
for just that series.

Longer term, more stats (records, streaks, partnerships, etc.) will be added,
and each should be filterable by series. This feature lays that foundation;
it does not add any new stats.

## Goals

- Admins can create, rename and delete named series per organisation.
- A tournament belongs to at most one series (optional).
- Rankings page can be filtered to a single series; default is "All tournaments".
- Tournaments list can be filtered by series.
- Existing (past) tournaments can be assigned to a series quickly.

## Non-goals

- New statistics of any kind.
- Per-series point tiers — tiers stay org-wide (and are already snapshotted
  per tournament in `awardedRatingTiers`).
- Imported `members.startingPoints` in series views (see below).
- Series filter on per-player history (`getPlayerHistory`) or the Players page.

## Anti-goals

- A second running-total ranking per series that has to be kept in sync with
  `playerRatings`. Every future stat would then need its own per-series
  counter.
- The "All tournaments" ranking changing behaviour in any way.

## Approaches considered

- **A. `series` table + optional `seriesId` on tournaments; series rankings
  derived from `ratingHistory`** — **chosen.** Single source of truth for the
  name, rename is one edit, and any future stat computed from per-tournament
  data can filter by series the same way.
- B. Free-text label on the tournament. Slightly less work, but typos create
  accidental separate series and renames touch every tournament.
- C. Precomputed per-series totals updated in `awardRatings`. Faster reads,
  but duplicates the running-total logic and every future stat would need its
  own per-series store. Rejected (anti-goal above).

## Design

### Data model

- New table `series`: `organizationId`, `name`. Index `by_organization`.
- `tournaments.seriesId: v.optional(v.id("series"))`, plus index
  `by_organization_and_series` on `["organizationId", "seriesId"]`.

### Backend

- `series.list({ organizationId })`, `series.create`, `series.rename`,
  `series.remove` — mutations require org admin. Names unique per org
  (case-insensitive, trimmed).
- Deleting a series clears `seriesId` on its tournaments (tournaments and
  their ratings are untouched; they just fall back to "no series").
- `tournaments.create` / `tournaments.update` accept optional `seriesId`
  (validate it belongs to the same org). `update` allows clearing it.
- `tournaments.duplicate` copies `seriesId` — duplicating last Tuesday's
  tournament is the natural way to set up this Tuesday's.
- `tournaments.setSeries({ tournamentIds, seriesId | null })` for bulk
  assignment (admin, all tournaments must belong to the org).
- `ratings.getRankings` gains optional `seriesId`:
  - Omitted → current behaviour, unchanged.
  - Given → load the series' tournaments via the new index, load each one's
    `ratingHistory` rows (`by_tournament`), group by `userId` / `memberId`,
    sum `pointsEarned` and count tournaments. Same return shape as today
    (`_id`, `name`, `email`, `totalPoints`, `tournamentsPlayed`), sorted by
    points. Only players with at least one award in the series appear.
    `startingPoints` is ignored.
  - Expected scale: ~50 tournaments/year × ~16–24 players — fine to compute
    live in a query.
- Note for whoever implements: `members.startingPoints` is not only imported
  history — it is also the running total for unlinked members (see
  `ratings.awardRatings`). Series rankings sidestep that by reading
  `ratingHistory`, which has a row for both linked (`userId`) and unlinked
  (`memberId`) players.

### Frontend

- **Rankings page** (`src/routes/$slug/rankings.tsx`): series picker in the
  header ("All tournaments" + each series). Table heading reflects the choice
  ("All-time Rankings" vs "<Series name> Rankings"). Hide the picker if the
  org has no series.
- **Tournaments list** (`src/routes/$slug/tournaments/index.tsx`): series
  filter alongside the existing status filter; show the series name on each
  row. Row selection + "Assign to series" action for bulk assignment.
- **New / edit tournament modals**: optional "Series" select, including
  "None".
- **Managing series**: a "Series" section on the org settings page
  (`src/routes/$slug/settings.tsx`) to create, rename and delete. The series
  select in the tournament modals may also offer "New series…" inline.

## Left to the builder

- Exact UI for the pickers and bulk selection, following existing styles.
- Whether the series picker selection on Rankings persists in the URL
  (search param) — preferred, so a Tuesday ranking link can be shared.
- Tests: `getRankings` with `seriesId` (linked + unlinked players, ties,
  tournaments outside the series excluded), series delete clearing
  `seriesId`, cross-org validation.
