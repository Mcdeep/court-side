# Padel Tournament App — Plan of Action

## Product Summary

A multitenant SaaS platform for padel tournament management. Organisations (clubs, gym chains) each own their venues and run tournaments. Organisers manage tournaments, Members play across any organisation, and walk-ins join via QR. A kiosk screen at each venue shows live match assignments and leaderboards. Seven tournament formats supported.

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start |
| Database / Realtime | Convex |
| Auth | Clerk |
| Hosting | Netlify |
| Styling | TailwindCSS |
| Forms | TanStack Form |
| State / Data fetching | TanStack Query (built-in) |

## Surfaces

1. **Super Admin Panel** — platform operator only, manage organisations
2. **Tenant Admin Dashboard** — per-org, manage venues, staff, and org settings
3. **Organiser Dashboard** — desktop web, full tournament management within a venue
4. **Member PWA** — mobile-optimised, match schedule, score entry, cross-org history
5. **Kiosk Display** — fullscreen TV view, realtime, read-only, no auth, castable via Chromecast/AirPlay

## URL Structure

```
/admin/...                           ← Super Admin (platform-wide)
/org/[slug]/dashboard                ← Tenant Admin
/org/[slug]/tournaments/...          ← Organiser
/org/[slug]/kiosk/[tournament_id]    ← Kiosk (public, no auth)
/profile                             ← Member (cross-org history)
```

---

## Phase 1 — Foundation

### 1.1 Project Setup
- [ ] Scaffold TanStack Start project
- [ ] Configure Convex project (dev + prod)
- [ ] Connect Netlify deployment pipeline
- [ ] Set up TailwindCSS
- [ ] Define environment variables and secrets

### 1.2 Auth (Clerk)
- [ ] Clerk integration — email/password + social OAuth for all platform users
- [ ] Clerk organisation provisioning for tenants (Super Admin creates org via Clerk API)
- [ ] Anonymous auth for walk-in participants (QR-triggered, short-lived token)
- [ ] Role-based access: `super_admin` | `tenant_admin` | `organiser` | `member` | `walk_in`
- [ ] Org context middleware — every request scoped to the active org via Clerk JWT claims

### 1.3 Core Data Model
```
organizations    (id, clerkOrgId, name, slug, status)
users            (id, clerkUserId, name, email)
venues           (id, organizationId, name, court_count)
tournaments      (id, organizationId, venueId, name, format, state, starts_at, ends_at)
participants     (id, tournamentId, userId, entry_type, team_id?)
pairs            (id, tournamentId, participant_a_id, participant_b_id)
teams            (id, tournamentId, name)
rounds           (id, tournamentId, round_number, state)
matches          (id, roundId, court_number, pair_a_id, pair_b_id, state)
scores           (id, matchId, submitted_by, score_a, score_b, state)
leaderboard      (id, tournamentId, participantId, points, wins, losses)
```

---

## Phase 2 — Tournament Formats

Each format implements two functions:
- `generateRounds(tournament, participants) → Round[]`
- `calculatePoints(match, score) → PointsDelta`

### Format Implementations

| Format | Entry Type | Partner Rotation | Rounds Logic |
|---|---|---|---|
| Americano | Solo | Every round | All players rotate, points accumulate individually |
| Mexicano | Solo | Based on ranking | Partners assigned by current standing each round |
| Knockout | Pair | Fixed | Single elimination bracket |
| Round Robin | Pair | Fixed | All pairs play each other, points total |
| King of the Court | Solo | Winners stay | Winning pair stays on court, losers rotate out |
| Snakes and Ladders | Pair | Fixed | Round robin + promotion/relegation between courts |
| Team Clash | Team (pairs) | Fixed | Two teams, pairs matched cross-team, team points total |

### Phase 2 Deliverables
- [ ] Format engine interface (shared contract)
- [ ] Americano engine
- [ ] Mexicano engine
- [ ] Knockout bracket generator
- [ ] Round Robin scheduler
- [ ] King of the Court rotation logic
- [ ] Snakes and Ladders court promotion logic
- [ ] Team Clash team points aggregation

---

## Phase 3 — Super Admin Panel

- [ ] Create organisation (name, slug, Tenant Admin email — triggers Clerk org + invite)
- [ ] List all organisations with status
- [ ] Suspend / reactivate an organisation

---

## Phase 4 — Tenant Admin Dashboard

- [ ] Venue management (create venue, set court count)
- [ ] Invite and remove Organisers
- [ ] Org settings (name, slug, logo)
- [ ] Suspend a Member from the org

---

## Phase 5 — Organiser Dashboard

- [ ] Tournament CRUD (create, configure format, set dates, assign venue)
- [ ] Participant management (add member by search, generate QR code for walk-in)
- [ ] Tournament state machine controls (Publish, Open Registration, Start, Complete)
- [ ] Manual score entry and score dispute resolution
- [ ] View leaderboard per tournament

---

## Phase 6 — Member PWA

- [ ] Login / register as platform user (Clerk)
- [ ] QR scan check-in flow (walk-in → linked to tournament)
- [ ] View my upcoming matches (court, time, opponent)
- [ ] Submit match score
- [ ] View tournament leaderboard
- [ ] View personal history across all organisations (player profile)
- [ ] PWA manifest + service worker (installable, offline-capable schedule view)

---

## Phase 7 — Kiosk Display

- [ ] Dedicated `/org/[slug]/kiosk/[tournament_id]` route — public, no auth
- [ ] Fullscreen layout optimised for TV (large text, high contrast)
- [ ] Realtime panels:
  - Active matches: court number, pair names, score if live
  - Up next: next round matches queued
  - Leaderboard: top N with points
- [ ] Convex reactive queries on `matches`, `scores`, `leaderboard`
- [ ] Auto-rotate panels on a timer if single screen
- [ ] Chromecast / AirPlay casting support (tab casting works out of the box; native Cast SDK as enhancement)

---

## Phase 8 — Polish & Production

- [ ] Convex query-level org isolation enforcement (all queries assert org membership)
- [ ] Audit log for score changes
- [ ] QR code generation for tournaments and individual walk-in registration
- [ ] Export results (PDF/CSV) per tournament
- [ ] Basic analytics: participation rates, popular formats per org

---

## Future / Out of Scope for v1

- Playtomic integration for member sync and registration
- Per-tenant billing / subscription management
- WhatsApp/SMS notifications
- Automated court booking integration
- Prize/voucher management
- Head-to-head stats between members
- Subdomain-based tenant routing (white-label)

---

## Key Decisions

See `docs/adr/` for rationale on major technical choices.

- [ADR 0001](docs/adr/0001-tanstack-start-supabase-netlify.md) — Stack selection
- [ADR 0002](docs/adr/0002-convex-replaces-supabase.md) — Convex replaces Supabase
