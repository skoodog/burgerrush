# Burger Rush — autonomous Claude Code master prompt

## COPY-PASTE MASTER PROMPT

You are the autonomous studio lead, principal gameplay engineer, technical director, procedural-design specialist, enemy-AI designer, side-scrolling boss-combat designer, art director, audio director, UX designer, accessibility lead, and release QA owner for an original browser arcade game with the working title **Burger Rush**.

Do not merely write a design document. Inspect the repository, create the project, implement the game, run it, test it, iterate on it, and leave a production-quality playable build.

Do not ask routine clarifying questions. Make sensible, documented decisions. Ask only when an external action truly cannot be simulated locally, such as signing into a paid service. Even then, continue every unblocked part of the build with adapters and placeholders.

### 0. Creative and legal boundary

This game may use the familiar *idea* of a chef traversing burger ingredients on ladder-and-platform stages while food monsters pursue them. It must not copy the protected expression of BurgerTime or any other existing game.

Never copy, trace, import, scrape, or closely recreate:

- any original sprite, cabinet art, logo, lettering, animation, sound, tune, character name, enemy design, palette, text, or exact map geometry;
- the original opening level pixel-for-pixel or proportion-for-proportion;
- screenshots as implementation assets;
- source code, ROM data, tile maps, or audio extractions.

Create an original tutorial map with analogous readability but different geometry, proportions, route logic, burger placement, art, and pacing. Use only original characters named in this brief or new names you create. Keep the title modular because `Burger Rush` is a working title pending clearance.

### 1. North-star experience

The game should feel as though an excellent lost 1980s arcade cabinet was rediscovered and rebuilt with modern responsiveness, procedural depth, cinematic transitions, accessibility, and fair enemy intelligence.

The emotional rhythm of every level is:

1. **Read** the map instantly.
2. **Choose** a route.
3. **Commit** across ingredient segments.
4. **Panic** when enemies close routes.
5. **Outsmart** them through ladders, drops, portals, and prediction.
6. **Finish** the burger with seconds remaining.
7. **Hear** the klaxon and launch Chef Pep and Chef Sal through the top of the stage.
8. **Dodge** a giant flying burger's projectile patterns while both siblings fire unlimited spinning spatulas.
9. **Defeat** the boss and chase a better score or seed.

Permanent pillars:

- **Read in one glance.**
- **Panic with fairness.**
- **Physical comedy.**
- **One more run.**
- **Depth behind simplicity.**
- **Two-act escalation.** Every level begins as a burger-platform chase and climaxes as a short, readable side-scrolling boss flight.

### 2. Target platforms and modes

Ship first as an installable browser PWA that works offline after the first load.

Primary presentation:

- landscape 16:9;
- crisp high-definition 2.5D presentation with pre-rendered or real-time stylized 3D characters inside deterministic 2D gameplay;
- responsive letterboxing and resolution-independent UI;
- desktop keyboard;
- gamepad;
- touch controls;
- mouse only for menus;
- modern Chromium, Firefox, and Safari compatibility.

Modes:

1. **Arcade Run** — ranked, standard rules, deterministic level and boss-pattern seeds.
2. **Daily Rush** — one shared daily seed, one leaderboard.
3. **Practice Kitchen** — level/seed select, adjustable speed and timer, boss-pattern practice, no ranked submission.
4. **Attract Mode** — cabinet-style automated demo showing both the platform chase and a short S&P boss-flight sequence.
5. **Endless Rush** — unlocked after the first complete zone; escalating procedural stages and boss decks.
6. **Local Sibling Co-op** — optional shared-screen mode for two independently assigned local devices. Players control Chef Sal and Chef Pep, independently choose Boy or Girl presentation, and are identified by fixed player-slot treatments: Player 1 red striping/lettering and Player 2 blue striping/lettering. Two gamepads and keyboard-plus-gamepad are required input paths; the solo game remains the baseline.

### 3. Recommended architecture

Use a lean, data-driven TypeScript architecture.

Preferred stack:

- Vite;
- TypeScript strict mode;
- Phaser for all 2D gameplay and UI scenes;
- Three.js only for the front/back render-texture flip and optional menu diorama;
- Howler.js or a similarly small audio layer with Web Audio fallback;
- Vitest;
- Playwright;
- ESLint;
- Prettier;
- vite-plugin-pwa;
- IndexedDB/localStorage persistence adapter;
- optional Supabase leaderboard adapter behind an interface;
- no mandatory backend for local play.

Do not run the simulation through React. If a React shell is added, keep it outside the game loop and justify it. Prefer no React unless it clearly improves account/leaderboard screens.

Use:

- fixed-step deterministic simulation;
- seeded RNG with named streams for map, AI, pickups, and cosmetic variance;
- event-driven presentation;
- object pools for particles, projectiles, score popups, and repeat enemies;
- data definitions for chef identity, gender presentation, player slot, device assignment, ingredients, enemies, bosses, projectile families, worlds, difficulty, scoring, and audio;
- explicit state transitions between platform play, boss warning, launch, flight combat, and results;
- explicit scene lifecycle cleanup;
- testable pure functions for scoring, map generation, AI decisions, and coordinate transforms.

Create a coherent folder structure similar to:

```text
src/
  app/
  game/
    config/
    scenes/
    systems/
    entities/
    components/
    input/
    localCoop/
    ai/
    procgen/
    levels/
    scoring/
    audio/
    effects/
    ui/
    accessibility/
    persistence/
    leaderboard/
    analytics/
    bosses/
    projectiles/
  assets/
  styles/
scripts/
tests/
  unit/
  e2e/
  fixtures/
docs/
```

Adjust when implementation evidence supports a better structure.

### 4. Required game flow and screens

Implement the complete front-to-back experience.

#### Boot and attract flow

1. Boot/loading screen with a minimal animated ticket rail.
2. Original studio splash placeholder.
3. Working-title logo reveal.
4. Attract mode:
   - auto-plays a short route on the first tutorial map;
   - cuts to score table and enemy cards;
   - shows the klaxon warning, sibling launch, and a brief giant-burger boss barrage;
   - auto-plays a different route;
   - returns to “Press Start.”
5. Any input exits attract mode.

#### Main menu

- Arcade Run
- Daily Rush
- Practice Kitchen
- Leaderboard
- How to Play
- Settings
- Credits

#### Chef and local player select

The central heroes are an original sibling duo whose **identity is independent from gender presentation**:

- **Chef Sal (`S`)** — quick-thinking, playful, observant, and precise. The `S` identity controls the name, toque emblem, personality beats, and animation flavor—not gender.
- **Chef Pep (`P`)** — upbeat, impulsively brave, energetic, and expressive. The `P` identity likewise remains available in either gender presentation.

Each identity has two equal visual presentations labeled **Boy** and **Girl**. Both use the same gameplay configuration, collision bounds, movement, health, scoring, fire cadence, damage, and ranked eligibility. Both players may choose the same gender presentation. The first-run defaults may preserve the earlier girl-Sal/boy-Pep pairing, but the game must never treat those defaults as a rule.

Collectively they are the **S&P siblings**. Do not use salt or pepper shakers as enemies, mascots, projectiles, or supporting characters; the S&P identity belongs to Sal and Pep.

Keep these concerns separate in code:

```ts
type ChefIdentity = 'sal' | 'pep';
type GenderPresentation = 'boy' | 'girl';
type PlayerSlot = 1 | 2;
type PlayerAccent = 'red' | 'blue';
```

Do not encode identity, gender, slot color, and input source into one character enum. Create four reusable base visual variants—Sal Boy, Sal Girl, Pep Boy, Pep Girl—and derive red/blue uniform accents from player slot through a material mask, palette export, or equivalent deterministic system.

##### Solo select

In solo mode, the player chooses Sal or Pep and chooses Boy or Girl presentation for the lead chef. At every boss transition both siblings appear: the selected lead is controlled by the player and the other identity becomes a deterministic wing partner using its saved or default presentation. Ranked mechanics remain identical for all choices.

##### Local two-player select

Local co-op is a shared-screen same-machine mode. Two gamepads are the primary path, and keyboard-plus-gamepad must also work. The select scene is fully navigable by keyboard or controller and must not require a mouse.

- The first unclaimed input source pressing Join claims **Player 1**, shown in red.
- A second, different input source claims **Player 2**, shown in blue.
- One physical input source may never control both panels.
- Each player independently chooses Sal or Pep and Boy or Girl.
- Each identity may be occupied once. Selecting the identity held by the other player performs a clean animated swap while preserving each player's gender presentation, input device, and player-slot color.
- Both players confirm independently; the run begins only when both are ready.
- An assigned-controller disconnect pauses the flow and opens a slot-specific reconnect screen without changing selection.

Player-slot color is mandatory and follows the player, not the chef identity or gender:

- **Player 1:** red uniform striping and red `S` or `P` toque lettering;
- **Player 2:** blue uniform striping and blue `S` or `P` toque lettering.

Carry the same restrained accent into HUD frames, ready states, player locators, and boss-flight spatula trails. Color is never the only distinction: also show slot number, identity letter, screen position, and a shape marker such as P1 diamond / P2 circle.

Show:

- two large animated previews in co-op and one large preview in solo;
- identity name, `S` or `P` emblem, and Boy/Girl selector;
- live red/blue stripe and lettering preview based on player slot;
- assigned keyboard/controller glyphs;
- platform and flight control reminders for each assigned device;
- accessibility presets;
- clear join, ready, unready, swap, reconnect, confirm, and back behavior;
- no stat differences;
- a final paired sibling pose before the round starts.

Implement the complete contract in `docs/LOCAL_COOP_CHARACTER_SELECT.md`.

#### World map

Create a readable “Kitchen Circuit” route:

1. Midnight Diner
2. Drive-In Griddle
3. Freezer Maze
4. Neon Food Court
5. Food Factory
6. Sky Kitchen
7. Endless Rush

The map should feel like an arcade board-game path. It may preview front/back dimensional stages in the distance.

#### Round intro

Show for approximately 1.5 seconds:

- world and round;
- map seed;
- burger target count;
- enemy portraits and simple behavior icons;
- whether a secret burger is required, possible, or absent;
- a compact preview of the boss projectile families currently unlocked;
- “60 SECOND RUSH”;
- reduced-motion-safe transition.

#### HUD

Always readable:

- score;
- high score;
- exact seconds/tenths during final 10 seconds;
- lives/aprons;
- burgers completed/required;
- ingredient progress;
- field-spatula inventory after level 10;
- combo multiplier;
- front/back face indicator on dimensional maps;
- pause;
- warning cues that do not rely on color alone;
- in local co-op, persistent P1/P2 identity markers using slot number, identity letter, shape, and red/blue accent.

During boss flight replace ingredient HUD elements with:

- giant-burger boss health shown as ingredient armor layers plus a numeric accessibility option;
- lead-chef and wing-partner status in solo, or separate P1/P2 status in co-op with number/shape identifiers in addition to red/blue;
- score, high score, lives, and combo;
- quick-clear bonus clock, which reaches zero without ending the fight;
- an infinity spatula icon or no ammo readout at all—never a depleting boss-ammo counter;
- incoming-pattern iconography using shape, label, animation, and sound rather than color alone.

#### Pause

- resume;
- restart round;
- controls;
- settings;
- quit to menu;
- clearly indicate ranked run consequences;
- expose a controller-rebind action when a local co-op device disconnects.

#### Results

- base score;
- tread score;
- ingredient drops;
- enemy crush/dispatch score;
- combo score;
- burger score;
- secret burger score;
- platform time bonus;
- boss damage, armor-break, projectile-clear, and quick-clear score;
- no-hit platform, no-hit boss, sibling-sync, and efficiency bonuses;
- leaderboard rank movement;
- seed replay;
- next round;
- instant retry after failure.

#### Game over and initials

Create a fast retro entry flow:

- three-character arcade initials for local cabinet identity;
- optional longer display name for remote leaderboard;
- sanitize all input;
- retain keyboard, gamepad, and touch usability;
- never block local play on sign-in.

### 5. Core level rules

Every ranked level has two mandatory acts:

1. **Stack Phase** — a 60-second platform-and-ladder burger assembly challenge.
2. **Boss Flight** — the S&P siblings launch into a side-scrolling battle against a giant flying burger.

The Stack Phase begins with exactly **60.0 seconds** after the ready animation. The timer starts on the first accepted movement input or after a short maximum grace period. Completing all required burgers before zero freezes the timer, awards the remaining-time score, and begins the boss-warning transition. A level is not cleared until the flying burger boss is defeated.

The player has three aprons/lives per run. Contact with a harmful enemy during the Stack Phase:

- freezes action briefly for readable hit-stop;
- costs one apron;
- deducts three seconds;
- respawns the chef at the nearest validated safe checkpoint;
- grants 1.25 seconds of visible invulnerability;
- preserves ingredient progress;
- never permits an immediate spawn hit.

During Boss Flight, a hit on the player-controlled lead chef costs one apron, triggers readable knockback and invulnerability, and resumes at a safe flight checkpoint while preserving boss damage. The AI wing sibling may be briefly knocked out of formation and return after a telegraphed delay without consuming an apron. In local co-op, use shared run lives, fair independent invulnerability, and unambiguous P1/P2 hit attribution using slot number and shape in addition to red/blue.

The boss has a quick-clear bonus clock, initially 30 seconds. Reaching zero removes the remaining quick-clear bonus and escalates attacks, but does not create an unwinnable hard timeout. Unlimited boss-flight spatulas remain available throughout.

A run ends when:

- the Stack Phase timer reaches zero before required burgers are complete; or
- no aprons remain in either act.

Award an extra apron at a data-driven score threshold, at most once per run unless later tuning proves otherwise.

### 6. Chef movement, controls, and device assignment

Movement must be simple enough for an arcade cabinet and refined enough for a modern controller.

Stack Phase actions per controlled chef:

- move left/right;
- climb up/down;
- context-sensitive portal entry;
- throw/use one of three collectible field spatulas from level 10 onward;
- pause.

Boss Flight actions per controlled chef:

- move freely in eight directions within safe screen bounds;
- hold fire for continuous spinning-spatula volleys;
- pause.

Boss-flight spatulas are completely unlimited: no ammunition, no pickup requirement, no reload, no cooldown meter, no heat meter, and no relationship to the three collectible Stack Phase spatulas. Use a tuned fire cadence and object pooling for clarity and performance, but never decrement an ammo value.

#### Input-device assignment

Build an explicit `InputDeviceRegistry` and player-slot ownership layer.

- Two simultaneously connected gamepads must be able to claim separate local players.
- Keyboard-plus-gamepad must work in either join order.
- Keyboard may claim Player 1 or Player 2 according to join order.
- Shared-keyboard two-player mappings are optional for the first milestone, but the architecture must allow them later.
- Once claimed, an input source controls exactly one player until it leaves or is deliberately rebound.
- Unassigned devices cannot move a chef.
- Device ownership persists through all scenes, pauses, portals, map flips, boss transitions, and results.
- An assigned gamepad disconnect pauses the game and displays a red/blue plus slot-number reconnect card. A replacement controller can claim that same slot without changing identity, gender presentation, score ownership, or replay channel.
- Do not rely only on browser gamepad index after reconnect; use explicit session assignment and a rebind handshake.

#### Character-select input

Keyboard or assigned gamepad can operate the select scene:

- left/right: Sal or Pep;
- up/down or shoulder buttons: Boy or Girl;
- Enter / south face button: join, confirm, or ready;
- Escape / east face button: back, unready, or leave slot;
- Start: begin when both local players are ready.

Input focus must remain isolated to the owning player panel.

#### Gameplay defaults

Keyboard default for a single assigned keyboard player:

- arrows or WASD: movement/climb;
- Space or Z: portal/context action when needed;
- X or K: throw a field spatula during Stack Phase; hold to fire unlimited spatulas during Boss Flight;
- Enter: start/confirm;
- Escape: pause/back.

Gamepad:

- D-pad/left stick;
- south face button: confirm/context;
- west face button: field spatula in Stack Phase; hold for unlimited boss-flight fire;
- start/menu: pause.

Touch:

- left virtual D-pad or separated directional zones;
- right action/fire button, with an optional accessible auto-fire toggle during Boss Flight;
- adjustable scale, opacity, and position;
- no gesture that conflicts with browser navigation.

Movement requirements:

- deterministic acceleration and max speed;
- immediate enough reversal for arcade play;
- input buffering;
- forgiving ladder snap radius;
- no accidental ladder grabs when holding horizontal unless within a clear intent window;
- no falling through ingredient surfaces;
- brief edge forgiveness;
- clearly separated visual and collision bounds;
- identical collision and movement values for Sal/Pep and Boy/Girl presentations;
- debug overlay for movement graph, bounds, player-slot ownership, and active input source.

### 7. Ingredient traversal and burger assembly

Each burger consists of ordered ingredient layers such as:

- top bun;
- lettuce;
- cheese;
- patty;
- tomato;
- pickle or onion;
- bottom bun.

A layer is a traversable platform subdivided into five to seven tread segments.

Rules:

1. Entering an unpressed segment marks it complete and plays substrate-specific feedback.
2. Progress is visible by shape/compression/footprints, not color alone.
3. Completing all segments arms the layer.
4. The layer drops to its next support after a short readable anticipation.
5. Enemies standing on it are carried down and stunned or defeated according to the drop distance.
6. A layer can cascade into lower layers.
7. All required layers landing on the plate in valid order complete the burger.
8. Ingredient collision and animation must remain deterministic.
9. It must be possible to choose routes that partially prepare several layers or finish one decisively.
10. Enemy interactions with moving layers must not create physics explosions or soft locks.

Add satisfying:

- compression;
- crumbs/leaves/steam particles;
- tiny score popups;
- drop anticipation;
- landing squash;
- plate bounce;
- burger-complete flourish.

Use the substrate audio prompts in `docs/ART_AND_AUDIO_PROMPTS.md`.

### 8. Enemy roster and intelligence

Most rounds use two or three active food monsters. Later rounds may temporarily exceed three only when the threat director confirms sufficient escape capacity.

Required enemies:

#### Sunny-Side Stalker — simple pursuer

- targets the chef’s current navigation node;
- refreshes its path slowly;
- makes occasional deliberate “dumb” choices;
- is easy to bait around ladders;
- communicates decisions with eye direction.

#### Brat Beast — stubborn hunter

- prefers direct horizontal pursuit;
- uses ladders aggressively;
- commits too long to a route and can overshoot;
- moves slightly faster on long platforms;
- is vulnerable to reversals.

#### Pickle Phantom — interceptor

- estimates the chef’s likely location 1–2 seconds ahead;
- prefers choke points and destination ladders;
- can use portals after dimensional stages are introduced;
- pauses visibly before a high-confidence intercept so the player can read it.

#### Onion Ringlets — coordinated duo

- two cute-but-menacing onion-ring creatures with red threat eyes and clearly different silhouettes;
- share a small deterministic blackboard;
- one rolls or hops to pressure the current path while the other selects an escape intersection;
- avoid occupying the same goal unless intentionally pincer-attacking;
- rebound differently from walls and ladders so the pair remains readable;
- periodically miscommunicate at lower difficulty for comedy and fairness.

#### Later variants

- Cheese Creep can briefly block a ladder with a clearly telegraphed melt.
- Tomato Tumbler rolls downhill and must visibly brake before reversing.
- Freezer Burn slides and overshoots on ice.
- Elite variants may require two field-spatula hits after level 15.

There must be no salt-shaker or pepper-shaker enemy family. Search asset manifests, code identifiers, prompts, and UI cards to ensure that retired concept does not return.

#### AI system requirements

Build enemy navigation on a graph containing:

- walk edges;
- ladder edges;
- drop-state updates;
- portal edges;
- face transitions;
- temporary blocked edges.

Each brain has data-driven:

- speed;
- path-refresh interval;
- lookahead horizon;
- target selection;
- mistake rate;
- ladder preference;
- portal preference;
- persistence;
- rage modifiers.

At 15 seconds remaining:

- music and visuals escalate;
- AI update cadence can increase;
- speed can increase modestly;
- predictive enemies can use longer lookahead;
- no enemy may teleport, read future input, ignore geometry, or spawn unfairly.

Implement a global **Threat Director** that:

- scores pressure near the chef;
- limits simultaneous approach angles;
- keeps at least one plausible escape route where topology allows;
- delays an enemy rather than allowing an unavoidable trap;
- manages re-entry telegraphs;
- prevents portal-exit ambushes;
- scales intelligence before raw speed;
- remains deterministic.

Expose an AI debug view showing current goal, planned path, confidence, state, and threat contribution.

### 9. Round and map progression

Interpret “two demo runs, then a simpler second map, then the third map flips” as follows:

#### Round 1 — fixed Tutorial Map A

- original single-screen ladder layout;
- one burger;
- one Sunny-Side Stalker at reduced speed;
- contextual hints;
- exact 60-second rules;
- forgiving checkpoints;
- no copied opening-map geometry;
- ends with a scripted boss-flight tutorial using only slow, widely spaced pickle-disc shots and generous safe lanes.

#### Round 2 — Tutorial Map A rematch

- same fixed geometry for mastery;
- two enemies: Sunny-Side Stalker and Brat Beast;
- hints reduced;
- full scoring and combo behavior;
- alternate burger route emphasis;
- boss rematch adds one clearly telegraphed ketchup lane while retaining the pickle tutorial pattern.

#### Round 3 — fixed Map B

- second unique map;
- deliberately lower geometric complexity but more active pursuit;
- two burgers or one larger burger;
- introduces Pickle Phantom or the Onion Ringlets;
- teaches route prediction and enemy manipulation;
- boss adds the mustard fan/wave pattern and begins shuffling attack order from a deterministic pattern deck.

#### Round 4 — fixed Map C, the third unique map

- introduces the true front/back dimensional stage;
- contains one guaranteed required secret burger;
- the secret burger is visible as a shaded parallax silhouette behind the front face;
- one obvious portal leads to it;
- map flip is fully taught and fair;
- enemies can follow after a telegraphed delay;
- boss adds slow mayo dollops that split or leave brief cloud zones, with strong outlines and generous telegraphs.

#### Rounds 5–9

- seeded procedural maps;
- controlled front/back variants;
- required, optional, or absent secret burgers;
- decoy depth silhouettes only after the mechanic is understood;
- new world substrates and mild hazards;
- difficulty increases mainly through topology and intelligence;
- every level still concludes with a seeded boss-flight pattern deck themed to its world.

#### Round 10+

Introduce exactly three collectible **field spatulas** in the Stack Phase:

- exactly three field-spatula pickups are available per Stack Phase;
- field pickups are placed in reachable but route-relevant positions;
- the Stack Phase HUD shows three finite slots;
- pressing throw launches one field spatula in the chef’s facing direction;
- it spins visibly through the air along the platform path;
- it can travel left or right;
- no auto-aim;
- the first standard enemy struck is dispatched for the rest of the Stack Phase;
- line-up hits can dispatch multiple standard enemies and award a combo;
- it stops at a solid barrier or leaves the stage;
- missed field throws are lost;
- elites from level 15 onward may require two hits;
- finite field spatulas may not affect or trivialize boss-flight encounters;
- the finite field mechanic is available through a debug level selector for testing before natural progression; it must never alter unlimited Boss Flight fire.

#### Round 15+

- multi-face maps with more subtle portal logic;
- elite enemy traits;
- conveyors, ice, vents, and timed service doors;
- never combine more than two new rules in one round.

#### Round 20+ / Endless

- procedural world rotation;
- escalating threat budget;
- daily and endless seed leaderboards;
- deterministic mutators;
- no impossible speed creep;
- boss variations add armor modules, motion paths, and pattern combinations without unreadable bullet density.

### 10. Mandatory S&P boss-flight finale

Every completed Stack Phase must transition into a short side-scrolling boss encounter. This is a defining half of the game, not an occasional minigame.

#### Warning and launch sequence

1. Freeze the completed stage on a celebratory pose and stop the 60-second music stems cleanly.
2. Sound an original two-pulse klaxon siren.
3. Overlay large original 1980s-inspired gradient lettering reading exactly **`BOSS COMING!`**.
4. Directly beneath it, render **`ボス接近！`** in a compatible Japanese display face. Treat this as localization text, not generated image lettering.
5. Use chromatic edge shadows, a subtle scanline shimmer, and warning shapes, but do not copy the typography, warning screens, sound, or composition of any existing shooter.
6. Chef Pep and Chef Sal—using the selected Boy/Girl presentations—look upward, crouch, jump, and fly through the top screen boundary together. Their toques, scarves, and apron ties trail in the acceleration.
7. Transition through a fast vertical camera chase and fade/wipe into an original horizontal flight arena themed to the current world.
8. Reduced-motion mode replaces the shake, zoom, and high-speed launch with a short two-card warning and depth wipe while keeping identical timing and control readiness.

The full warning-to-control handoff should normally take 2.0–2.8 seconds and remain skippable only after the first viewing in Practice mode. Ranked timing and score cannot be affected by skipping.

#### S&P flight controls and firing

- The selected Sal or Pep variant is the lead in solo play.
- The unselected sibling follows in a deterministic offset formation, avoids covering the lead, and auto-fires whenever the lead fires; neither sibling may be visually omitted from the volley.
- In local co-op, Player 1 and Player 2 move and fire independently from their assigned devices.
- Both Sal and Pep visibly fire their own parallel streams of spinning spatulas.
- Holding the fire input creates continuous automatic fire at a tuned cadence, initially 6–8 throws per second **per chef**, producing two simultaneous readable streams.
- Ammunition is unlimited for the entire boss encounter. Never spawn ammo pickups, never show a finite count, never consume Stack Phase inventory, and never implement reload, heat, or durability.
- Use projectile pooling, deterministic spawn frames, readable lane offsets, and conservative trail effects so two streams remain legible on low-power devices.
- In local co-op, Player 1's projectile stream carries a restrained red accent and P1 diamond/`1` origin marker; Player 2's stream carries a restrained blue accent and P2 circle/`2` origin marker. These accents never alter cadence, damage, collision, scoring, or boss behavior.
- When effects become crowded, reduce particles and trail persistence before reducing either player's projectile clarity.
- The chefs face right by default; spatulas travel horizontally toward the boss. Vertical movement is for dodging and lane selection, not free-aiming.
- Give Sal and Pep slightly different throw poses while keeping all ranked gameplay values identical across identity and gender presentation.

#### Giant flying burger boss

Create an original modular boss family, working name **The Dread Stack**. It is a huge flying anthropomorphic burger with cute-scary menace: red threat eyes, expressive brows, readable mouth, appetizing tactile ingredients, no gore, no photoreal body horror, and no resemblance to an existing game character.

The boss occupies the right side of a horizontal arena and exposes ingredient armor layers. Spatula hits deal deterministic damage; armor layers visibly crack, compress, and fall away as harmless food confetti. Vulnerable periods must be telegraphed. Do not require pixel-perfect shooting.

Required projectile families:

1. **Pickle discs** — small spinning green projectiles using straight lanes, staggered bursts, gentle arcs, and later boomerang returns. Their circular silhouette and crisp brine-click cue identify them. Basic discs may be destroyed by spatulas for a small capped score.
2. **Ketchup jets** — thick red streams that telegraph with a nozzle shake and lane marker before firing. They may sweep or hold a horizontal lane and cannot be erased by normal spatulas.
3. **Mustard waves** — yellow three-way fans, sine-wave ribbons, or alternating corkscrews with predictable gaps. Their triangular/forked warning icon distinguishes them without color.
4. **Mayo dollops** — slow white blobs with dark outlines that either split once into smaller droplets or leave a short-lived cloudy exclusion zone. Never create opaque screen-filling white effects.

Each family needs a unique silhouette, motion grammar, warning icon, pre-fire animation, audio motif, and high-contrast treatment. Accessibility must not rely on red/green/yellow/white distinction.

#### Boss pacing and progression

- Level 1: pickle-only tutorial, low boss health, large safe zones.
- Level 2: pickle plus one ketchup lane.
- Level 3: mustard patterns unlock.
- Level 4: mayo unlocks and the boss begins more active vertical movement.
- Levels 5–9: deterministic pattern decks combine two or three families with cooldowns and fairness validation.
- Level 10+: the platform phase gains three collectible field spatulas, but boss-flight ammo remains unlimited and unchanged.
- Every fifth level may use a longer multi-phase Grand Stack variant, while ordinary bosses should remain a brisk 20–40 second climax for a competent player.
- Later variants may add bun rams, lettuce debris, detachable condiment pods, and world-specific hazards only after the four core patterns are mastered.
- Never exceed a data-driven simultaneous-threat budget. Always preserve at least one readable safe corridor where geometry permits.

The quick-clear bonus clock starts at 30 seconds. At zero, the boss enrages modestly and the bonus stops; the encounter continues until the boss is defeated or the run loses all aprons.

#### Boss completion

On defeat:

- apply a brief hit-stop and synchronized final S&P spatula volley;
- break the boss into harmless ingredient pieces that arc toward a plate or world-appropriate landing zone;
- show a sibling victory beat;
- tally Stack Phase and Boss Flight scores separately and together;
- advance only after the boss defeat state is confirmed;
- persist the exact boss-pattern seed in replay and leaderboard records.

### 11. Procedural map generator

Build a graph-first deterministic generator, not random tile noise.

#### Inputs

- run seed;
- round number;
- world;
- desired face count;
- burger count;
- platform budget;
- ladder budget;
- portal budget;
- enemy budget;
- secret classification;
- hazard budget;
- target optimal completion range.

#### Graph grammar

Represent:

- platform spans as traversable intervals;
- ladders as directed or bidirectional edges;
- ingredient layers as dynamic platform nodes;
- plates as terminal assembly nodes;
- portals as face-transform edges;
- safe spawns;
- checkpoints;
- enemy-only or player-only restrictions when justified;
- hazards;
- depth silhouettes and clues.

Generate meaningful loops. Avoid pure trees that make pursuit unavoidable. Ensure enough intersections for route choice.

#### Validation

Every accepted map must pass:

1. all required tread segments reachable;
2. all required burgers completable in order;
3. all required portals reachable;
4. every portal destination has a safe arrival cell;
5. no required goal depends on a random enemy interaction;
6. no permanent one-way trap unless intentionally telegraphed and escapable;
7. at least one complete enemy-free route under a target optimal time, initially about 36–44 seconds;
8. estimated novice route has a reasonable chance within 60 seconds on onboarding maps;
9. spawn separation constraints;
10. threat-director escape metrics;
11. front/back coordinate transform consistency;
12. no overlapping ladders, plates, or unreachable tread cells;
13. no ingredient drop invalidates the only required path;
14. reduced-motion transition does not alter simulation outcome.

Create:

- `npm run validate:maps -- --seed <seed>`;
- `npm run validate:maps -- --count 1000`;
- `npm run simulate:runs -- --count <n>`;
- failing-seed fixtures;
- ASCII or SVG debug diagrams;
- property tests;
- a deterministic bot for bounded completion estimates.

Reject invalid maps and regenerate from a derived retry seed. Record the accepted retry index so reproduction remains exact.

### 12. Front/back 3D map-flip system

The dimensional transition is a signature feature and must look physically convincing without turning gameplay into uncontrolled 3D.

Implementation:

1. Gameplay exists on discrete 2D faces.
2. On valid portal entry, lock new damage and queue the transition.
3. Freeze simulation only at a defined fixed-step boundary.
4. Render current and destination Phaser scenes/faces to textures.
5. Present those textures on opposite sides of a lightweight Three.js slab or cube.
6. Pull the camera back slightly.
7. Rotate exactly 180 degrees with a controlled easing curve.
8. At midpoint, show side thickness, ladders, ingredient shadows, and distant burger silhouettes.
9. Transform all persistent entity coordinates through a tested mapping.
10. Resume on the destination face after the frame is visually stable.
11. Grant brief visible arrival protection.
12. Enemies that follow enter after their own telegraphed delay.
13. Dispose render targets, materials, geometries, and listeners after use.
14. In reduced-motion mode, use a short depth-aware crossfade/wipe with the same timing and state transform.

The first dimensional map has one obvious portal and one required secret burger. Later maps can:

- place multiple portals;
- use optional bonus secret burgers;
- show silhouettes on either face;
- include decoys;
- make enemies choose a different portal;
- rotate around a different axis for presentation only, while preserving discrete face logic.

Do not let the camera effect conceal a hit or consume meaningful timer time unfairly. Choose one consistent rule: either pause the timer during the locked transition or count a fixed, clearly documented transition cost. Prefer pausing both timer and simulation for the short transition.

### 13. Secret burger system

Secret burgers are depth goals, not arbitrary hidden collectibles.

Classifications:

- `required-guided`;
- `required-clued`;
- `optional-bonus`;
- `absent`;
- `decoy-present` only after round 6.

Clues:

- parallax silhouette;
- faint portal rim;
- periodic low-frequency shimmer;
- ingredient-shaped shadow;
- enemy behavior near a portal;
- one stronger clue at 20 seconds remaining if a required secret remains.

Scoring:

- required secret burger completes round obligations;
- optional secret burger awards significant points and combo time;
- decoys never consume an unrecoverable amount of time;
- the level intro states whether a secret is required, possible, or absent, unless a special unranked mystery mode is later added.

### 14. Scoring and combos

Implement an explicit data-driven score table, initially:

- new tread segment: 10;
- complete ingredient layer: 250;
- ingredient drop landing: 100;
- enemy carried one level: 400;
- enemy flattened/defeated by ingredient: 1,000;
- second enemy in same drop: 1,500;
- third enemy in same drop: 2,500;
- standard burger complete: 5,000;
- required secret burger: 7,500;
- optional secret burger: 10,000;
- field-spatula dispatch: 750;
- multi-enemy field-spatula line-up: escalating 750 / 1,500 / 3,000;
- Stack Phase remaining-time bonus: 100 per whole second;
- boss ingredient-armor break: 500 per minor plate and 1,500 per major layer;
- destructible pickle disc: 25, capped per encounter to prevent farming;
- boss defeat: 5,000 plus level-scaled health multiplier;
- boss quick-clear bonus: 250 per whole second remaining on the 30-second bonus clock;
- no-hit Stack Phase: 3,000;
- no-hit Boss Flight: 3,000;
- sibling-sync bonus for keeping the wing chef active through the full boss: 1,500;
- all burgers with no wasted portal trip: 1,500;
- all three field spatulas unused after level 10: 1,500;
- full tread efficiency bonus: data-driven;
- run streak multiplier: capped and clearly shown.

Tune only after bot and human-feel tests. Prevent score farming through respawns, repeated portal crossing, or reversible ingredient states.

Every scoring event must produce a structured event suitable for:

- HUD;
- replay;
- validation;
- analytics;
- leaderboard verification.

### 15. Leaderboard and replay integrity

Leaderboards:

- local all-time;
- local per-seed;
- daily;
- weekly;
- endless;
- remote adapter-ready.

Store:

- initials/display name;
- score;
- round reached;
- duration;
- mode;
- seed chain;
- selected lead chef/cosmetic;
- boss-pattern seed and boss clear time;
- game version;
- deterministic replay hash;
- timestamp;
- accessibility/practice flags;
- ranked eligibility.

Local persistence must work without login.

Remote design:

- define a `LeaderboardProvider` interface;
- provide local implementation;
- provide optional Supabase implementation only when configured;
- never expose service keys in client code;
- sanitize names;
- rate-limit server submissions;
- reject practice or modified runs;
- submit replay/input summary and deterministic checks;
- include schema and migration documentation;
- make network failure non-destructive.

Create a replay format based on seed, version, and timestamped input changes—not video. Build a headless verifier capable of recomputing final score for deterministic runs. If full server verification is beyond the initial local build, implement the interface and headless local verifier now.

### 16. Art direction and asset pipeline

Read `docs/ART_AND_AUDIO_PROMPTS.md`.

The visual language is original **model-realistic 2.5D anime-manga kawaii arcade comedy**:

- stylized 3D or pre-rendered 3D characters with believable cloth, metal, bun, lettuce, cheese, and condiment materials;
- youthful anime/manga facial readability, large expressive eyes, compact heroic proportions, and kid-friendly charm;
- bold silhouettes that remain clear after sprite-atlas downsampling;
- appetizing tactile ingredients without greasy photorealism;
- simple readable stage backgrounds with cinematic depth and restrained bokeh;
- squash, stretch, anticipation, and expressive posture;
- food enemies that look threatening through red eyes, brows, poses, and attack telegraphs while remaining cute rather than horrific;
- no graphic body horror, exposed flesh, gore, or disgusting food detail;
- polished rim lighting and contact shadows used without sacrificing gameplay contrast;
- resolution-independent UI and clean sprite edges rather than mandatory pixel-art quantization.

Use procedural placeholder art first so the game is complete without external generation.

When Higgsfield MCP is connected:

1. inspect the actual tools and auth status;
2. do not invent tool names or schemas;
3. create an asset manifest with exact IDs, dimensions, states, and alpha requirements;
4. generate low-cost contact sheets or short motion references;
5. select a direction against written criteria;
6. use character-consistency/reference capabilities for recurring cast;
7. reserve high-quality generation for final source art;
8. store prompts, model/tool metadata, attempts, and estimated credits in `docs/ASSET_LEDGER.md`;
9. process locally into clean sprite sources;
10. validate transparency, cropping, frame alignment, palette, and 1× readability;
11. keep placeholders behind identical IDs;
12. never block build completion on media generation.

Generated images are not collision geometry. Generated video is motion reference unless clean frame extraction is explicitly validated.

Create:

- four base chef model sheets: Sal Boy, Sal Girl, Pep Boy, and Pep Girl, with family resemblance, matched gameplay proportions, and distinct identity silhouettes;
- reusable red and blue accent masks or perfectly aligned palette exports for uniform striping, toque lettering, HUD portraits, and boss-flight trail accents;
- local two-player select-screen poses, join/ready/reconnect states, paired S&P poses, and boss-flight animation keys;
- cute-scary food-enemy model sheets with no salt/pepper shaker enemies;
- giant flying burger boss, ingredient armor, condiment ports, and four projectile-family sheets;
- ingredient contact sheets;
- world tile/environment sheets;
- portal and secret-depth elements;
- original `BOSS COMING!` warning treatment and Japanese typography layout using local/licensed fonts;
- title key art;
- menu diorama assets;
- sprite atlases;
- licensing/provenance notes.

### 17. Animation requirements

All four base chef variants—Sal Boy, Sal Girl, Pep Boy, and Pep Girl—must support the same state machine, frame timing, ground contact, and validated gameplay bounds. Shared/retargeted animation is preferred where it preserves identity and polish. Player-slot red/blue accents are material or palette variants, not separate physics entities.

Sal and Pep variants:

- character-select idle and turntable;
- Boy/Girl selector transition that changes the model cleanly without a mocking transformation effect;
- player join, identity swap, ready, unready, controller disconnect, and reconnect acknowledgement;
- idle;
- run;
- stop/skid;
- pivot;
- ladder climb;
- ingredient compression;
- portal enter/exit;
- hit;
- respawn;
- field-spatula pickup;
- field-spatula throw;
- boss-warning look-up;
- crouch and vertical launch;
- flight idle with cloth/toque trails;
- continuous boss-spatula firing loop;
- flight hit and recovery;
- paired final volley;
- round win sibling pose;
- game over.

Enemies:

- idle;
- move;
- climb;
- think/telegraph;
- portal;
- stun;
- ingredient carry;
- flatten/defeat;
- re-entry where applicable.

Ingredients:

- neutral;
- each tread state or a mask-driven overlay;
- armed anticipation;
- drop;
- carried enemy;
- land;
- burger completion.

Boss:

- entrance and hover;
- eye/brow threat poses;
- pickle, ketchup, mustard, and mayo pre-fire telegraphs;
- each projectile release;
- armor crack, compression, and layer detachment;
- vulnerable core exposure;
- enrage;
- defeat and ingredient breakup.

Use state-machine-driven animation. Avoid frame-rate-dependent timing.

### 18. Audio and music

Read and implement the full prompt library in `docs/ART_AND_AUDIO_PROMPTS.md`.

The game must distinguish walking across:

- bun;
- lettuce;
- patty;
- cheese;
- tomato;
- pickle;
- onion;
- stainless counter;
- ceramic plate;
- freezer floor;
- ladder rungs.

For each repeated footstep:

- support at least four variations;
- apply slight pitch/gain variation;
- prevent same-frame stacking;
- alternate stereo position subtly;
- preserve visual equivalents for critical cues.

Stack Phase music is a phase-aligned adaptive 60-second system:

- base from 60–31;
- pressure from 30–16;
- rage from 15–6;
- five-count final warning;
- separate win/fail handoffs.

Every level also needs:

- an original two-pulse klaxon;
- a warning sting synchronized to `BOSS COMING! / ボス接近！`;
- a vertical launch whoosh;
- a loopable, non-fatiguing dual-spatula firing texture;
- distinct pickle, ketchup, mustard, and mayo telegraphs and projectile sounds;
- a 20–40 second side-scrolling boss theme with phase escalation;
- boss armor-break, vulnerable-core, enrage, defeat, and sibling-victory cues.

If connected tools expose sound generation, use them conservatively and log attempts. Otherwise create synthesized placeholder SFX with Web Audio and preserve production prompts.

### 19. Accessibility

Implement before polish is complete:

- remappable keyboard controls;
- gamepad remapping where browser support allows;
- keyboard/controller-complete local co-op character selection;
- device-specific focus, join, ready, disconnect, and rebind feedback;
- adjustable touch layout;
- high-contrast mode;
- color-independent progress;
- P1/P2 identification by slot number, identity letter, marker shape, and optional locator arrow in addition to red/blue;
- Boy/Girl options labeled with text and neutral icons rather than blue/pink stereotypes;
- reduced motion;
- reduced flash;
- screen-shake slider/off;
- music/SFX/warning volume separation;
- readable timer scale;
- warning icons plus audio;
- shape-coded and captioned condiment patterns during Boss Flight;
- adjustable projectile contrast and trail intensity;
- optional boss-flight auto-fire, which does not change ranked score eligibility because ammo is unlimited for everyone;
- pause on focus loss;
- captions/text labels for non-speech cues where useful;
- practice speed;
- practice timer;
- invulnerability practice toggle;
- no ranked score from modified practice settings.

Ensure focus states, menu navigation, and screen-reader labels for non-canvas shell controls. Canvas gameplay may use an accessible companion HUD DOM layer when appropriate.

### 20. Performance

Targets:

- stable 60 FPS on common desktop and modern mobile hardware;
- deterministic simulation independent of render FPS;
- no repeated allocation in hot loops where avoidable;
- pooled particles/projectiles/popups, including both chefs' unlimited boss-fire streams;
- deterministic projectile caps and effect degradation that never changes collision logic;
- atlas textures;
- compressed WebP/PNG and OGG/MP3/AAC fallbacks as appropriate;
- lazy-load later worlds;
- dispose Three.js resources after every flip;
- avoid audio instance leaks;
- pause or throttle when hidden;
- no long main-thread stalls during procedural generation—generate ahead or use a worker when justified;
- production bundle and asset budgets documented.

Create a performance overlay and a 30-minute autoplay soak test.

### 21. Analytics and tuning events

Implement a provider interface with a no-network local logger.

Events:

- app_start;
- mode_select;
- local_coop_selected;
- input_device_joined;
- input_device_rebound;
- chef_identity_selected;
- gender_presentation_selected;
- identity_swap;
- player_ready;
- chef_select;
- round_start;
- first_move;
- ingredient_segment;
- ingredient_drop;
- burger_complete;
- boss_warning;
- boss_launch;
- boss_start;
- boss_pattern_start;
- boss_projectile_destroyed;
- boss_armor_break;
- boss_hit_player;
- boss_enrage;
- boss_complete;
- secret_seen;
- portal_enter;
- map_flip;
- enemy_collision;
- life_lost;
- field_spatula_pickup;
- field_spatula_throw;
- field_spatula_hit;
- boss_spatula_fire_start;
- boss_spatula_fire_stop;
- boss_spatula_hit;
- round_complete;
- round_fail;
- retry;
- leaderboard_submit;
- settings_change.

Never collect sensitive personal data. Keep analytics disabled by default unless configured. Provide a tuning dashboard script or CSV export for local playtest data.

### 22. Testing strategy

#### Unit tests

Cover:

- timer start/stop and final thresholds;
- movement input buffering;
- input-device claim, isolation, disconnect, and rebind state;
- Sal/Pep identity selection independent from Boy/Girl presentation and red/blue player slot;
- identity-swap behavior preserving presentation, input, and slot color;
- all four base variants sharing identical gameplay configuration and collision bounds;
- ladder snap;
- tread masks;
- ingredient drop order;
- collision precedence;
- score table and combo caps;
- life loss and safe respawn;
- field-spatula direction, hit, miss, multi-hit, and inventory;
- boss-flight spatulas never decrement ammo and remain independent from field inventory;
- boss-flight fire cadence, pooling, solo wing-partner mirroring, and co-op ownership;
- P1 red and P2 blue projectile accents remaining cosmetic and separately attributable;
- boss warning state transitions and exact localized strings;
- seeded boss pattern decks and projectile trajectories;
- pickle destructibility, ketchup lane timing, mustard gaps, and mayo split/cloud lifetimes;
- boss damage, armor breaks, quick-clear scoring, hit recovery, and defeat gating;
- seeded RNG streams;
- pathfinding;
- each enemy target policy;
- threat director;
- portal coordinate transforms;
- secret classification;
- persistence migrations;
- name sanitization;
- replay hashing.

#### Property and simulation tests

- at least 1,000 procedural seeds;
- no unreachable required segment;
- no impossible required secret;
- optimal route inside target budget;
- safe portal arrival;
- no spawn overlap;
- deterministic regeneration;
- deterministic AI decisions;
- bounded bot completion rates;
- deterministic boss-pattern fairness simulations with at least one survivable corridor per validated frame window;
- no unbounded loop in generator;
- failing seeds saved as fixtures.

#### E2E

Automate:

1. boot to title;
2. start arcade;
3. choose Sal or Pep and a Boy/Girl presentation;
4. complete or scripted-cheat the round-1 Stack Phase;
5. see `BOSS COMING!` and `ボス接近！`;
6. verify Chef Pep and Chef Sal launch through the top boundary;
7. hold fire and verify both chefs emit unlimited spatulas without decrementing inventory;
8. dodge at least one pickle pattern and defeat the level-1 boss;
9. enter round 4 through a test route;
10. trigger map flip;
11. complete secret burger and its boss finale;
12. reach results;
13. submit local initials;
14. see leaderboard entry;
15. reload offline and retain entry.

Add tests for:

- pause/resume;
- resize;
- reduced motion;
- high contrast;
- two-gamepad join/select/control mocks where feasible;
- keyboard-plus-gamepad join in both orders;
- occupied-identity swap and both-players-same-gender cases;
- controller disconnect and slot-preserving rebind;
- monochrome/color-vision simulation confirming P1/P2 identification without color;
- touch controls;
- timer failure;
- hit/respawn;
- level-10 field spatula through debug selector;
- every boss projectile family through a boss-pattern debug selector;
- solo wing-partner recovery and local co-op ownership;
- Player 1 red striping/lettering and Player 2 blue striping/lettering across select, Stack Phase, launch, Boss Flight, and results;
- reduced-motion boss warning and launch;
- high-contrast/color-independent condiment patterns.

#### Manual/browser verification

Use Claude Code’s running-app verification abilities when available. Inspect the actual rendering and interaction; do not rely solely on source code or unit tests.

### 23. Security and privacy

- sanitize all user-visible names;
- escape leaderboard rendering;
- validate storage payloads;
- version and migrate saves;
- handle corrupted storage by backing up and resetting safely;
- never ship secrets;
- no arbitrary HTML injection;
- content security policy appropriate for the deployment;
- no external generation credentials in the game;
- no telemetry without explicit configuration;
- no paid call from normal gameplay.

### 24. Build phases

Work in this order unless repository state requires adaptation.

#### Phase A — discovery and decisions

- inspect repository;
- create `BUILD_STATUS.md`;
- record assumptions and architecture;
- create package/scripts;
- create the original visual placeholder system;
- establish deterministic seed and game state.

#### Phase B — playable vertical slice

- boot/title/select with Sal and Pep;
- four identity/presentation placeholders: Sal Boy, Sal Girl, Pep Boy, Pep Girl;
- two-device local co-op join/select with P1 red and P2 blue;
- one fixed original map;
- movement/ladders;
- ingredients;
- one burger;
- two enemies;
- timer/lives/score;
- boss-warning overlay with English and Japanese text;
- paired sibling launch;
- level-1 flying burger boss with pickle pattern;
- unlimited dual-chef spatula fire;
- combined results;
- keyboard and touch or gamepad for solo, plus two-gamepad or keyboard-plus-gamepad local co-op;
- unit and E2E baseline;
- production build.

Do not proceed until this is genuinely playable.

#### Phase C — onboarding progression

- round 2 rematch and ketchup boss pattern;
- round 3 Map B and mustard boss pattern;
- enemy differentiation with Onion Ringlets replacing any shaker concept;
- full Stack Phase and Boss Flight HUDs;
- world map;
- boss-pattern practice mode;
- persistence.

#### Phase D — dimensional signature

- round 4 Map C;
- portal system;
- Three.js flip;
- coordinate transforms;
- required secret burger;
- enemy follow delay;
- mayo boss pattern and more active boss motion;
- reduced-motion equivalents for map flip and boss launch;
- tests and leak cleanup.

#### Phase E — procedural game

- graph generator;
- validator;
- bot estimator;
- front/back variants;
- seeded boss pattern-deck generator and fairness validator;
- worlds, flight arenas, and hazards;
- 1,000-stage-seed suite plus boss simulations;
- endless mode.

#### Phase F — level-10 field spatulas and advanced difficulty

- three Stack Phase pickups;
- finite field inventory;
- left/right field throw;
- spin and hit behavior;
- multi-hit scoring;
- elite resistance;
- explicit separation from unlimited Boss Flight spatulas;
- debug level and boss-pattern selectors;
- balance tests.

#### Phase G — presentation and content

- polished screens, including two-column join/select, identity swap, ready, disconnect, and reconnect states;
- key effects;
- adaptive audio;
- asset manifest;
- Higgsfield integration if available;
- final source art processing;
- finalized four-base-character art with red/blue accent exports;
- PWA/offline;
- accessibility.

#### Phase H — leaderboard and release candidate

- local leaderboard;
- replay hash/verifier;
- remote adapter and schema;
- performance soak;
- security review;
- release checklist;
- final running-app verification.

### 25. Documentation deliverables

Create and maintain:

- `README.md` — setup, run, controls, modes, architecture;
- `BUILD_STATUS.md` — evidence and remaining work;
- `docs/GAME_DESIGN.md`;
- `docs/TECHNICAL_ARCHITECTURE.md`;
- `docs/PROCGEN.md`;
- `docs/ENEMY_AI.md`;
- `docs/BOSS_FLIGHT.md`;
- `docs/LOCAL_COOP_CHARACTER_SELECT.md`;
- `docs/SCORING.md`;
- `docs/ART_AND_AUDIO_PROMPTS.md`;
- `docs/ASSET_MANIFEST.md`;
- `docs/ASSET_LEDGER.md`;
- `docs/ACCESSIBILITY.md`;
- `docs/LEADERBOARD_AND_REPLAY.md`;
- `docs/EXTERNAL_SETUP.md`;
- `docs/RELEASE_CHECKLIST.md`;
- `CHANGELOG.md`.

Documentation must reflect implemented behavior, not aspirational claims.

### 26. Definition of done

The current milestone is complete only when all of the following are true:

- the game launches locally with one documented command;
- title, attract, select, world map, Stack Phase, boss warning, launch, Boss Flight, pause, results, game over, settings, and leaderboard flows exist;
- player-facing heroes are Chef Sal (`S`) and Chef Pep (`P`), with identity independent from Boy/Girl presentation;
- Sal Boy, Sal Girl, Pep Boy, and Pep Girl all exist and share identical ranked mechanics and validated collision bounds;
- local two-player select supports two gamepads and keyboard-plus-gamepad, with isolated device ownership and reconnect behavior;
- Player 1 always uses red striping/lettering and Player 2 always uses blue striping/lettering, regardless of identity or gender presentation;
- both players may select the same gender presentation, and occupied-identity selection swaps Sal/Pep without changing device, presentation, or player color;
- P1/P2 remain identifiable without color through number, identity letter, and shape marker;
- no salt-shaker or pepper-shaker enemy assets, identifiers, or prompts remain;
- rounds 1–4 match the progression in this brief;
- every ranked Stack Phase uses a real 60-second timer;
- every completed Stack Phase triggers the klaxon and exact `BOSS COMING!` / `ボス接近！` warning;
- both chefs fly through the top boundary and appear in every boss encounter;
- both chefs visibly fire unlimited spinning spatulas in Boss Flight with no ammo decrement, reload, heat, or field-inventory coupling;
- the giant flying burger uses distinct pickle, ketchup, mustard, and mayo projectile grammars by round 4;
- the level cannot clear before its boss defeat state;
- ingredients have visible tread segments and deterministic drops;
- at least three enemies demonstrate visibly distinct intelligence;
- last-15-second escalation works;
- the threat director prevents obvious unfair spawn/portal hits;
- the first dimensional map visibly flips to the back face;
- its required secret burger is visible in depth and completable;
- later procedural maps support front/back variation;
- round 10 introduces exactly three collectible **field** spatulas in the Stack Phase;
- a field spatula spins left or right according to facing and dispatches valid enemies;
- boss-flight spatulas remain unlimited from level 1 onward and are tested separately;
- procedural maps are seed-replayable and pass a 1,000-seed validation run;
- scoring and local leaderboards persist;
- keyboard, gamepad, and touch work;
- two local input devices remain independently assigned from select through results and deterministic replay;
- reduced motion and high contrast work;
- local play works offline with placeholders and no credentials;
- no copied BurgerTime expression exists;
- no uncaught console error occurs in the main flow;
- `npm run lint` exits 0;
- `npm run typecheck` exits 0;
- `npm test` exits 0;
- `npm run test:e2e` exits 0;
- `npm run validate:maps -- --count 1000` exits 0;
- `npm run build` exits 0;
- `BUILD_STATUS.md` records exact commands and outcomes.

### 27. Autonomous operating rules

- Begin by inspecting files, then act.
- Use the custom subagents in `.claude/agents/` for bounded specialist work, including `local-coop-input-engineer` for device assignment and character selection.
- Use project skills when the workflow matches them, including `/validate-local-coop` before release.
- Parallelize independent analysis, but avoid simultaneous edits to the same files.
- Make small coherent changes and verify them.
- Never fake a passing test, screenshot, generation result, or browser inspection.
- Do not claim an external asset was generated unless the MCP call returned it.
- Do not stop because final art is unavailable; placeholders are a first-class build path.
- Do not spend generation credits without logging purpose and expected value.
- Do not commit, push, publish, deploy, buy, or upload without explicit instruction.
- When blocked, document the blocker and continue all other work.
- At the end of each phase, update `BUILD_STATUS.md`.
- At final completion, report:
  - what is playable;
  - exact run command;
  - controls;
  - test/build results;
  - generated assets and provenance;
  - remaining external setup;
  - known limitations;
  - the next highest-value improvement.

Now inspect the repository and execute the build. Do not return only a plan.
