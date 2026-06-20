# CourtOS

A multitenant padel tournament management platform. Organisers create tournaments, manage players, run matches across 6 formats, and display live scores on a kiosk screen.

## Features

**Tournament formats**
- **Americano** — all rounds pre-generated, circle rotation pairing
- **Round Robin** — fixed pairs, all rounds upfront
- **Mexicano** — one round at a time, paired by current leaderboard ranking
- **Knockout** — single elimination bracket, winners advance
- **King of the Court** — winners stay on court, queue sorted by wait time
- **Snakes & Ladders** — winners move up court, losers move down; only court 1 scores points

**Organiser dashboard** (`/:slug`)
- Tournament CRUD, round controls (start/end), score tracking
- Player management — registered members and walk-ins
- Venue and court management
- Organisation settings with suspend/reactivate

**Kiosk display** (`/kiosk/:tournamentId`)
- Fullscreen dark UI for TVs/projectors
- Live court scores and ranked standings
- Auto-rotates panels on narrow screens
- Realtime updates via Convex subscriptions

**Super Admin** (`/admin`)
- List all organisations with stats
- Create and suspend organisations

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Start, TanStack Router (file-based) |
| Styling | Tailwind CSS 4 |
| Backend | [Convex](https://convex.dev) (realtime database, server functions) |
| Auth | [Clerk](https://clerk.com) (organisations + users) |
| Hosting | Netlify |
| Icons | Lucide React |

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Environment variables

Create a `.env.local` file:

```
CONVEX_DEPLOYMENT=<your convex deployment>
VITE_CONVEX_URL=<your convex url>
VITE_CLERK_PUBLISHABLE_KEY=<your clerk publishable key>
```

### Install and run

```bash
npm install
```

You need two terminals — one for the Convex backend, one for the Vite frontend:

```bash
# Terminal 1: Convex dev server (port 3210)
npx convex dev

# Terminal 2: Vite dev server (port 3000)
npm run dev
```

Or run both at once with [zellij](https://zellij.dev):

```bash
npm run dev:zellij
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Seed data

```bash
npx convex run seed:seed
```

## Project structure

```
src/
  routes/
    __root.tsx            # App shell and layout
    index.tsx             # Landing / home
    admin.tsx             # Super admin panel
    $slug.tsx             # Org layout (sidebar + nav)
    $slug/
      tournaments/        # Tournament list + detail
      players.tsx         # Player management
      courts.tsx          # Venue and court management
      settings.tsx        # Org settings
    kiosk/
      $tournamentId.tsx   # Fullscreen kiosk display

convex/
  schema.ts               # Database schema
  tournaments.ts          # Tournament queries + mutations
  rounds.ts               # Round generation + state
  matches.ts              # Match management
  scores.ts               # Score submission + disputes
  leaderboard.ts          # Leaderboard calculation
  participants.ts         # Player registration
  organizations.ts        # Org CRUD + admin
  venues.ts               # Venue + court management
  users.ts                # User sync
  seed.ts                 # Development seed data
  formats/                # Format-specific round generation engines
    americano.ts
    round_robin.ts
    mexicano.ts
    knockout.ts
    king_of_the_court.ts
    snakes_and_ladders.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npx convex dev` | Start Convex dev server on port 3210 |
| `npm run dev:zellij` | Start both servers in a zellij layout |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |

## Deployment

Configured for Netlify. Push to GitHub and import at [app.netlify.com](https://app.netlify.com). The `netlify.toml` handles build settings. Add your environment variables in Netlify's site settings.

## License

Private.
