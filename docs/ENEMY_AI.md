# Enemy AI

## Navigation

Brains move on a graph built from the same data the renderer draws, so an enemy
can never path through geometry the player cannot see.

- **Nodes**: ladder endpoints and platform ends (inset so a foe never stands on
  the lip).
- **Edges**: `walk` between consecutive nodes on a platform, `ladder` between a
  ladder's two endpoints, `portal` for face transitions. Every edge is
  bidirectional and individually blockable.
- **Search**: Dijkstra with a per-brain ladder-cost multiplier, so ladder
  preference is a tuning value rather than a code path.

`NavGraph.escapeDegree(node)` counts distinct escape directions and is what the
threat director and the map validator both reason about.

## Brains

All parameters live in `config/gameplay.ts` under `ENEMY_BRAINS`. Intelligence
scales before raw speed.

| Parameter             | Meaning                                                    |
| --------------------- | ---------------------------------------------------------- |
| `speed` / `rageSpeed` | Base and final-15-seconds speed                            |
| `pathRefresh`         | Seconds between re-plans                                   |
| `lookahead`           | Seconds of chef movement extrapolated when choosing a goal |
| `mistakeRate`         | Probability of deliberately targeting a random neighbour   |
| `ladderPreference`    | Divisor on ladder edge cost                                |
| `persistence`         | How long it presses a stale plan before re-planning        |
| `telegraphSeconds`    | Visible pause before a high-confidence intercept           |

### Sunny-Side Stalker

Slow refresh (0.85s) and an 18% mistake rate. It makes readable wrong turns and
is easy to bait around a ladder. Speed 52 — well under the chef's 132 — so it
threatens by cutting routes, never by footspeed.

### Brat Beast

Fast refresh (0.45s), high ladder preference, 92% persistence. Accelerates by a
further 18 units on platform runs over 120 units, and **overshoots** a turn by 26
units before reversing. Reversals are the counterplay.

### Pickle Phantom

Extrapolates the chef 1.35 seconds ahead and paths to where they _will_ be. When
a high-confidence intercept is available inside 150 units, it enters a visible
0.5-second `telegraph` state — a squash-stretch "thinking" beat — so the player
can read and dodge the read.

### Onion Ringlets

A coordinated pair with different sizes, speeds and lookaheads. The small one
pressures the current path; the heavy one commits to escape intersections.

## Threat Director

Runs every fixed step, always iterating enemies in ascending id order so
decisions are reproducible.

1. Sum pressure from every active foe inside a 190-unit radius, weighted by
   closeness squared.
2. Bucket each foe's approach into `left` / `right` / `above` / `below`.
3. Compute escape freedom from the chef's nearest node's escape degree against
   the number of converging directions.
4. If directions exceed 2, or escape freedom drops below 0.28, **hold** the
   furthest attackers for 0.8 seconds — deterministic tie-break on id.

It delays; it never teleports, despawns or rubber-bands. Re-entry after a defeat
is gated on `canEnterAt()`, which requires 150 units of separation from the chef,
retrying rather than spawning unfairly.

## Rage escalation

From 15 seconds remaining, `setRage(0..1)` interpolates speed toward `rageSpeed`
and shortens path refresh by up to 35%. No brain gains new information, geometry
exemptions or spawn privileges.

## Animation coupling

Enemy brains write the same blackboard the chef uses (`runBlend`, `onLadder`,
flags for `stunned` / `carried` / `flatten`, a `telegraph` trigger). One shared
enemy rig and clip library serves the whole roster, so a new foe is art plus a
brain — never a new animation system.

## Debugging

`scripts/simulate-runs.ts` drives the real brains headlessly and reports clear
rate, hit counts and score distribution. It is the fastest way to see whether a
tuning change made a foe threatening or merely annoying.

Current measured baseline on Tutorial Map A (round 1, optimal bot, 100 seeds):
100% clear rate, 0.00 average hits. That is the intended tutorial difficulty —
a single reduced-speed Stalker cannot catch an optimally-routed chef, and it is
not meant to. Round 2 adds the Brat Beast for real pressure.
