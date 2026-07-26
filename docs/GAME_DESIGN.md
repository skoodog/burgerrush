# Game design

## Pillars

1. **Read in one glance.** Platforms, ladders, ingredient progress, threats and
   the timer are legible immediately.
2. **Panic with fairness.** Pressure rises, but every hit is explainable and an
   escape route always exists where the topology allows one.
3. **Physical comedy.** Ingredient drops, enemy reactions and spinning spatulas
   are tactile and funny.
4. **One more run.** Rounds are short, seeds replay, restarts are instant.
5. **Depth behind simplicity.** Route choice, enemy manipulation and risk-reward
   scoring create mastery.
6. **Two-act escalation.** Every completed platform stage flows into the sibling
   boss flight.

## The two acts

### Act one - Stack Phase (60 seconds)

The timer is exactly 60.0 seconds and starts on the first accepted movement
input, or after a 2.5-second grace period.

An ingredient layer is a traversable platform divided into 5-7 tread segments.
Entering an unpressed segment marks it complete and plays substrate-specific
feedback. Completing every segment arms the layer; after a short readable
anticipation it drops, cascading into resting layers below and carrying any foe
standing on it down to be flattened. All layers landing on the plate in order
completes the burger.

Progress reads by **shape**: pressed segments compress and show a footprint
notch. Colour is never the only cue.

A hit costs one apron, deducts three seconds, applies readable hit-stop, and
respawns the chef at the nearest _validated safe_ checkpoint — one chosen for
distance from active foes, not merely proximity, so an immediate re-hit is
impossible. Invulnerability lasts 1.25 seconds and is shown by a blink.

At 15 seconds remaining, music and AI escalate: update cadence rises, speed rises
modestly, predictive brains extend their lookahead. No enemy teleports, reads
future input beyond its published lookahead, or ignores geometry.

### Act two - Boss Flight

Completing the burger freezes the stage, sounds an original two-pulse klaxon and
overlays the exact strings `BOSS COMING!` and `ボス接近！`, rendered from
localisation resources with local fonts — never baked into generated image
lettering. Both siblings look up, crouch and fly through the top boundary.

In the horizontal arena both chefs fire **unlimited** spinning spatulas. There is
no ammo value, pickup, reload, magazine, heat or coupling to the finite Stack
Phase field spatulas. Holding fire produces two readable streams at a tuned
cadence; Player 1's carries a restrained red accent and Player 2's blue, which
never alter damage, cadence, collision or scoring.

In solo play the unselected sibling flies as a deterministic wing partner in a
fixed offset formation, auto-fires whenever the lead fires, and may be knocked
out of formation without costing an apron.

The Dread Stack exposes ingredient armour that cracks and falls away as harmless
food confetti. A quick-clear bonus clock starts at 30 seconds; reaching zero
removes the bonus and enrages the boss modestly, but never creates an unwinnable
timeout. The level cannot clear until boss defeat is committed.

## The cast

**Chef Sal (`S`)** — observant, clever, precise. Composed pose language.
**Chef Pep (`P`)** — upbeat, brave, impulsive. Broad anticipation.

Identity is a personality, not a gender lock. Each supports a Boy and a Girl
presentation with identical movement, collision, health, fire cadence, damage,
scoring and ranked eligibility. Both players may choose the same presentation.

Player slot decides colour and nothing else: P1 red, P2 blue, always, regardless
of identity or presentation.

### Food foes

| Foe                | Behaviour                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Sunny-Side Stalker | Simple pursuer. Slow path refresh, deliberate wrong turns, easy to bait around ladders.                                          |
| Brat Beast         | Stubborn hunter. Fast refresh, aggressive ladder use, accelerates on long platforms, overshoots turns — vulnerable to reversals. |
| Pickle Phantom     | Interceptor. Extrapolates the chef 1.35s ahead, prefers choke points, pauses visibly before a high-confidence intercept.         |
| Onion Ringlets     | Coordinated pair, one springy and one heavy, with clearly different silhouettes.                                                 |

There is deliberately **no salt-shaker or pepper-shaker family**. The `S&P`
initials belong to Sal and Pep.

## Progression

| Round | Content                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1     | Tutorial Map A. One burger, one Stalker at reduced speed, contextual hints. Boss: slow, widely spaced pickle discs only.      |
| 2     | Map A rematch. Stalker plus Brat Beast, hints reduced. Boss adds one telegraphed ketchup lane.                                |
| 3     | Map B. Lower geometric complexity, more active pursuit. Boss adds mustard fans and waves.                                     |
| 4     | Map C. First front/back dimensional stage with a required secret burger. Boss adds mayo dollops and active vertical movement. |
| 5-9   | Seeded procedural maps, controlled front/back variants, world substrates.                                                     |
| 10+   | Exactly three collectible **field** spatulas per Stack Phase. Boss ammo remains unlimited and unchanged.                      |
| 15+   | Multi-face maps, elite traits, conveyors, ice, vents, timed doors. Never more than two new rules per round.                   |
| 20+   | Procedural world rotation, escalating threat budget, endless seeds.                                                           |

Rounds 1 and 2 ship. Rounds 3+ are specified and partially scaffolded; see
`BUILD_STATUS.md` for exactly what is and is not implemented.

## Scoring

See `docs/SCORING.md` for the full table. The shape: small continuous rewards for
treading, large discrete rewards for layers and burgers, escalating rewards for
multi-enemy drops, and flat unmultiplied bonuses for time remaining and no-hit
play. Combo caps at ×8. Destructible pickle discs are capped per encounter so
they cannot be farmed.

## Emotional rhythm of a level

Read the map → choose a route → commit across ingredient segments → panic as
enemies close routes → outsmart them through ladders and prediction → finish with
seconds to spare → hear the klaxon → launch → dodge condiment patterns while both
siblings fire → defeat the boss → chase a better score.
