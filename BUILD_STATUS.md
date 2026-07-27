# Build status

Phase A (discovery, scaffold, placeholder art system) and Phase B (playable
vertical slice) are complete. The animation layer — the doll rig — is built out
well beyond vertical-slice scope, because it is the foundation everything else
hangs from.

## Verified commands

Every line below was run in this environment and its output observed. Nothing is
projected.

| Command                                 | Outcome                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `npm run lint`                          | exit 0                                                             |
| `npm run typecheck`                     | exit 0                                                             |
| `npm test`                              | exit 0 — 104 tests, 3 files                                        |
| `npm run test:e2e`                      | exit 0 — 10 specs against the production build                     |
| `npm run validate:maps -- --count 1000` | exit 0 — 1000 seeds, 0 failures, avg optimal route 14.9s           |
| `npm run simulate:runs -- --count 200`  | exit 0 — 100% clear, median 11,010, 0.00 avg hits                  |
| `npm run build`                         | exit 0 — 175.99 kB app (55.21 kB gz) + 1,208 kB Phaser (332 kB gz) |
| `npm run robot -- doctor`               | exit 2 — correctly reports transport blocked (see External setup)  |

Browser verification was done with Playwright against `npm run preview`,
capturing screenshots and asserting an empty console-error list at every stage of
the main flow.

## Playable now

Run `npm run dev`, then:

Title → Arcade Run → chef select → Stack Phase on Tutorial Map A → complete the
burger → klaxon and the exact `BOSS COMING!` / `ボス接近！` warning → both
siblings launch through the top boundary → Boss Flight against the Dread Stack
with unlimited dual spatula streams → results with separate Stack and Flight
tallies and arcade initials entry.

Also reachable from the title: **Local Sibling Co-op** select, **Practice
Kitchen**, **How To Play**, and the **Doll Lab**.

## Implemented

### Animation (the centre of this build)

- Renderer-agnostic doll rig: skeleton with topological solve, 2×3 affine
  transforms, dense typed-array poses.
- Clip system: authoring DSL in degrees/seconds, compiled tracks, binary-search
  sampling, four loop modes, additive clips, loop-safe events.
- Animator: crossfades, additive layers, priority-ordered declarative state
  machine driven by a gameplay-agnostic blackboard.
- Spring-driven secondary motion for toque crown, scarf tail, apron ties and
  hair, integrated on the fixed step.
- Chef rig: 24 bones, 27 parts, 4 cloth chains, 32 clips covering the complete
  section-17 key set from select idle through the paired final volley.
- Enemy rig: one shared skeleton, clip library and graph for the whole roster.
- Accent-mask pipeline producing pixel-aligned Sal-red / Pep-blue exports from
  one source path.
- Doll Lab: in-game inspection of every clip, variant, accent, expression and
  bone overlay.

### Identity model

Colour follows the **chef**, not the slot: Sal is red, Pep is blue, and the
accent travels with the identity through a character-select swap. Slots stay
distinguishable by number and shape (P1 diamond, P2 circle), so nothing depends
on colour alone. `Session.selection()` re-derives the accent on every read, so it
cannot drift from the identity.

Sal and Pep also share body art within a presentation — Pep Girl is literally the
same head, hair and face artwork as Sal Girl, differing only in the toque emblem
letter and the uniform tint. That halves the face/hair sheet matrix from 32 to 16
and is asserted by a unit test rather than left as a convention.

### Art

- Fully procedural: every chef part, food foe, ingredient tread state, stage
  element, boss module, projectile, warning glyph, effect and prop is painted at
  boot. No binary assets, no network, no credentials.

### Gameplay

- Tutorial Map A with original geometry, 5 decks, 13 ladders, a right-hand loop.
- Tread segments, layer arming, cascading drops, riders carried and flattened.
- Exact 60.0-second timer with first-input start and a grace period.
- Three distinct enemy brains on a nav graph, plus the Threat Director.
- Aprons, hit-stop, time penalty, invulnerability, safe-checkpoint respawn.
- Full score table with combo caps and anti-farm caps.
- Boss Flight: Dread Stack with modular ingredient armour, four condiment
  families with shape-coded telegraphs, pickle-only round-1 tutorial deck,
  quick-clear clock, enrage, defeat breakup, solo wing partner.
- Unlimited boss ammunition with no ammo value anywhere in the code path.

### Systems

- Input device registry with slot ownership, disconnect and slot-preserving
  rebind.
- Versioned persistence with migration, corrupt-storage recovery, sanitisation.
- Web Audio cue library: 11 footstep substrates with variation and stereo
  alternation, adaptive four-layer music, all mechanical and boss cues.
- Accessibility: colour-independent identification, reduced motion, screen-shake
  slider, numeric boss health, auto-fire, captions, readable timer scale.

### Tooling

- **skoodog-robot** (`.claude/agents/skoodog-robot.md`,
  `scripts/skoodog-robot.mjs`): escalates blockers whose cause is outside this
  repository to the Higgsfield Discord and brings answers back. Dependency-free,
  REST-only, with a hand-rolled CONNECT tunnel. `doctor` probes transport,
  identity and channel access separately so a failure names the broken layer.
  Questions queue locally when the network is closed, so the caller is never
  blocked. Answers are treated as untrusted hypotheses that must be tested
  before use. See `docs/EXTERNAL_SETUP.md`.

## Not implemented

Stated plainly rather than implied.

| Area                                                       | Status                                                                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front/back 3D map flip                                     | Not built. Three.js is a declared dependency; no flip, no portals, no secret burgers yet.                                                          |
| Procedural map generator                                   | Not built. The **validator** is built and passes at 1000 seeds against seeded variants of the fixed maps.                                          |
| Rounds 3+                                                  | Map B, Map C and the world map are specified, not authored. Rounds 1 and 2 ship.                                                                   |
| Level-10 field spatulas                                    | Inventory, throw trigger, clips and HUD plumbing exist and are unit-tested; the pickups and the projectile are not spawned in the Stack Phase yet. |
| Replay format and verifier                                 | Specified in `docs/LEADERBOARD_AND_REPLAY.md`. `replayHash` is a seed-and-score digest, not a recomputation.                                       |
| Remote leaderboard                                         | Interface specified; no adapter.                                                                                                                   |
| Touch overlay                                              | Device kind and virtual-axis path exist; no on-screen pad.                                                                                         |
| Control remapping UI                                       | Device layer supports it; no settings screen.                                                                                                      |
| High-contrast palette                                      | Flag plumbed and persisted; alternate palette not authored.                                                                                        |
| Rush Trip runner interlude                                 | **Generator built and validated**; the scene that plays it is not. See below.                                                                      |
| Attract mode                                               | Not built.                                                                                                                                         |
| Onion Ringlets, Cheese Creep, Tomato Tumbler, Freezer Burn | Art, rigs and brain parameters exist; they are not placed in a shipping map.                                                                       |

## Defects found by verification, and fixed

Recorded because they are the evidence the verification was real.

1. **Missing-texture placeholders on the chefs.** Unresolved slot parts (empty
   hands) fell through to their literal key and drew Phaser's green diamond.
   Slot-driven parts now hide until something fills the slot.
2. **Toque band across the eyes.** The hat pivot and band offset were wrong. The
   crown now hangs from its own cloth bone above a rigid band on the hairline,
   and the emblem disc moved to the base layer so only the letter takes the
   accent colour.
3. **Boss filling the arena.** Non-doll sprites rendered at raw texture pixels
   instead of world units. The `PX = 1/ART_RES` contract is now applied and
   documented.
4. **Only one spatula stream visible.** The wing partner's `firing` flag was
   cleared by `updateFlight` every step; it now routes through the input.
5. **`Cannot read properties of undefined (reading 'sys')` after boss defeat.**
   Phaser does not auto-invoke `Scene#shutdown`, so doll views outlived their
   scene. Scenes now wire `SHUTDOWN` explicitly, kill tweens and timers in order,
   and `DollView` is destroy-safe.
6. **Validator route estimator ignored segment traversal**, and its escape metric
   counted platform ends — legitimately one-way — as traps.
7. **Tutorial Map A carried the procedural 36-44s route window.** Measured
   optimal is ~15s, which is correct for a teaching stage; the window is now
   `[12, 30]` and the procedural target is documented separately.
8. **Simulator bot climbed through decks.** It re-looked-up its ladder every step
   and lost it after four steps of climbing. It now commits to a ladder and rides
   it to the deck that ladder actually serves, so its times are achievable.

## Tuning observations

- On Tutorial Map A the optimal bot never takes a hit across 200 seeds. That is
  correct for round 1 — a single reduced-speed Stalker cannot catch an
  optimally-routed chef and is not meant to. Round 2 adds the Brat Beast.
- Median bot score 11,010 with ~53 seconds remaining. Human play will score
  higher through combo chaining and enemy drops, which the bot never attempts.

## Rush Trip: the runner interlude

`src/game/systems/runnerTrack.ts` generates the surreal mid-round runner as pure
seeded data, so it validates headlessly like every other system here.

Two fairness bugs were found and fixed during validation, both worth recording
because they are the kind that only surface under seed sweeps:

1. **The generator could demand an impossible dodge.** Gaps tighten as the trip
   ramps, and late in a track that could ask for a two-lane change in one-lane
   time. Candidate open lanes are now filtered to those physically reachable at
   that group's speed, with a safety margin.
2. **The validator produced false failures.** The first version assumed a single
   path and desynchronised from the generator's actual route whenever a group
   left two lanes open. Reachability is a *set* problem: it now tracks every lane
   the player could occupy and fails only when that set empties.

300 seeds now pass with zero failures.

What remains is the scene — the morph in, the three-lane runner presentation, the
morph back with the Stack Phase timer resumed exactly where it was left.

## External setup

**Blocked on network egress allowlist entries.** Eight character and boss renders
were generated on Higgsfield (16 credits, logged in `docs/ASSET_LEDGER.md`) and
all completed successfully, but they cannot be fetched. The egress policy is a
per-host allowlist, and it says so itself: a CONNECT to the asset CDN returns
`request rejected: host not permitted`, and a plain request returns `Host not in
allowlist: <host>. Add this host to your network egress settings to allow
access.`

Two entries are wanted:

| Host                            | Unblocks                                  |
| ------------------------------- | ----------------------------------------- |
| `d8j0ntlcm91z4.cloudfront.net`  | downloading the generated art             |
| `discord.com`                   | skoodog-robot's escalation bridge         |

Note that `npm install` and `git fetch` working proves nothing about general
access: package registries bypass the proxy entirely, and git reaches the remote
through a local git proxy rather than `github.com`.

Until the CDN host is allowlisted, the game continues to ship on the procedural
painters in `src/game/art/`. That fallback was kept behind stable texture keys
precisely so swapping in generated art stays a texture-key change rather than a
rewrite.

`git push` is separately denied at the tool-permission layer in this environment;
commits reach the branch through the GitHub MCP `push_files` path instead, and
every transfer is verified byte-identical with `git diff` against the fetched
remote.

## Next highest-value improvement

**The front/back map flip and the required secret burger** (round 4, Phase D). It
is the signature feature, it is the largest single gap against the brief, and the
rig, portal animation clips (`portalEnter` / `portalExit`), nav-graph portal edge
kind and secret classification enum are all already in place waiting for it.
