# Padel Tournament App — Domain Glossary

## Core Roles

**Organiser**
Virgin Active staff member. Creates and manages tournaments. Enters scores, overrides disputes, configures venues. Single privileged role.

**Member**
Verified Virgin Active member with linked identity. Accumulates history and leaderboard stats across tournaments.

**Walk-in Participant**
Unverified participant. Enters tournament via QR scan on arrival. Gets tournament-scoped results only, no persistent history.

**Participant**
Either a Member or Walk-in Participant registered in a specific tournament. The playing unit within a tournament.

## Tournament Concepts

**Tournament**
A scheduled competition at a Virgin Active venue. Has a format, a court count, a registration window, and a lifecycle state. Created and owned by an Organiser.

**Format**
The ruleset governing how matches are generated and winners determined. One of: Americano, Mexicano, Knockout, Round Robin, King of the Court, Snakes and Ladders, Team Clash.

**Venue**
A Virgin Active club. Has a configurable court count used by the scheduling engine.

**Court**
A physical padel court at a Venue. Identified by number within a tournament.

**Registration**
The act of adding a Participant to a Tournament. Done by staff (direct add) or by Participant via QR self-check-in.

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
Ranked list of Participants within a Tournament by points/wins. Visible on the Kiosk Display.

**Member History**
Cumulative stats for a Member across all tournaments at a Venue or across all Venues.

**Points**
Tournament-scoped numeric value awarded per Match outcome. Calculation varies by Format.

## Display

**Kiosk Display**
A dedicated full-screen dashboard shown on a club TV/screen. Shows active matches, upcoming matches, and the current leaderboard in realtime. Not the member-facing app — a separate view optimised for large screens.
