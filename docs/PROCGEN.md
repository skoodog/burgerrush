# Procedural generation

## Status

**Not implemented.** The generator itself is future work. What exists today and
runs in CI is the complete **validation** half: `scripts/validate-maps.ts`
applies every acceptance check to seeded map variants, so when the generator
lands the gate is already written and exercised.

This document specifies the target and records what the validator already
enforces.

## Intended design

Graph-first, not tile noise.

**Inputs**: run seed, round number, world, face count, burger count, platform
budget, ladder budget, portal budget, enemy budget, secret classification,
hazard budget, target optimal completion range.

**Grammar**: platform spans as traversable intervals; ladders as edges;
ingredient layers as dynamic platform nodes; plates as terminal assembly nodes;
portals as face-transform edges; safe spawns; checkpoints; hazards; depth
silhouettes.

Generate meaningful **loops**. A pure tree makes pursuit unavoidable.

Reject invalid maps and regenerate from a derived retry seed, recording the
accepted retry index so reproduction stays exact.

## Validation (implemented)

`npm run validate:maps -- --count 1000` runs, and passes, today.

| #   | Check                                                         | Enforced                |
| --- | ------------------------------------------------------------- | ----------------------- |
| 1   | Every nav node reachable from every other                     | yes                     |
| 2   | Every tread segment stands on a surface within its layer span | yes                     |
| 3   | Every ingredient layer rests on a platform                    | yes                     |
| 4   | Every burger has a contiguous layer order and a plate         | yes                     |
| 5   | The burger completes under real simulation within 33s         | yes                     |
| 6   | Player and enemy spawns sit on decks                          | yes                     |
| 7   | Enemy spawns are ≥150 units from a player spawn               | yes                     |
| 8   | Every checkpoint sits on a deck                               | yes                     |
| 9   | No two ladders overlap the same span                          | yes                     |
| 10  | Every ladder junction has ≥2 escape directions                | yes                     |
| 11  | The graph contains a cycle, not just a tree                   | yes                     |
| 12  | An optimal enemy-free route exists inside the map's window    | yes                     |
| 13  | A novice route still fits the 60-second timer                 | yes                     |
| 14  | The round's boss deck leaves a survivable corridor every step | yes                     |
| 15  | Front/back coordinate transform consistency                   | pending the flip system |
| 16  | No required goal depends on a random enemy interaction        | pending portals         |

Failures are written to `tests/fixtures/failing-seeds.json` and the run exits
non-zero. `--ascii` prints a debug diagram of any failing seed.

## Route budgets

Two distinct requirements, checked separately:

- **Optimal route** must fall inside the map's `targetTime` window. The estimator
  routes on the nav graph at published chef speeds, charges the full width of
  every layer because each tread segment must be walked, and adds the authored
  drop anticipation per layer. It assumes perfect routing and zero pressure, so
  it is a lower bound.
- **Novice route** — optimal × 2.6 plus a 6-second hit allowance — must fit
  inside 60 seconds.

`targetTime` is per map. Tutorial Map A is deliberately quick (measured ~15s
optimal, window `[12, 30]`) so a first-time player clears it comfortably. The
36-44 second window from the brief is the target for **procedural** rounds, not
for teaching stages.

## Bot estimator

`scripts/simulate-runs.ts` drives the real burger stack, nav graph, enemy brains,
threat director and scoring with a deterministic bot. The bot commits to a ladder
and rides it to the deck it actually serves — it can never traverse a gap no
ladder covers — so its times are achievable rather than theoretical.

Current baseline (Tutorial Map A, 100 seeds): 100% clear, median score 11,010,
0.00 average hits, 53.3 seconds remaining.
