# Americano standings

Organisers can choose the tiebreak order when creating or editing an Americano tournament. The setting belongs to the tournament, so organisers, players and kiosk viewers see the same ranking. Duplicating a tournament copies its order.

Total points always come first. The default tiebreak order is matches won, point difference, then head-to-head. All three criteria must appear exactly once. Other formats keep their points-only ranking.

Point difference is points scored minus points conceded across completed matches. Drawn matches count as played but give neither side a win or loss.

Head-to-head uses a mini-table of the players still tied when that criterion is reached. It sums their point differences against each other, counting each opposing tied participant once per match; partners do not count. For a multi-player tie, the mini-table is calculated once for that tied group. Remaining criteria can split it further, but head-to-head is not reapplied to smaller subgroups.

Players still equal after every criterion share a competition rank: for example, 1, 2, 2, 4. The standings display shared positions as `=2`. Sorting a table column leaves official ranks unchanged. The kiosk podium includes everyone sharing a position in the top three.

Ratings use those same ranks. Only an unresolved tie averages the tier slots it occupies. Fixed-team formats still treat each team as one placement unit. Rating tiers are saved on the tournament when awards are first calculated; later score corrections use those original tiers and adjust existing awards without counting the event again.

The order locks on completion and remains locked after ratings are awarded, even if the tournament is reopened. Score corrections can still update standings and rating awards for tournaments using the new rules.

## Existing tournaments

Completed or archived tournaments with no saved order retain their original points-only standings and awards. Active tournaments use the default order until an organiser chooses another order; completing one saves that order. No historical backfill is needed.

Older approval paths sometimes omitted the final match score. Approved submissions alone cannot establish the final score because an admin could resolve them differently. For these events, standings retain cached total points, display a missing-results notice, and defer rating awards. Correcting such a match requires restoring its original score first so its previous contribution can be reversed safely.
