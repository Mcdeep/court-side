# Americano court balance

Court assignment runs after the fixture list is final. It moves whole matches
between court slots within the same partnership round. It never changes a
partnership, opponent, or partnership-round membership. Slots can span multiple
waves; empty slots allow a partial wave to use any available court.

The optimizer retains the lowest worst-player court spread it has seen, using
the sum of fourth powers of deviations from the ideal count to break ties.
Squared deviations alone cannot distinguish any assignments of the eight-player
template. A greedy assignment starts the search, followed by at most 100,000
swap attempts through 20 players, or 200,000 above that. All random choices use
the injected random function. The original assignment remains a candidate, so
optimization cannot increase the worst spread. One-court schedules bypass it.

## Proven limits of the fixed templates

Spread means a player's largest court count minus their smallest, including
courts on which the player never plays. The limits below apply to the current
`WHIST_SCHEDULES` templates. Permuting player names, partnership-round order,
match order, and match sides does not change these limits.

| Players | Courts | Minimum possible worst-player spread |
| --- | --- | --- |
| 8 | 2 | 5 |
| 12 | 3 | 2 |
| 16 | 4 | 3 |
| 16 | 2 | 3 |

The generator stops when it reaches these proven minima. Other configurations
aim for spread at most one within the same iteration budget. A bounded search
does not guarantee an optimal assignment for arbitrary fixtures.

### Eight players, two courts

There are seven rounds, each containing two matches. Every permissible court
assignment is one of the `2^7 = 128` choices of whether to swap each round's
matches. Exhaustive enumeration gives 112 assignments with worst spread five
and 16 with worst spread seven. None have a smaller spread. The test enumerates
all assignments of the actual generated template.

Every assignment has total squared deviation 28 across the eight players and
two courts, even though the maximum spread differs. This is why the search uses
a fourth-power penalty instead of squared error alone.

### Twelve players, three courts

Each player plays eleven games. Spread at most one would require court counts
to be a permutation of `(3, 4, 4)`.

The test exhaustively searches all six court permutations in each of the eleven
rounds. The first round's court labels can be fixed without loss of generality.
Branches are rejected only when a court count exceeds four or a player cannot
reach three on a court with the remaining rounds. No assignment survives. The
generator's spread-two schedules provide the matching upper bound.

### Sixteen players

Ignoring partners within each match, the template contains five distinct
partitions of the players into four groups of four. Each partition appears
three times. Any group from one partition meets any group from another in
exactly one player. A test checks these properties against the actual template.

Fix one court. Let `k[g]` be the number of times a group is assigned to that
court across its three appearances. For each partition, the four integers
`k[g]` sum to `s`, where `s = 3` for four courts or `s = 6` for two courts.
Each player belongs to one group in each of the five partitions.

The intersection property makes the centered contributions of different
partitions orthogonal. Consequently, with `count[p]` denoting court appearances,

```
sum_p (count[p] - 5s/4)^2 = 4 * sum_g (k[g] - s/4)^2
```

For four courts, the minimum contribution per partition occurs at group counts
`(0, 1, 1, 1)`: squared deviation `3/4`. Thus each court contributes at least
`4 * 5 * 3/4 = 15`, or at least 60 across all four courts.

If every player's spread were at most two, their fifteen games would be
distributed as `(3, 4, 4, 4)` or `(3, 3, 4, 5)`, up to permutation. Their
squared deviations from `15/4` would be at most `11/4`, totaling at most 44.
This contradicts the lower bound of 60. Spread at least three is unavoidable.

For two courts, the minimum group counts per partition are `(1, 1, 2, 2)`:
squared deviation one. Each court contributes at least `4 * 5 = 20`, or 40
across both courts. Spread at most one would require every player to have
`(7, 8)` games, totaling squared deviation eight across all players. This is
again impossible. Since two counts totaling fifteen differ by an odd number,
the next possible spread is three. Generated schedules attain three for both
the two- and four-court configurations.

## Twenty players

Twenty-player fixtures are generated dynamically rather than taken from a fixed
template. The seeded schedules investigated so far reach spread two. Spread
one remains an unresolved target: a search timeout or a spread-two result is
not evidence that spread one is impossible. The fixed-template bounds above
must not be applied to these schedules.

No constraint solver or additional dependency is needed by the app. Independent
solver experiments were used only to investigate feasibility.
