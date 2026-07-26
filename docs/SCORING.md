# Scoring

Every award produces a structured `ScoreEvent` carrying reason, base points,
multiplier, total, owning player slot and timestamp. The same stream feeds the
HUD, the results tally, the replay record, analytics and leaderboard
verification — there is no second scoring path.

## Table

| Event                                          |                                      Points |
| ---------------------------------------------- | ------------------------------------------: |
| New tread segment                              |                                          10 |
| Complete ingredient layer                      |                                         250 |
| Ingredient drop landing                        |                                         100 |
| Enemy carried one level                        |                                         400 |
| Enemy flattened by ingredient                  |                                       1,000 |
| Second enemy in the same drop                  |                                       1,500 |
| Third enemy in the same drop                   |                                       2,500 |
| Standard burger complete                       |                                       5,000 |
| Required secret burger                         |                                       7,500 |
| Optional secret burger                         |                                      10,000 |
| Field-spatula dispatch                         |                                         750 |
| Field-spatula line-up                          |                         750 / 1,500 / 3,000 |
| Stack Phase remaining time                     |                        100 per whole second |
| Boss armour break, minor plate                 |                                         500 |
| Boss armour break, major layer                 |                                       1,500 |
| Destructible pickle disc                       |                                          25 |
| Boss defeat                                    |      5,000 + 500 per round beyond the first |
| Boss quick clear                               | 250 per whole second on the 30-second clock |
| No-hit Stack Phase                             |                                       3,000 |
| No-hit Boss Flight                             |                                       3,000 |
| Sibling sync (wing chef active throughout)     |                                       1,500 |
| All burgers, no wasted portal trip             |                                       1,500 |
| All three field spatulas unused after level 10 |                                       1,500 |

## Combo

Combo-worthy events (layer completion, burger completion, multi-enemy drops,
field-spatula line-ups) extend a combo window and increment the multiplier, which
caps at **×8**. The window expires on a timer; expiry resets to ×1.

Flat bonuses are **never** multiplied: remaining time, quick clear, no-hit,
sibling sync, no-wasted-portal and unused-field-spatulas all apply at ×1. This is
enforced by an explicit `UNMULTIPLIED` set, not by convention.

## Anti-farming

- Destructible pickle discs are capped at 40 per encounter (1,000 points), so
  camping a pickle pattern cannot outscore progressing.
- Respawns preserve ingredient progress but award nothing.
- Ingredient states are irreversible, so a layer cannot be re-scored.

## Extra apron

One extra apron at a data-driven score threshold (20,000), at most once per run.

## Results

The results screen tallies Stack Phase and Boss Flight separately and together:
tread, layers, drops, foes, burgers, secrets, field spatulas and stack time
bonus on one side; boss damage and boss clear on the other; flat bonuses last.
