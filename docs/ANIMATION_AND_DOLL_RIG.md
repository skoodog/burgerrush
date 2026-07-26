# Doll rig and animation system

This is the document for the animation layer: how a "doll" is defined, how clips
are authored, how gameplay drives them, and how to add a new character or a new
animation without touching the renderer.

## 1. What a doll is

A **doll** is a cut-out puppet: a bone hierarchy plus a flat list of drawable
parts pinned to those bones. Every playable chef, food foe and boss module in the
game is one of these.

```
DollDef
├── SkeletonDef      bone tree, bind transforms
├── PartDef[]        drawable pieces: bone, texture, pivot, draw order
└── ClothChainDef[]  spring-driven secondary motion
```

Nothing in `src/game/anim/` imports Phaser. The rig solves to plain
`{x, y, rotation, scaleX, scaleY, alpha}` records that any 2D backend can copy
onto sprites. That is what lets the whole system run headlessly in Vitest and,
later, inside the replay verifier.

| File               | Responsibility                                          |
| ------------------ | ------------------------------------------------------- |
| `anim/types.ts`    | Data model: bones, parts, poses, clips, graphs          |
| `anim/skeleton.ts` | Topological bone ordering and the world-transform solve |
| `anim/clip.ts`     | Clip authoring DSL, compilation, sampling, events       |
| `anim/animator.ts` | Playback, crossfades, additive layers, state machine    |
| `anim/dollRig.ts`  | The runtime puppet: skin, cloth, facing, solved parts   |
| `view/DollView.ts` | The only file that knows about both the rig and Phaser  |

## 2. Coordinate and unit conventions

- **1 doll unit = 1 world pixel at scale 1.** The chef stands 64 units from the
  ground line to the top of the toque.
- The doll's origin (`hips` bone at `y = -20`) sits at the **feet**, so world `y`
  maps directly onto ground contact.
- `+x` is right, `+y` is down (screen convention).
- A bone's `+x` axis points **along** the limb. Legs and arms have bind rotations
  near 90°, so a **negative** rotation delta swings a limb _forward_.
- Positive `torso`/`head` rotation leans **forward**; negative leans back.
- Art is painted at `ART_RES = 4` texture pixels per doll unit. `DollView`
  divides by it; every other world sprite must do the same (`PX = 1 / ART_RES`).

## 3. The chef skeleton

```
hips
├── torso ── chest ── neck ── head
│                              ├── toque ── toqueTip      (cloth)
│                              └── hairTail               (cloth)
│            ├── scarf ── scarfTail                       (cloth)
│            ├── armFarUpper  ── armFarLower  ── handFar
│            └── armNearUpper ── armNearLower ── handNear
├── apron
├── apronTie                                              (cloth)
├── legFarUpper  ── legFarLower  ── footFar
└── legNearUpper ── legNearLower ── footNear
```

24 bones, 27 parts, 4 cloth chains. `toque` is the rigid band on the hairline;
`toqueTip` is the soft crown above it, so the hat rocks without the band sliding
off the head.

Draw order is declared by `CHEF_Z` and sorted once at construction:
far arm → far leg → back hair → apron → torso → neck → scarf → near leg →
near arm → head → face → front hair → toque → emblem → held prop.

The explicit `neck` part matters: head and torso silhouettes are both
curve-inset from their texture boxes, so without a piece bridging them the chin
and the collar leave a visible seam at any offset.

## 4. One rig, eight visual combinations

The brief is explicit: never duplicate physics or animation state machines for
the eight chef combinations. The rig honours that by separating three concerns
that meet only in a texture lookup:

| Concern      | Type              | Where it lives                                      |
| ------------ | ----------------- | --------------------------------------------------- |
| Identity     | `'sal' \| 'pep'`  | `DollSkin.textures` (emblem, hair, face)            |
| Presentation | `'boy' \| 'girl'` | `DollSkin.textures` (hair, face, head)              |
| Player slot  | `1 \| 2`          | accent tint baked into `<part>.red` / `<part>.blue` |

`chefSkin(identity, presentation, accent)` returns the texture map.
`DollRig.setSkin()` swaps it with no effect on the skeleton, the clips, the state
machine, the collision box or any tuning value. That is why the Boy/Girl selector
and the co-op identity swap are single-line operations.

### Texture resolution order

1. runtime slot override (`slot.face` → `face.hurt`),
2. skin texture map (`chef.hairFront` → `chef.hairFront.sal.girl`),
3. the literal key on the part.

A part whose key starts with `slot.` and has no override **hides**. Without that
rule an empty hand would fall through to the literal key and draw the renderer's
missing-texture placeholder.

## 5. The accent-mask pipeline

Accent-bearing parts are painted **twice** from the same geometry:

- a **base** layer (cream cloth, skin, shading);
- an **accent mask** in neutral grays, covering exactly the regions the art bible
  lists: uniform stripes, toque letter, scarf, apron tie, shoe trim.

At bake time the mask is multiplied by the slot colour and composited over the
base. Because both layers come from one source path, the red and blue exports are
pixel-aligned **by construction** rather than by discipline.

```
paint base  ──┐
              ├── compositeAccent(base, mask, colour) ── chef.torso.red
paint mask ───┘                                       ── chef.torso.blue
                                                      ── chef.torso.neutral
```

Colour is never the only signal: slot number, identity letter, marker shape
(P1 diamond / P2 circle) and screen position all carry the same information.

## 6. Authoring a clip

Clips are written in a compact spec — degrees, seconds, `[time, value]` pairs —
and compiled once into dense typed tracks.

```ts
const run = clip(
  'run',
  0.44,
  {
    loop: 'loop',
    events: [
      { t: 0.02, name: CHEF_EVENTS.footstep, value: 'near' },
      { t: 0.24, name: CHEF_EVENTS.footstep, value: 'far' },
    ],
  },
  {
    hips: {
      y: [
        [0, -0.4],
        [0.11, -3.1],
        [0.22, -0.4],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -38],
        [0.22, 30],
        [0.44, -38],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 30],
        [0.22, -38],
        [0.44, 30],
      ],
    },
  },
);
```

Channels: `x`, `y`, `rot`, `sx`, `sy`, `a`. Rotations are authored in degrees and
converted at compile time. Keys outside the clip duration are a hard error.

Loop modes: `loop`, `once`, `hold`, `pingpong`.

**Additive clips** (`additive: true`) add their delta on top of whatever the base
state produced, instead of replacing it. The boss-warning look-up and the
flight-fire recoil are additive, which is how one flight pose serves both the
drifting and the firing chef, and both co-op players and the wing partner.

## 7. The state machine

Gameplay never calls `play()`. It writes a blackboard once per fixed step:

```ts
interface AnimContext {
  velocityX;
  velocityY;
  runBlend;
  grounded;
  onLadder;
  climbing;
  inputX;
  inputY;
  facing;
  triggers: Set<string>; // one-step edges: hit, throwField, portalEnter…
  flags: Set<string>; // latched states: flying, firing, victory…
  stateTime: number;
}
```

Transitions are declarative:

```ts
{ from: '*', to: 'flightHit', duration: 0.05, priority: 90,
  when: (c) => c.triggers.has('hit') && c.flags.has('flying') }
```

- evaluated in priority order, then declaration order — deterministic;
- `exitTime` prevents a one-shot (throw, hit) being cut off mid-swing;
- transitions run **before** time advances, so a trigger raised this step starts
  its clip at `t = 0` rather than one frame in. A consequence worth knowing: a
  completed one-shot releases on the _following_ step.

`Chef.writeAnimContext()` is the entire gameplay→animation contract. Adding a
gameplay state means adding a flag there and a transition in the graph. It never
means touching the rig, the clips or the renderer.

Two graphs share the chef clip library: `CHEF_GAMEPLAY_GRAPH` (Stack Phase,
warning, launch, Boss Flight, results) and `CHEF_SELECT_GRAPH` (join, identity
swap, presentation swap, ready, disconnect, reconnect).

## 8. Secondary motion

Toques, scarves, apron ties and hair "trail in the acceleration" without any
per-clip authoring. Each is a leaf bone driven by a critically-damped angular
spring:

```
target    = gravity + velocityX * drag + velocityY * lift   (clamped)
angAccel  = (target - angle) * stiffness - angVel * damping
```

Integrated on the **fixed** simulation step, so it is replay-safe and identical
at 30 fps and 240 fps. `DollRig.teleport()` reseeds the springs so a respawn
never lurches.

## 9. Clip events

Clips carry timestamped events that the gameplay layer subscribes to:

| Event                      | Consumer                                         |
| -------------------------- | ------------------------------------------------ |
| `chef.footstep`            | substrate-specific footstep SFX (near/far foot)  |
| `chef.ladderRung`          | metal rung SFX                                   |
| `chef.landSquash`          | dust puff particle                               |
| `chef.fieldSpatulaRelease` | spawns the finite Stack Phase spatula            |
| `chef.flightSpatulaFire`   | spawns a Boss Flight spatula, plays the fire cue |
| `chef.launchPush`          | launch whoosh                                    |
| `chef.swapSparkle`         | identity / presentation swap sparkle             |
| `chef.volleySync`          | synchronised sibling finisher                    |

Events fire from clip time, not wall time, so audio stays locked to the visible
contact frame even when the clip is time-scaled by run speed.

## 10. The Doll Lab

`Title → DOLL LAB` opens an inspection tool that ships with the game:

- every clip in both libraries, stepped forward and back;
- all four chef variants and both slot accents, live-swapped;
- every face expression;
- bone overlay, playback speed, pause;
- a live event readout.

It is the fastest proof that the eight visual combinations really are one rig,
and the quickest way to review a new clip without hunting for the gameplay state
that triggers it.

| Key     | Action                       |
| ------- | ---------------------------- |
| `Tab`   | chef ↔ food foe              |
| `← →`   | previous / next clip         |
| `↑ ↓`   | previous / next variant      |
| `C`     | Player 1 red ↔ Player 2 blue |
| `B`     | bone overlay                 |
| `F`     | cycle face expression        |
| `Space` | pause                        |
| `[` `]` | playback speed               |

## 11. Adding a new character

1. Write a `DollDef`: bones, parts, cloth chains.
2. Paint the parts in `src/game/art/` and register them in `atlas.ts`.
3. Author a clip library with `clip()`.
4. Declare an `AnimGraphDef` mapping blackboard state to clips.
5. Construct a `DollRig` and a `DollView`.

Steps 1-4 are pure data and are unit-testable without a browser. Nothing in the
gameplay systems needs to know the character exists until step 5.

## 12. Adding a new animation to an existing character

1. Author the clip in the character's clip file.
2. Add an `AnimStateDef` referencing it.
3. Add the transition(s) that reach it.
4. If gameplay must drive it, add the trigger or flag in
   `Chef.writeAnimContext()`.

No renderer changes, no art pipeline changes, no new sprite sheets.

## 13. Known limitations

- The turntable is a cut-out pinch-through-zero, not a true 3D turn. It reads
  correctly for a paper puppet and keeps the emblem legible via `counterFlip`,
  but it is not a substitute for authored three-quarter and rear art.
- Faces are pre-rendered per expression rather than blended, so there are six
  discrete expressions per variant instead of a continuous space.
- Cloth chains are single-bone. A multi-segment scarf would need chained springs.
- Parts are axis-aligned quads; there is no mesh deformation, so extreme squash
  relies on non-uniform bone scale rather than true bending.
