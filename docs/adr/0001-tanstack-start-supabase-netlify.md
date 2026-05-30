# ADR 0001: TanStack Start + Supabase + Netlify

## Status
Accepted

## Context
Need a full-stack PWA for a padel tournament management app. Requirements:
- Staff dashboard (desktop)
- Member-facing PWA (mobile, QR scanning)
- Kiosk display (realtime, large screen)
- Realtime score updates across all three surfaces
- Auth with two modes: linked member identity + anonymous walk-in
- Relational data (tournaments, rounds, matches, players have clear FK relationships)

## Decision
**TanStack Start** for the application framework, **Supabase** for database/auth/realtime, **Netlify** for hosting and edge functions.

## Rationale
- TanStack Start: full-stack React with file-based routing, server functions, TanStack Query built-in. No separate API layer needed.
- Supabase: Postgres fits relational tournament bracket logic. Built-in auth supports both verified members and anonymous walk-ins. Realtime subscriptions power the Kiosk Display without polling.
- Netlify: deploys TanStack Start via edge functions, CDN for PWA assets, simple CI/CD.

## Alternatives Considered
- Next.js + Supabase: mature but heavier. TanStack Start chosen for tighter TanStack Query integration.
- Firebase: NoSQL makes bracket/round/match relational queries harder.
- Next.js + Firebase: rejected for same NoSQL reason.

## Consequences
- TanStack Start is relatively new — smaller community, fewer examples.
- Supabase realtime has connection limits on free tier — monitor for large tournaments.
- Playtomic integration (future) will need a Supabase Edge Function or server function to sync member data.
