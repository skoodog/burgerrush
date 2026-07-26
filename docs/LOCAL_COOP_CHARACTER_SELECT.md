# Sal & Pep local co-op character-select specification

## 1. Product contract

Local two-player mode is a **shared-screen, same-machine** game for two independently assigned input devices. Two gamepads are the primary target, and keyboard-plus-gamepad must also work. The character-select flow must be fully operable by keyboard or controller without requiring a mouse.

The two sibling identities are:

- **Chef Sal**, represented by the letter `S`;
- **Chef Pep**, represented by the letter `P`.

Sal and Pep are names and character identities, not gender locks. Each identity supports a **Boy** presentation and a **Girl** presentation. Both players may choose the same gender presentation. Selection never changes movement, hitboxes, health, fire cadence, damage, scoring, invulnerability, or ranked eligibility.

## 2. Data model: keep identity, presentation, player slot, and device separate

Do not create one monolithic character enum such as `SAL_GIRL_RED`. Model the independent concerns explicitly:

```ts
type ChefIdentity = 'sal' | 'pep';
type GenderPresentation = 'boy' | 'girl';
type PlayerSlot = 1 | 2;
type PlayerAccent = 'red' | 'blue';

type PlayerSelection = {
  slot: PlayerSlot;
  identity: ChefIdentity;
  presentation: GenderPresentation;
  accent: PlayerAccent; // derived from slot; never selected independently
  inputDeviceId: string;
  ready: boolean;
};
```

Required invariants:

- Player 1 always derives the **red** accent.
- Player 2 always derives the **blue** accent.
- Accent follows the player slot when identities are swapped.
- `sal` always retains the `S` emblem and `pep` always retains the `P` emblem.
- The emblem color is the player-slot accent.
- Each identity may be occupied by only one local player. Selecting the occupied identity should perform an immediate, animated swap rather than produce a dead-end error.
- Both players may select Boy, both may select Girl, or they may select different presentations.
- All four identity/presentation combinations use identical gameplay configuration and validated collision bounds.

## 3. Visual player-slot language

### Player 1 — red

- warm arcade-red uniform striping;
- red `S` or `P` toque lettering according to identity;
- red HUD frame, nameplate edge, ready pulse, and boss-flight spatula trail accent;
- persistent `1` badge plus a non-color shape marker, recommended **diamond**.

### Player 2 — blue

- saturated cobalt-blue uniform striping;
- blue `S` or `P` toque lettering according to identity;
- blue HUD frame, nameplate edge, ready pulse, and boss-flight spatula trail accent;
- persistent `2` badge plus a non-color shape marker, recommended **circle**.

Only the stripes, lettering, and small trim details change color. The white toque, jacket, apron, skin, hair, ingredient materials, and major silhouette remain authored normally. Color must never be the sole identifier: the slot number, marker shape, identity letter, screen position, and optional `P1`/`P2` label must remain available.

The red player treatment must remain visibly separate from enemy red threat eyes through white keylines, different luminance, and distinct animation grammar. The blue player treatment must remain separate from portals and cold-world hazards through the slot badge and shape marker.

## 4. Character-select flow

Use a two-column select scene in local co-op.

### Join state

1. The first unclaimed keyboard or controller pressing **Start / Enter / South Face Button** claims Player 1 and turns the left panel red.
2. A second, different input source pressing Join claims Player 2 and turns the right panel blue.
3. One physical device may never drive both panels.
4. Show the assigned device glyph and a short device name under each player panel.
5. Do not begin the run until both panels are joined and ready.

### Selection state

Each player independently controls only their panel:

- left/right: choose **Sal** or **Pep**;
- up/down or shoulder buttons: choose **Boy** or **Girl**;
- confirm: ready;
- back: unready or leave slot;
- start: begin only when both are ready.

Show:

- a large animated chef preview;
- the identity name and letter;
- a clear `BOY` / `GIRL` selector using text plus icons, not stereotyped color coding;
- the player-slot color applied live to stripes and toque letter;
- platform and Boss Flight control reminders for the assigned device;
- a paired preview once both players are ready.

Identity collision behavior:

- if Player 1 chooses the identity currently held by Player 2, swap the identities between panels while preserving each player's chosen gender presentation and player-slot color;
- play a quick crossing-card animation and a light utensil click;
- never silently change a player's gender presentation or device assignment during the swap.

### Ready and countdown state

- Each player confirms independently.
- A ready panel locks its selection but can be unlocked with Back.
- Once both are ready, display a short `RED READY / BLUE READY` beat and begin a three-count or immediate arcade wipe.
- Any disconnect during the countdown cancels the countdown and opens rebind state.

## 5. Input assignment and reconnection

Implement a persistent `InputDeviceRegistry` rather than reading whichever controller last emitted input.

Required behavior:

- support two simultaneous Gamepad API devices;
- support keyboard-plus-gamepad;
- keyboard may claim either slot according to join order;
- shared-keyboard two-player mappings are optional for the first milestone, but the architecture must not prevent them;
- ignore gameplay input from unassigned devices except a deliberate pause/join action;
- preserve assignment across scenes and map flips;
- pause immediately when an assigned gamepad disconnects;
- present `RECONNECT PLAYER 1` or `RECONNECT PLAYER 2` using the correct red/blue treatment plus slot number/shape;
- allow a replacement unassigned controller to claim the disconnected slot;
- do not change identity, gender presentation, score ownership, or player color after reconnection;
- avoid relying solely on browser gamepad index because indices can change after reconnect; retain a session device token and rebind deliberately.

## 6. Runtime gameplay behavior

### Stack Phase

- Both chefs are independently controlled on the same single-screen map.
- Each chef retains their player-slot color accents and non-color marker.
- Ingredient progress, score ownership, hit invulnerability, and field-spatula use must be attributable to the correct player.
- Shared-screen camera and procedural maps must not strand one player outside the readable play field.
- Co-op uses shared run aprons unless later balance testing supports a documented alternative.

### Boss Flight

- Both players move independently and fire unlimited spinning spatulas.
- Player 1's stream has a restrained red trail accent and diamond/`1` origin marker.
- Player 2's stream has a restrained blue trail accent and circle/`2` origin marker.
- Accent does not change damage, cadence, collision, scoring, or boss response.
- When effects become crowded, reduce particles before reducing either player's projectile readability.
- The boss and condiment warnings must remain color-independent.

## 7. Art-production matrix

Create four reusable base character variants:

1. Sal — Boy;
2. Sal — Girl;
3. Pep — Boy;
4. Pep — Girl.

Use one shared gameplay skeleton and matched proportions wherever practical. Differences should come from face design, hair, small costume tailoring, and animation personality—not sexualized anatomy, extreme height changes, or different collision silhouettes.

Create an accent-mask material or equivalent render pass for stripes, toque lettering, scarf/button trim, HUD portrait edge, and selected projectile effects. Produce red and blue exports from the same approved source so palette variants remain perfectly aligned.

The production matrix therefore resolves to eight runtime visual combinations:

| Identity | Presentation | P1 red | P2 blue |
|---|---|---:|---:|
| Sal | Boy | required | required |
| Sal | Girl | required | required |
| Pep | Boy | required | required |
| Pep | Girl | required | required |

Do not duplicate physics or animation state machines for these eight visual combinations.

## 8. Persistence, replay, leaderboard, and analytics

Persist the last chosen identity and gender presentation per local profile/device when available, but derive red/blue from current player slot every session.

Replay and score records must include:

- game version;
- run seed;
- co-op flag;
- Player 1 identity and presentation;
- Player 2 identity and presentation;
- normalized input streams by player slot;
- no hardware serial number or sensitive device identifier.

Recommended local analytics events:

- `local_coop_selected`;
- `input_device_joined`;
- `input_device_rebound`;
- `chef_identity_selected`;
- `gender_presentation_selected`;
- `identity_swap`;
- `player_ready`;
- `coop_run_started`;
- `coop_run_completed`.

## 9. Accessibility requirements

- Every select action is available by keyboard and controller.
- Focus and ownership are visible without relying on color.
- Gender options use text labels and equivalent icons; do not communicate Boy as blue and Girl as pink.
- P1/P2 markers remain visible in high-contrast mode.
- Provide an optional player-arrow locator during hectic platform or boss play.
- Allow independent control remapping after device assignment.
- Provide separate rumble toggles or intensity where supported.
- Captions identify `PLAYER 1 HIT` and `PLAYER 2 HIT` with slot number and shape.

## 10. Acceptance tests

The feature is complete only when all of the following pass:

1. Two gamepads can join separately and control separate panels.
2. Keyboard plus one gamepad can join in either order.
3. One device can never control both players after assignment.
4. Sal and Pep each offer Boy and Girl presentation.
5. Both players can choose Boy; both can choose Girl.
6. Selecting an occupied identity swaps identities without changing presentation, device, or slot color.
7. Player 1 remains red after every identity and gender change.
8. Player 2 remains blue after every identity and gender change.
9. Red/blue affect stripes and toque lettering as specified.
10. P1/P2 remain distinguishable with a simulated monochrome or common color-vision-deficiency filter.
11. All identity/presentation variants use identical movement, collision, fire cadence, damage, and scoring values.
12. Both selected variants appear correctly in Stack Phase, warning launch, Boss Flight, results, and replay.
13. Controller disconnect pauses and a replacement controller can rebind to the correct slot.
14. Reconnection preserves identity, presentation, color, score ownership, and deterministic replay.
15. Boss Flight shows separately attributable red and blue unlimited spatula streams without a gameplay advantage.
16. Save migration handles older `Chef P / Chef S` records by mapping them to `pep / sal` and the prior default presentations.
