# Padel Tournament App — Domain Glossary

## Core Roles

**Super Admin**
Platform operator. Provisions and manages organisations across the entire platform. Can create, list, and suspend organisations. Not affiliated with any single organisation.

**Tenant Admin**
Owner of an Organisation. Manages venues, invites and removes Organisers, configures org settings, and can suspend Members within their org. Does not run tournaments directly.

**Organiser**
Staff member within an Organisation. Creates and manages tournaments within assigned venues. Enters scores, overrides disputes. Cannot manage venues or org-level settings.

**Member**
A platform-wide user identity. Can participate in tournaments across any Organisation. Accumulates history and leaderboard stats across all tournaments. Cross-org history is visible only to the Member themselves.

**Walk-in Participant**
Unverified participant. Enters a specific tournament via QR scan on arrival. Gets tournament-scoped results only, no persistent history. Not a platform account holder.

**Participant**
Either a Member or Walk-in Participant registered in a specific tournament. The playing unit within a tournament.

## Organisation Concepts

**Organisation**
A tenant on the platform — a club, gym chain, or facility operator. Owns one or more Venues. Has its own Tenant Admin, Organisers, and tournament data fully isolated from other Organisations. Provisioned by the Super Admin.

**Organisation Status**
One of: Active, Suspended. Suspended organisations are locked out of the platform; their data is preserved.

**Organisation Slug**
A unique URL-safe identifier for the Organisation. Used in path-based routing: `/org/[slug]/...`.

## Tournament Concepts

**Tournament**
A scheduled competition at a Venue. Has a format, a court count, a registration window, and a lifecycle state. Created and owned by an Organiser. Scoped to one Organisation.

**Format**
The ruleset governing how matches are generated and winners determined. One of: Americano, Mexicano, Knockout, Round Robin, King of the Court, Snakes and Ladders, Team Clash.

**Venue**
A padel facility owned by an Organisation. Has a configurable court count used by the scheduling engine. Managed by the Tenant Admin.

**Court**
A physical padel court at a Venue. Identified by number within a tournament.

**Registration**
The act of adding a Participant to a Tournament. Done by the Organiser (direct add by Member search) or by a walk-in via QR self-check-in.

**Entry Type**
How Participants register — solo (system assigns partners) or as a pre-formed pair. Determined by Format: rotation formats (Americano, Mexicano, King of the Court) use solo entry; fixed formats (Knockout, Round Robin, Team Clash) use pair/team entry.

**Pair**
Two Participants playing together in a match. May be fixed for the tournament (fixed formats) or rotated per round (rotation formats).

**Team**
A named group of Pairs. Used in Team Clash format only.

## Match Concepts

**Round**
A set of simultaneous matches within a Tournament. All courts active at once per round.

**Match**
A single game between two Pairs on one Court in one Round. Has a score and a state.

**Score**
The result of a Match. Submitted by either Pair. Pending staff approval if disputed.

**Score Dispute**
When the two Pairs submit conflicting scores for the same Match. Resolved by Organiser override.

## Lifecycle

**Tournament State**
One of: Draft, Published, Registration Open, In Progress, Completed, Archived.

**Match State**
One of: Scheduled, In Progress, Score Pending, Completed, Disputed.

## Results

**Leaderboard**
Ranked list of Participants within a Tournament by points/wins. Visible on the Kiosk Display. Scoped to one Organisation — not visible across org boundaries.

**Member History**
Cumulative stats for a Member across all tournaments across all Organisations. Visible to the Member only — Organisers and Tenant Admins see only participation within their own Organisation.

**Points**
Tournament-scoped numeric value awarded per Match outcome. Calculation varies by Format.

## Display

**Kiosk Display**
A dedicated full-screen dashboard shown on a venue TV or screen. URL: `/org/[slug]/kiosk/[tournament_id]`. Publicly accessible — no auth required. Shows active matches, upcoming matches, and the current leaderboard in realtime. Castable to a TV via Chromecast or AirPlay tab casting without additional setup.
