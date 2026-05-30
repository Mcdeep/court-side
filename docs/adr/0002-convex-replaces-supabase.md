# ADR 0002: Convex replaces Supabase

## Status
Accepted — supersedes ADR 0001

## Context
ADR 0001 chose Supabase for relational data, auth, and realtime. Switched to Convex for simpler
TypeScript-first backend with built-in reactivity and no separate SQL migration layer.

## Decision
Replace Supabase with **Convex** for database, auth, and realtime.

## Rationale
- Convex: TypeScript schema, reactive queries, server functions (queries/mutations/actions) — no SQL
- Realtime built-in — no separate subscription setup needed for Kiosk Display
- Single backend SDK, no REST/Postgres client juggling
- Simpler local dev (no Docker, no Supabase CLI)

## Trade-offs
- No relational joins — bracket/round/match relations modelled via document refs + denormalisation
- Auth: use Convex Auth (built-in) or Clerk integration — anonymous walk-in needs custom token flow
- Smaller community than Supabase

## Consequences
- Data model uses Convex tables with `Id<"table">` references instead of SQL FKs
- Realtime via `useQuery` hook — no manual subscription wiring
- Playtomic sync (future) goes through a Convex Action (HTTP fetch) instead of a Supabase Edge Function
