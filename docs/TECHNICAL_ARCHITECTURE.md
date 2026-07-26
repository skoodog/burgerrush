# Technical architecture

## Stack

| Layer      | Choice                             | Why                                                                     |
| ---------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Build      | Vite 7                             | Fast dev server, ES2022 output, first-class PWA plugin                  |
| Language   | TypeScript 5.9, strict             | `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are both on |
| Rendering  | Phaser 3.90                        | 2D gameplay and UI scenes only                                          |
| 3D         | Three.js (declared, not yet wired) | Reserved for the front/back render-texture flip                         |
| Audio      | Web Audio directly                 | Every cue is synthesised; no sample payload, no third-party layer       |
| Unit tests | Vitest                             | Node environment; the rig and systems have no DOM dependency            |
| E2E        | Playwright                         | Drives the real production bundle                                       |

No React. The game loop owns the simulation.

## Determinism

Two rules make runs reproducible:

1. **Fixed-step simulation.** Every scene accumulates real frame time and steps
   the simulation at `FIXED_STEP = 1/120`, capped at `MAX_STEPS_PER_FRAME = 8`.
   Physics, animation, cloth springs, enemy brains and the threat director all
   advance on that step. Rendering interpolates afterwards.
2. **Named RNG streams.** `RngStreams` derives one `mulberry32` generator per
   named stream (`map`, `ai`, `pickup`, `cosmetic`, `boss`, …) from the run seed
   via FNV-1a. Streams are created lazily but deterministically, so `stream('ai')`
   yields the same sequence regardless of call order. Adding a cosmetic effect
   cannot shift a boss pattern.

`Math.random()` appears in exactly one place — the Web Audio noise buffer, which
has no gameplay consequence — and the audio jitter uses its own LCG so it never
touches a gameplay stream.

## Module boundaries

```
core/      pure math and RNG            (no imports from anywhere else)
anim/      doll rig                     (imports core only)
rigs/      doll definitions and clips   (imports anim, core, art types)
art/       painters and texture bakery  (imports palette; atlas imports Phaser)
config/    tuning tables, identity      (imports anim types only)
systems/   simulation                   (imports core, config, levels)
entities/  chef and enemy               (imports anim, rigs, config, systems)
view/      DollView                     (the single rig↔Phaser bridge)
scenes/    orchestration                (imports everything; imported by nothing)
```

The important edge: **`anim/` never imports Phaser.** That is what allows the
entire rig to be unit-tested in Node and reused by the headless replay verifier.
`view/DollView.ts` is the only file that knows about both sides.

## Scene flow

```
Boot ─► Title ─► CharacterSelect ─► StackPhase ─► BossFlight ─► Results ─┐
  │        │                            ▲                                │
  │        ├─► DollLab                  └────────────── next round ──────┘
  │        └─► HowToPlay
  └─ bakes the procedural atlas once
```

Scene lifecycle is explicit. Phaser does not auto-invoke `Scene#shutdown`, so
every scene that owns doll views, tweens or timers wires
`Phaser.Scenes.Events.SHUTDOWN` itself and tears down in a defined order:
`tweens.killAll()` → `time.removeAllEvents()` → destroy views. `DollView` is
additionally destroy-safe, because a tween's `onComplete` can outlive a scene
transition.

## Texture pipeline

All art is procedural. `buildProceduralAtlas(scene)` runs once in `Boot`:

1. every `PartSpec` paints a **base** canvas and, when it carries the player-slot
   accent, a second neutral-gray **mask** canvas;
2. the mask is multiplied by the slot colour and composited over the base;
3. results are registered with Phaser under stable keys.

Accent-bearing parts produce `<key>.red`, `<key>.blue` and `<key>.neutral` from
one source path, so the exports are pixel-aligned by construction.

**Scale contract.** Textures are painted at `ART_RES = 4` pixels per world unit
with `PAD = 3` pixels of bleed for keylines. `DollView` divides by `ART_RES` and
corrects pivots for the padding. Every non-doll world sprite must apply
`PX = 1 / ART_RES` too — forgetting this is what made the boss fill the arena
during development.

Swapping in final source art means replacing a painter behind the same key.
Nothing else changes.

## Simulation systems

| System          | File                        | Notes                                                              |
| --------------- | --------------------------- | ------------------------------------------------------------------ |
| Burger assembly | `systems/burgerStack.ts`    | Tread marking, arming, cascading drops, rider carry                |
| Navigation      | `systems/navGraph.ts`       | Walk/ladder/portal edges, Dijkstra, escape degree, blockable edges |
| Threat director | `systems/threatDirector.ts` | Pressure scoring, approach-angle limiting, deterministic holds     |
| Scoring         | `systems/scoring.ts`        | Structured events, combo caps, anti-farm caps                      |
| Boss decks      | `systems/bossPatterns.ts`   | Seeded decks with a validated safe corridor per step               |

Every one of them is a plain class over plain data with no renderer dependency,
which is why `scripts/simulate-runs.ts` can drive the _real_ systems headlessly
rather than a parallel model.

## Input ownership

`InputDeviceRegistry` maps a stable session token to a player slot. It
deliberately does **not** trust the browser gamepad index, which is reassigned on
reconnect; a reconnecting pad is matched on its hardware id and rebound to the
same slot, preserving identity, presentation, slot colour and score ownership.

A device may own exactly one slot. Unassigned devices can raise a join action but
can never move a chef.

## Performance posture

- Object pools for Boss Flight projectiles and hazards. The pool cap is a
  rendering limit, never an ammo shortage: an exhausted pool recycles the oldest
  projectile rather than interrupting fire.
- Poses are dense `Float64Array` channels; sampling and blending are
  allocation-free in the hot loop.
- Clips are compiled once per skeleton and shared by every instance of a
  character.
- Bone matrices and part transforms are preallocated and reused.
- `visibilitychange` sleeps the game loop when the tab is hidden.

Production bundle: ~174 kB app + ~1.2 MB Phaser (54 kB / 332 kB gzipped).

## Known architectural gaps

Documented honestly rather than implied complete:

- Three.js is a declared dependency; the front/back map flip is not yet wired.
- The procedural map generator is not implemented. `scripts/validate-maps.ts`
  runs the full validation suite against seeded variants of the fixed maps, so
  the checks are real and exercised, but they are not yet validating generated
  topology.
- The replay format and headless verifier are specified in
  `docs/LEADERBOARD_AND_REPLAY.md` but not implemented; `replayHash` is currently
  a seed-and-score digest, not a recomputation.
- Touch controls have a device kind and a virtual-axis path in `ControlMap`, but
  no on-screen overlay yet.
