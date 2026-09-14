# Round generation implementation plan

> Execute the approved prepare / compute / validated commit design on the existing PR #25 branch.

**Goal:** Move scheduling computation outside mutation execution limits without persisting stale or duplicate schedules.

**Architecture:** An internal query reads scheduling inputs and records the source documents. The public action computes the unchanged format algorithms. An internal mutation repeats preparation and authorization, compares a deterministic snapshot of the source documents, and atomically inserts the plan only if the snapshot still matches.

**Constraints:** Preserve current scheduling and team-pairing behavior and court-search limits. Keep queries/mutations in convex/rounds.ts; put shared preparation and computation helpers in convex/lib/roundGeneration.ts. Use npm, argument/return validators, existing admin/PIN permissions, and preserve unrelated generated-file edits.

- [x] Add failing action and stale-input regression tests in convex/rounds.test.ts. Exercise preparation, then an intervening edit, then commit; assert no partial schedule writes.
- [x] Extract typed preparation and source snapshots, split generate into prepareGeneration / generate / commitRoundPlans, and switch the two client hooks to useAction. Keep the insert transaction and return value intact.
- [x] Verify every supported format, next-round behavior, team pairing, concurrent commits, roster/court/score changes, revoked permissions, and PIN rotation. Run npx vitest run convex/rounds.test.ts during iteration.
- [x] Run all tests, app and Convex TypeScript checks, production build, independent review, and a real local Convex generation check for a previously timing-out player count.
- [x] Update runtime documentation and prepare the PR description and review response with the safeguards and verification evidence.

Publish the verified commit to PR #25 and post the prepared response to its implementation comment.
