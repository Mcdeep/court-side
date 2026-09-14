# Double Americano

Double Americano is an optional Americano variant for exactly 16 players. It splits the roster into two groups of eight, runs the existing eight-player Americano schedule in each group, then adds four crossover finals. Every player plays seven group games and one final.

## Group selection

Organisers select a split method and review the groups before generating the schedule:

- **Random:** shuffle all 16 players into two groups of eight; ratings are optional.
- **Top/bottom halves:** the eight highest-rated players enter Group 1 and the remaining eight enter Group 2. Equal ratings are randomly ordered.
- **Balanced:** choose two groups of eight with the smallest possible difference in total skill rating. This checks all equal-sized partitions, rather than relying on a draft heuristic. Exact equality is used when possible.

Rated splits require every player to have a finite skill rating from 1 to 7. Ratings come from the current organisation player rating for linked members, the current member rating for unlinked members, or the participant rating for legacy walk-ins. Accumulated tournament points are not skill ratings.

Organisers can swap one player from each group before generating. The displayed totals let them review the effect of a manual change. Assignments lock once rounds exist; changes to the roster require a valid eight/eight assignment before generation.

## Courts and scheduling

| Available courts | Group phase | Finals |
| --- | --- | --- |
| 2 | 14 waves, one court per group | 2 waves |
| 3 | 14 waves, one court per group | 2 waves using all three courts |
| 4 or more | 7 rounds, two courts per group | 1 round using four courts |

At least two courts are required. With four courts Group 1 uses courts 1-2 in the first round and courts 3-4 in the next, alternating throughout the group phase. Group 2 takes the opposite courts. With two or three courts, groups swap courts 1 and 2 after both waves of each partnership round, so every player follows the same rotation. Additional courts are unused. The group phase calls the existing Americano generator twice; it preserves each player's seven distinct partners and two meetings against every other group member.

## Standings and crossover finals

Each group has independent standings using the tournament's configured ranking order, including its selected first criterion. Players still tied after all four criteria receive a random seed order when finals are generated.

Finals can be generated only after every group round is completed and every group match has a recorded result:

| Final | Pair A | Pair B | Shared placements |
| --- | --- | --- | --- |
| 1 | Group 1 #1 + Group 2 #2 | Group 2 #1 + Group 1 #2 | 1st / 2nd |
| 2 | Group 1 #3 + Group 2 #4 | Group 2 #3 + Group 1 #4 | 3rd / 4th |
| 3 | Group 1 #5 + Group 2 #6 | Group 2 #5 + Group 1 #6 | 5th / 6th |
| 4 | Group 1 #7 + Group 2 #8 | Group 2 #7 + Group 1 #8 | 7th / 8th |

The final number is stored independently of its physical court, so placements are unchanged when finals span multiple waves. Finals use the tournament's scoring settings and require a winner. Final scores never contribute to group points, wins, losses, point difference or games played.

Group results and ranking settings lock while finals exist. Before the tournament is finished, an organiser can reset just the finals and their scores, correct group results, then generate finals again. Group rounds and results are retained. Final scores can be corrected through the existing score editor, including after completion.

Completion requires all final rounds to be completed and all four matches to have decisive results. Both partners share their final placement. Rating awards average the two occupied individual award tiers for each pair; for example tiers of 100 and 80 award 90 to each winner. Correcting a final reconciles existing rating awards without counting the tournament twice.

## Verification

Pure generator tests cover every split mode, missing/invalid ratings, best achievable balance, group partnership/opponent invariants, court waves and final mapping. Convex integration tests cover authorisation, group locks, action snapshots, final gating, group score isolation, shared placements, rating corrections and the finals-reset flow. Existing single Americano tests remain unchanged.
