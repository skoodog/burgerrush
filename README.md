# Burger Rush

An original 2.5D arcade burger-assembly platformer with a mandatory sibling
boss-flight finale. Working title, pending name and trademark clearance.

Two chef siblings — **Chef Sal (`S`)** and **Chef Pep (`P`)** — race across
ingredient layers on a ladder-and-platform stage while food monsters hunt them.
Complete the burger inside 60 seconds and a klaxon sounds: both siblings launch
through the top of the stage into a side-scrolling battle against a giant flying
burger, firing unlimited spinning spatulas.

This is a spiritual successor to the single-screen burger-assembly arcade genre,
not a clone. No sprite, sound, tune, name, palette, map geometry or line of code
is taken from any existing game.

## Run it

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

That is the one documented command. The game is complete offline on first load —
every texture and every sound effect is generated procedurally at boot, so there
are no asset downloads, no credentials and no network dependency.

## Controls

| Action          | Keyboard                     | Gamepad             |
| --------------- | ---------------------------- | ------------------- |
| Move / climb    | Arrows or WASD               | D-pad or left stick |
| Context action  | Space or Z                   | South face button   |
| Spatula         | X or K (hold in Boss Flight) | West face button    |
| Confirm / start | Enter                        | South face / Start  |
| Back / pause    | Esc                          | East face / Start   |

**Local co-op** takes two gamepads, or keyboard plus a gamepad, joining in either
order. One physical device can never drive both players. Player 1 is always red
striping and red toque lettering; Player 2 is always blue — colour follows the
player slot, never the chef identity or presentation, and is always backed by a
slot number, the identity letter and a marker shape (P1 diamond, P2 circle).

## Modes

| Mode                | What it is                                                          |
| ------------------- | ------------------------------------------------------------------- |
| Arcade Run          | Ranked. Deterministic seed. 60-second Stack Phase plus boss flight. |
| Local Sibling Co-op | Shared screen, two independently assigned devices.                  |
| Practice Kitchen    | Unranked level and boss-pattern practice.                           |
| **Doll Lab**        | Production tool: inspect every rig, clip, variant and accent.       |
| How To Play         | Controls and rules.                                                 |

## Architecture

Vite + TypeScript (strict) + Phaser for 2D gameplay. Vitest for units, Playwright
for end-to-end. No React; the game loop owns the simulation.

```
src/
  app/            entry point
  game/
    anim/         doll rig: skeleton, clips, animator, secondary motion
    rigs/         chef and food-foe doll definitions, clip libraries, graphs
    art/          procedural painters and the texture bakery
    view/         the single Phaser binding for the rig
    config/       tuning tables and the chef identity model
    core/         deterministic math and seeded RNG streams
    systems/      burger stack, navigation, threat director, scoring, boss decks
    entities/     chef and enemy
    input/        device registry and control mapping
    audio/        Web Audio cue library
    scenes/       boot, title, select, stack phase, boss flight, results, lab
    state/        session and versioned persistence
    levels/       map data
scripts/          headless map validator and run simulator
tests/            unit and e2e
docs/             design, art, audio and system documentation
```

Two properties hold everywhere:

- **Fixed-step simulation.** Gameplay, animation and cloth all advance on a
  1/120s step; rendering interpolates. Behaviour is identical at 30 fps and
  240 fps.
- **Seeded, named RNG streams.** Map, AI, pickups, cosmetics and boss decks each
  draw from their own stream, so adding a particle effect can never shift a boss
  pattern for the same run seed.

## The doll rig

The animation layer is the centre of this build. Every character is a cut-out
puppet — a bone hierarchy plus pinned parts — driven by keyframed clips and a
declarative state machine that reads a gameplay-agnostic blackboard.

One chef rig serves all eight visual combinations (Sal/Pep × Boy/Girl × P1/P2).
Identity and presentation resolve to different _textures_; the player slot
resolves to a different _tint of the same aligned art_. The skeleton, clip
library, state machine, collision box and every tuning value are shared by
construction.

Full details, conventions and extension recipes: **[docs/ANIMATION_AND_DOLL_RIG.md](docs/ANIMATION_AND_DOLL_RIG.md)**.

Open the Doll Lab from the title screen to see it: browse every clip on every
variant in both slot colours, with bone overlays and a live event readout.

## Commands

```bash
npm run dev            # dev server
npm run build          # typecheck + production bundle (PWA)
npm run preview        # serve the production build
npm run lint           # ESLint, zero warnings tolerated
npm run typecheck      # tsc --noEmit, strict
npm test               # Vitest unit suite
npm run test:e2e       # Playwright against the production build
npm run validate:maps -- --count 1000
npm run simulate:runs -- --count 200
```

`BUILD_STATUS.md` records the exact commands run and their outcomes.

## Creative and legal boundary

The familiar _idea_ of a chef traversing burger ingredients while food monsters
pursue is used deliberately. Protected expression is not. Nothing here copies or
traces any original sprite, cabinet art, logo, lettering, animation, sound, tune,
character name, enemy design, palette, text or map geometry, and no ROM data,
tile map or audio extraction was consulted. The tutorial stage is original
geometry with its own route logic, proportions and pacing.

The supplied design sheet was used as _inspiration_ for colour, mood and roster
only — no element of it is traced or reproduced.

There is deliberately no salt-shaker or pepper-shaker enemy: the `S&P` initials
belong to Sal and Pep.
