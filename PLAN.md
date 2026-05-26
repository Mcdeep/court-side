# Padel Tournament App — Plan of Action

## Product Summary

Virgin Active staff manage padel tournaments across clubs. Members and walk-ins participate. A kiosk screen at each club shows live match assignments and leaderboards. Seven tournament formats supported.

## Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start |
| Database / Auth / Realtime | Supabase |
| Hosting | Netlify |
| Styling | TailwindCSS |
| Forms | TanStack Form |
| State / Data fetching | TanStack Query (built-in) |

## Surfaces

1. **Staff Dashboard** — desktop web, full tournament management
2. **Member PWA** — mobile-optimised, QR check-in, match schedule, score entry
3. **Kiosk Display** — fullscreen TV view, realtime, read-only, no auth

---

## Phase 1 — Foundation

### 1.1 Project Setup
- [ ] Scaffold TanStack Start project
- [ ] Configure Supabase project (dev + prod)
- [ ] Connect Netlify deployment pipeline
- [ ] Set up TailwindCSS
- [ ] Define environment variables and secrets

### 1.2 Auth
- [ ] Supabase Auth — email/password for staff
- [ ] Anonymous auth for walk-in participants (QR-triggered)
- [ ] Member auth — email login linked to Virgin Active membership ID
- [ ] Role-based access: `organiser` | `member` | `walk_in`

### 1.3 Core Data Model
```
venues           (id, name, court_count)
tournaments      (id, venue_id, name, format, state, starts_at, ends_at)
participants     (id, tournament_id, user_id, entry_type, team_id?)
pairs            (id, tournament_id, participant_a_id, participant_b_id)
teams            (id, tournament_id, name)
rounds           (id, tournament_id, round_number, state)
matches          (id, round_id, court_number, pair_a_id, pair_b_id, state)
scores           (id, match_id, submitted_by, score_a, score_b, state)
leaderboard      (id, tournament_id, participant_id, points, wins, losses)
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

## Phase 3 — Staff Dashboard

- [ ] Venue management (create venue, set court count)
- [ ] Tournament CRUD (create, configure format, set dates)
- [ ] Participant management (add member, generate QR code for walk-in)
- [ ] Tournament state machine controls (Publish, Open Registration, Start, Complete)
- [ ] Manual score entry and score dispute resolution
- [ ] View leaderboard per tournament

---

## Phase 4 — Member PWA

- [ ] Login / register as member
- [ ] QR scan check-in flow (anonymous → linked to tournament)
- [ ] View my upcoming matches (court, time, opponent)
- [ ] Submit match score
- [ ] View tournament leaderboard
- [ ] View personal history across tournaments (members only)
- [ ] PWA manifest + service worker (installable, offline-capable schedule view)

---

## Phase 5 — Kiosk Display

- [ ] Dedicated `/kiosk/:tournament_id` route — no auth required
- [ ] Fullscreen layout optimised for TV (large text, high contrast)
- [ ] Realtime panels:
  - Active matches: court number, pair names, score if live
  - Up next: next round matches queued
  - Leaderboard: top N with points
- [ ] Supabase realtime subscriptions on `matches`, `scores`, `leaderboard`
- [ ] Auto-rotate panels on a timer if single screen

---

## Phase 6 — Polish & Production

- [ ] Row-level security on all Supabase tables
- [ ] Audit log for score changes
- [ ] Multi-venue support (Organiser scoped to one or many venues)
- [ ] QR code generation for tournaments and individual walk-in registration
- [ ] Export results (PDF/CSV) per tournament
- [ ] Basic analytics: participation rates, popular formats

---

## Future / Out of Scope for v1

- Playtomic integration for member sync and registration
- WhatsApp/SMS notifications
- Automated court booking integration
- Prize/voucher management
- Head-to-head stats between members

---

## Key Decisions

See `docs/adr/` for rationale on major technical choices.

- [ADR 0001](docs/adr/0001-tanstack-start-supabase-netlify.md) — Stack selection
