# Burger Rush art and audio production bible

## Art north star

**Model-realistic 2.5D anime-manga kawaii arcade comedy:** believable cloth, polished metal, toasted bread, crisp vegetables, glossy condiments, and dimensional lighting combined with youthful anime facial readability and exaggerated arcade poses. Characters should feel like collectible animated models rendered into clean game-ready sprite atlases—not flat clip art and not grim photorealism.

The provided vintage chef reference is inspiration for the broad idea of an exuberant uniformed burger chef only. Never trace or reproduce its exact face, pose, proportions, costume details, line work, or lettering.

Enemies are **cute-scary**: red threat eyes, lowered brows, aggressive silhouettes, and clear attack poses, but rounded forms, comic reactions, and no gore or body horror. Think “a child immediately knows it is dangerous but still wants the toy.”

### Production rules

- Author character source renders large enough for clean 1080p/4K marketing and sprite-atlas downsampling.
- Gameplay masters should remain readable around 72–120 screen pixels tall depending on camera scale.
- Use a consistent three-quarter side-view lighting rig for all gameplay characters.
- Maintain clear alpha, generous padding, stable ground contact, and identical camera/lens across animation frames.
- Use high-quality antialiasing; do not force pixel-art quantization.
- Keep red threat eyes distinct from Player 1 costume red through value, white keyline, glow, and animation. Keep Player 2 blue distinct from portals and freezer hazards through slot markers and luminance.
- Avoid generated lettering in final assets. Use licensed/local fonts or custom vector lettering for `P`, `S`, `BOSS COMING!`, and `ボス接近！`. The `P`/`S` emblem color is applied from the player-slot accent mask.
- Never generate salt or pepper shaker enemies; S&P refers only to sibling chefs Sal and Pep.
- Preserve prompt, reference, model/tool, attempt, and provenance metadata in `docs/ASSET_LEDGER.md`.

## Playable chefs

All ranked mechanics and collision bounds are identical. The art system separates three independent dimensions:

1. **Identity** — Sal (`S`) or Pep (`P`);
2. **Gender presentation** — Boy or Girl;
3. **Player-slot accent** — Player 1 red or Player 2 blue.

The identities are character personalities, not gender locks:

- **Chef Sal (`S`)** — observant, clever, quick, and precise; slightly more composed poses and a knowing grin.
- **Chef Pep (`P`)** — enthusiastic, brave, energetic, and expressive; broader anticipation and impulsive victory poses.

Create four approved base variants:

1. Sal — Boy;
2. Sal — Girl;
3. Pep — Boy;
4. Pep — Girl.

They should always read as siblings, never romantic partners. Keep them youthful, wholesome, and suitable for children. Do not sexualize the Girl variants, exaggerate anatomy, or make Boy/Girl variants different heights or gameplay sizes. Express presentation through face, hair, subtle costume tailoring, and pose—not stereotypes.

### Player-slot accent system

Author an exact accent mask covering:

- uniform stripes;
- toque letter `S` or `P`;
- small scarf/button/shoe trim where useful;
- portrait frame edge;
- optional boss-flight projectile trail source.

Export or tint from the same approved source:

- **Player 1:** warm arcade red;
- **Player 2:** saturated cobalt blue.

The white toque, jacket, apron, skin, hair, and major costume fields do not change. Every red and blue atlas pair must be frame-aligned. Also retain a slot number and shape marker in UI because color alone is insufficient.

### Four-variant family contact-sheet prompt

> Original character-development contact sheet for two sibling arcade-chef identities named Sal and Pep. Show four equally heroic base variants: Sal Boy, Sal Girl, Pep Boy, Pep Girl. Each has model-realistic stylized 3D rendering for a 2.5D game, anime/manga kawaii facial readability, tactile white cloth, oversized soft chef toque, warm brown eyes, dark hair, oversized expressive hands, practical sneakers, compact matched gameplay proportions, and wholesome child-friendly energy. Sal always carries a simple S emblem and has clever precise pose language; Pep always carries a simple P emblem and has enthusiastic energetic pose language. Boy and Girl variants differ through face, hair, and subtle tailoring only; no sexualization, no height advantage, no exaggerated anatomy. Show neutral gray accent-mask regions on uniform stripes and toque letter for later red/blue palette application. Strong distinct silhouettes, no mustache, no existing character resemblance, no copied vintage pose or costume, neutral studio lighting, clean spacing, no background text beyond the S and P emblems.

### Sal Boy model-sheet prompt

> Complete orthographic model sheet for Chef Sal in the Boy presentation, an original quick-thinking sibling chef for a family arcade game. Large soft white toque with an S emblem rendered in a neutral accent-mask material, dark practical hair, warm brown eyes, white jacket and apron, striped sleeves and small trim rendered as neutral accent-mask regions, compact matched gameplay proportions and practical sneakers. Show front, rear, profiles, three-quarter, select idle, run, ladder climb, ingredient compression, clever planning pose, field-spatula throw, warning look-up, vertical launch, flight idle, continuous spinning-spatula fire, flight hit, paired victory, controller reconnect acknowledgement. Model-realistic stylized 3D, anime/manga kawaii, tactile materials, wholesome, exact continuity, alpha-ready, no existing character resemblance.

### Sal Girl model-sheet prompt

> Complete orthographic model sheet for Chef Sal in the Girl presentation, equal co-hero and visual sibling of all Sal/Pep variants. Large soft white toque with neutral-mask S emblem, dark hair in a practical braid, short tied-back shape, or compact style that remains clear in side view, warm brown eyes, white jacket and apron with subtle non-sexualized tailoring, striped sleeves and trim in neutral accent-mask material, the same height, limb reach, ground contact and gameplay silhouette budget as Sal Boy and both Pep variants. Show the full shared animation key set including select, identity swap, run, climb, ingredient compression, field-spatula throw, warning, launch, flight fire, hit, victory and reconnect. Model-realistic stylized 3D, anime/manga kawaii, child-friendly, tactile, alpha-ready, no existing character resemblance.

### Pep Boy model-sheet prompt

> Complete orthographic model sheet for Chef Pep in the Boy presentation, an original enthusiastic sibling chef for a family arcade game. Large soft white toque with neutral-mask P emblem, dark tousled practical hair, warm brown eyes, white jacket/apron, striped sleeves and trim in neutral accent-mask material, compact matched gameplay proportions and practical sneakers. Show front, rear, profiles, three-quarter, select idle, energetic ready pose, run, ladder climb, ingredient compression, startled pose, field-spatula throw, warning look-up, vertical launch, flight idle, continuous spinning-spatula fire, flight hit, paired victory and reconnect acknowledgement. Model-realistic stylized 3D, anime/manga kawaii, tactile materials, wholesome, alpha-ready, no existing character resemblance.

### Pep Girl model-sheet prompt

> Complete orthographic model sheet for Chef Pep in the Girl presentation, equal co-hero and visual sibling of all Sal/Pep variants. Large soft white toque with neutral-mask P emblem, expressive dark hair in a compact side-view-readable style, warm brown eyes, white jacket and apron with subtle non-sexualized tailoring, striped sleeves and trim in neutral accent-mask material, the same height, limb reach, ground contact and gameplay silhouette budget as Pep Boy and both Sal variants. Show the complete shared key set including select, identity swap, energetic ready, run, climb, ingredient compression, field-spatula throw, warning, launch, flight fire, hit, victory and reconnect. Model-realistic stylized 3D, anime/manga kawaii, child-friendly, tactile, alpha-ready, no existing character resemblance.

### Red/blue material-validation prompt

> Production comparison sheet using one locked Sal or Pep pose and camera. Render the exact same chef source twice: Player 1 version with warm arcade-red uniform stripes, matching red S or P toque lettering and restrained red trim; Player 2 version with saturated cobalt-blue stripes, matching blue S or P toque lettering and restrained blue trim. Keep all geometry, white cloth, skin, hair, lighting, crop and pose pixel-aligned. Include small neutral diamond-1 and circle-2 UI marker references outside the character, no other text. Validate that enemy red eyes and portal blue remain visually distinct. Clean alpha-ready background.

### Local co-op selection-screen concept prompt

> Original local two-player character-select screen for a family arcade game, model-realistic 2.5D anime-kawaii presentation. Two equal side-by-side panels: Player 1 framed in red with diamond and number 1; Player 2 framed in cobalt blue with circle and number 2. Each panel shows an independently selectable Sal or Pep chef identity, S or P toque emblem in the player's slot color, and a clear neutral-text Boy/Girl selector that does not use pink/blue gender stereotypes. Show keyboard/controller device glyph areas, join/ready states, large animated character preview spaces, strong arcade readability, dark restrained background, no copied game UI, no generated final logo or warning text.

### Paired S&P flight-reference prompt

> 8-second original animation reference, side view, fixed camera. Chef Sal and Chef Pep—using any selected Boy/Girl presentations—exchange a quick sibling glance after completing a burger, hear a warning, crouch, launch vertically through the top of frame, settle into a horizontal flying formation, and both fire parallel streams of spinning restaurant spatulas to the right. One chef carries Player 1 red stripes and toque lettering with a restrained red projectile accent; the other carries Player 2 blue stripes and lettering with a restrained blue accent. Toques, scarves, and apron ties trail in the air. Matched gameplay proportions, model-realistic 2.5D anime-kawaii style, clear readable anticipation, no camera shake, no text, no resemblance to an existing shooter or game animation.

## Enemy roster

1. **Sunny-Side Stalker** — simple pursuer; glossy yolk eye, lacy white hands/feet, readable red rage pupils.
2. **Brat Beast** — stubborn sausage hunter; grilled casing, bent posture, tiny boots, aggressive overcommit animation.
3. **Pickle Phantom** — predictive interceptor; translucent brine edges, bumpy green body, calculating red eyes.
4. **Onion Ringlets** — a coordinated pair of differently sized crispy onion rings; one herds while the other rebounds toward escape routes.
5. **Cheese Creep** — later ladder blocker; gooey but appetizing, telegraphed melt.
6. **Tomato Tumbler** — rolling later variant with visible braking anticipation.
7. **Freezer Burn** — icy world variant that slides and overshoots.

### Shared food-enemy prompt

> Original cute-scary anthropomorphic food monster for a family arcade game, model-realistic stylized 3D rendered for 2.5D sprite use, appetizing tactile food materials, rounded collectible-toy proportions, threatening red eyes and expressive brows, aggressive readable pose, comic squash-and-stretch potential, no gore, no rotting food, no body horror, no existing character resemblance, transparent or neutral alpha-ready background.

### Sunny-Side Stalker prompt

> Original fried-egg monster. One glossy yolk functions as a large expressive face, crisp lacy white forms grasping hands and feet, red threat pupils and pepper-like brow texture without depicting a pepper shaker. Show idle, simple chase, wrong-turn confusion, ladder climb, stunned, carried by ingredient, flattened, and recovery poses. Model-realistic stylized 3D, cute-scary, alpha-ready.

### Brat Beast prompt

> Original grilled sausage monster with a bent athletic silhouette, appetizing seared casing, tiny boots and gloved hands, red eyes, overconfident brows, and a comic forward lean. Show idle, sprint, long-platform acceleration, ladder climb, overshoot skid, reversal surprise, stun, and defeat. Model-realistic 2.5D anime-kawaii threat, no gore, alpha-ready.

### Pickle Phantom prompt

> Original anthropomorphic pickle-slice interceptor, ridged translucent brine rim, seed details arranged as facial accents, calculating red eyes, small claws and feet, compact hovering anticipation pose. Show idle analysis, predictive point, chase, choke-point wait, portal entry, portal exit, stun, and defeat. Cute-scary model-realistic 3D, no existing character resemblance, alpha-ready.

### Onion Ringlets prompt

> Original coordinated pair of crispy onion-ring monsters, one small and springy and one larger and heavier, both with appetizing breading, red threat eyes, tiny hands and feet, clearly different silhouettes. Show paired planning, split directions, rolling pressure, wall rebound, ladder maneuver, herding gesture, ambush, comic collision, stun, and defeat. Model-realistic stylized 3D, cute-scary, no salt or pepper shakers, alpha-ready.

## Giant flying burger boss

Working name: **The Dread Stack**. Create modular world variants without losing its core identity.

### Boss model-sheet prompt

> Original giant flying anthropomorphic burger boss for a family side-scrolling arcade sequence. Huge toasted sesame bun, layered lettuce, cheese, patty, tomato and condiment hardware, red threat eyes, expressive angry brows, readable comic mouth, detachable ingredient armor, four clearly separated attack ports for pickle discs, ketchup jets, mustard waves and mayo dollops. Cute-scary collectible-toy appeal, model-realistic stylized 3D, anime/manga facial readability, appetizing materials, no gore, no rotting food, no resemblance to an existing game character. Show front three-quarter, side gameplay view, hover, pickle telegraph, ketchup telegraph, mustard telegraph, mayo telegraph, armor crack, vulnerable core, enrage, defeat breakup. Neutral alpha-ready background, no text.

### Boss projectile-family contact sheet

> Game-production contact sheet of four original condiment projectile families for a side-scrolling boss: spinning pickle discs with circular ridges, thick ketchup lane jets with rectangular warning markers, mustard three-way fans and sine-wave ribbons with forked triangular warning icons, slow mayo dollops with dark outlines that split or leave transparent cloud zones. Model-realistic stylized materials, clean silhouettes, accessibility-first shape coding, clear pre-fire telegraphs, no labels, no text, no existing shooter resemblance, alpha-ready.

### Boss warning visual brief

> Original 1980s-inspired arcade warning treatment reference: large bold italic display letters for BOSS COMING with warm yellow-to-orange-to-magenta gradient, dark navy extrusion, subtle cyan chromatic edge, scanline shimmer, geometric warning chevrons, and a smaller reserved line beneath for Japanese text. Energetic but clean, no copied font or composition from an existing game. Reference only; final lettering must be rendered from licensed/local type, not baked generated text.

### Secret burger depth silhouette

> A completed hidden burger seen through depth behind a 2D arcade stage, rendered as a soft low-contrast parallax silhouette with subtle rim light, readable but mysterious, no text, no character, transparent background.

### Title key art

> Vertical arcade cabinet key art with no rendered words. Chef Sal and Chef Pep—using any selected Boy/Girl presentations—race across towering burger ingredients while Sunny-Side Stalker, Brat Beast, Pickle Phantom and the Onion Ringlets converge through ladders and a rotating front/back kitchen world. One chef carries Player 1 red striping and S/P lettering; the other carries Player 2 cobalt-blue striping and lettering. Above them, both siblings launch into flight and fire spinning spatulas at a giant angry flying burger releasing pickle discs and stylized condiment patterns. Model-realistic 2.5D anime-kawaii arcade comedy, dynamic diagonal composition, appetizing materials, cute-scary enemies, original 1980s energy with modern polish, clean title area reserved, no existing game resemblance.

## World tile prompts

### Midnight Diner

> Side-view modular arcade platform tiles for a midnight diner: stainless counters, dark teal booths, checker accents, warm heat-lamp pools, simple ladders, plate landing zones, service doors, restrained neon reflections. Model-realistic stylized 2.5D environment art, modular and tileable, no text, no logos, consistent orthographic camera.

### Drive-In Griddle

> Side-view modular arcade platform tiles for an outdoor drive-in griddle at sunset: chrome rails, grill vents, menu-board silhouettes with no writing, amber sky, car-light bokeh, grease-can ladders, model-realistic stylized 2.5D environment art, tileable and readable.

### Freezer Maze

> Side-view modular arcade platform tiles for a restaurant walk-in freezer: frosted shelves, cold vapor, blue-white ice edges, rubber floor, hanging ingredient silhouettes, slippery sections clearly telegraphed by shape, no text, tileable model-realistic stylized 2.5D environment art.

### Neon Food Court

> Side-view modular arcade platform tiles for a surreal neon food court: magenta and cyan edge lights, dark structural forms, glowing tray rails, service elevators, readable portals, no brand signs or text, tileable model-realistic stylized 2.5D environment art.

### Food Factory

> Side-view modular arcade platform tiles for a playful burger factory: conveyors, pistons, ingredient chutes, warning shapes without text, red indicator lamps, brass and steel surfaces, tileable model-realistic stylized 2.5D environment art.

### Sky Kitchen

> Side-view modular arcade platform tiles for a floating kitchen above clouds: pale ceramic platforms, copper ladders, wind ribbons, distant floating plate islands, front/back cube-face logic, no text, tileable model-realistic stylized 2.5D environment art.

## Audio technical standard

Unless a specific cue needs stereo motion:

- 48 kHz, 24-bit source;
- isolated and dry;
- mono-compatible;
- no music, dialogue, narration, ambience bed, or long reverb;
- peak below -1 dBFS;
- trim silence tightly;
- export at least four subtle variations for repeat-heavy footsteps;
- preserve a clean transient;
- game code adds small pitch and gain variation;
- avoid chewing, swallowing, or body-horror sounds.

## Detailed substrate footstep prompts

### Sesame bun

> Single tiny arcade footstep landing on a soft toasted sesame burger bun: airy cushion thump, delicate crust compression, two or three dry sesame seed ticks, warm and appetizing, 170 milliseconds, close-miked, no room sound, no voice, no music, no chewing. Generate four variations with slightly different seed detail.

### Lettuce

> Single light shoe step across crisp iceberg lettuce: fast leafy crinkle, fresh wet snap, tiny spring-back rustle, playful and clean, 140 milliseconds, close-miked and dry, no chewing, no ambience. Four variations.

### Grilled patty

> Single shoe step on a firm grilled burger patty used as a fantasy platform: dense soft thud, brief savory grill sizzle, subtle crust rasp, not disgusting and not wet, 180 milliseconds, dry, no voice or ambience. Four variations.

### Melted cheese

> Single quick step on a stretched melted-cheese platform: tacky elastic slap, tiny rubbery pull-release, soft high-frequency squeak, comedic but appetizing, 150 milliseconds, dry, no chewing. Four variations.

### Tomato

> Single shoe step on a thick tomato slice platform: restrained juicy pulp tap, thin skin pop, tiny seed flick, clean stylized arcade foley, not splattery, 160 milliseconds, dry. Four variations.

### Pickle plank

> Single shoe step on a crisp pickle platform: bright aqueous crunch, glassy brine click, immediate elastic rebound, 130 milliseconds, dry, no jar ambience. Four variations.

### Onion ring

> Single shoe step on a crisp fried onion platform: brittle golden crackle, hollow ring tap, a few light crumb ticks, 140 milliseconds, dry, no chewing. Four variations.

### Stainless platform

> Single rubber-soled shoe step on a brushed stainless restaurant counter: compact metallic tick, muted hollow body, slight sole squeak, 120 milliseconds, dry. Four variations.

### Ceramic plate landing

> Single controlled shoe landing on a heavy ceramic plate: rounded porcelain clack with a short low ring, no breakage, 180 milliseconds, dry. Four variations.

### Metal ladder rung

> One hand-and-foot contact on a stainless ladder rung: bright compact metal ping plus muted glove grip, 110 milliseconds, no room sound. Six variations suitable for alternating climb cadence.

### Freezer floor

> Single step on a cold rubber freezer floor with a thin frost layer: tight rubber thump, powdery ice scrape, tiny crystalline tick, 150 milliseconds, dry. Four variations.

## Mechanics and interface sound prompts

### Ingredient tread segment

> Short positive arcade micro-click for completing one tread segment: soft food compression layered with a warm wooden tick, 70 milliseconds, subtle enough to repeat rapidly, no melody.

### Ingredient fully armed

> Fast three-note ascending tactile cue that says an ingredient layer is ready to drop: compressed spring clicks and a tiny kitchen bell shimmer, 260 milliseconds, no recognizable song.

### Ingredient drop

> Large burger ingredient layer releasing and falling one platform: soft heavy whoomph, short air rush, appetizing material flex, compact plate rattle on landing, 500 milliseconds, no explosion.

### Enemy carried by drop

> Comedic enemy yelp without speech: tiny rubber squeeze, startled whistle chirp, descending pop, 320 milliseconds, not painful or grotesque.

### Burger completion

> Bright original arcade success flourish: three quick kitchen-bell notes, warm synth chord, tiny plate spin, under 900 milliseconds, no resemblance to an existing game jingle.

### Secret burger reveal

> Mysterious but friendly reveal cue: reversed soft chime, low glassy pulse, then a warm two-note confirmation, 1.2 seconds, no horror.

### Portal entry

> Compact retro-futurist kitchen portal: suction pop, stainless door whip, reversed order-bell shimmer, 450 milliseconds, dry.

### Full map flip

> 3D stage rotation transition: low mechanical pivot, broad but short air whoosh moving left-to-right, ceramic and steel resonance at midpoint, soft lock click at 180 degrees, 1.0 second, no cinematic boom.

### Spatula pickup

> Clean stainless spatula pickup cue: bright metal ping, quick upward synth sparkle, 300 milliseconds, original arcade tone.

### Spatula throw

> Spinning restaurant spatula flying horizontally: repeated thin metal flutter, fast rotational whoosh, one clean leading-edge whistle, 700 milliseconds, designed to loop or truncate cleanly.

### Spatula hit

> Spinning spatula striking a cartoon food monster: compact steel clang, rubbery squash, crisp score pop, 320 milliseconds, no gore.

### Boss-coming klaxon

> Original two-pulse arcade klaxon for a family game: compact mechanical warning horn, first pulse lower and shorter, second pulse slightly higher and longer, urgent without being frightening, total 1.15 seconds, dry, no voice, no borrowed alarm signature, designed to synchronize with BOSS COMING and Japanese subtitle text.

### Sibling vertical launch

> Chef Sal and Chef Pep launching upward through the top of an arcade stage: two quick cloth snaps, springy shoe push, layered vertical air rush, tiny stainless utensil shimmer, 650 milliseconds, energetic and playful, no rocket explosion, no voice.

### Unlimited dual-spatula fire loop

> Seamless 600-millisecond loop of two offset streams of spinning restaurant spatulas fired rapidly in a side-scrolling arcade battle: light stainless flutter, alternating thin whooshes, restrained transient ticks, energetic but non-fatiguing under continuous playback, no gunshot character, no melody, clean loop boundaries.

### Pickle-disc telegraph and shot

> Two-part original arcade cue: crisp glassy brine click and circular rising tick for telegraph, followed by a fast watery spin-whistle for a pickle disc projectile, compact, bright, unmistakable, no voice.

### Ketchup-jet telegraph and fire

> Two-part original cue: squeeze-bottle flex and low lane-warning pulse, then a thick pressurized condiment jet with a smooth synthetic sweep, urgent but clean and appetizing, no splatter gore, suitable for a horizontal hazard lane.

### Mustard-wave telegraph and fire

> Two-part original cue: three quick forked synth chirps indicating a fan, then a bright elastic ribbon whoosh that undulates in pitch with a sine-wave projectile path, playful and readable, no melody quotation.

### Mayo-dollop telegraph and split

> Two-part original cue: muted ceramic plop warning with a soft airy halo, followed by a slow rounded projectile whoosh and a clean two-way pop when the dollop splits, not wet or disgusting, strong transient separation.

### Boss armor break

> Giant burger ingredient armor cracking under spinning spatulas: toasted crust snap, compact metal impact, elastic ingredient compression, triumphant score chime, 450 milliseconds, appetizing and comic, no gore.

### Boss vulnerable core

> Short original vulnerable-window cue: two descending mechanical locks followed by a bright rising kitchen-bell pulse, 650 milliseconds, clearly says attack now without speech.

### Boss enrage

> Compact boss enrage transition: low bun-rumble, accelerated kitchen-ticket roll, rising analog pulse, one sharp condiment-port lock, 900 milliseconds, intense but child-friendly.

### Boss defeat and sibling victory

> Original 1.8-second boss defeat cue: synchronized double spatula clang, layered burger-ingredient pops, descending comic air release, plate landing, then a bright sibling victory chord and kitchen bell, no recognizable game melody.

### Timer second tick, 15 seconds remaining

> Minimal dry kitchen-ticket clock tick with a subtle muted synth pulse, 60 milliseconds, urgent but not stressful, designed for one tick per second.

### Final five-second warning

> Five-step escalating original arcade warning sequence: each step a sharper kitchen timer click with rising synth tension, final step resolves into a decisive buzzer or win handoff, no alarm siren, no recognizable melody.

### Life lost

> Brief comic defeat sting: apron snap, low two-note synth fall, soft plate wobble, 700 milliseconds, not humiliating.

### Round clear

> Energetic original 1.5-second victory sting combining small brass-like synth, kitchen bell, and rising bass, suitable for score tally transition, no existing melody resemblance.

## Music briefs

### Attract/title loop

> Original 18-second looping arcade title theme. Playful syncopated bass, compact analog synth lead, muted kitchen-percussion accents, 150 BPM, heroic but comic, strong four-note identity, no resemblance to any existing game tune, seamless loop, instrumental.

### Standard 60-second gameplay system

Create four phase-aligned stems that can layer without restarting:

1. **Base 60–31 seconds:** 150 BPM, nimble bass, sparse percussion, playful two-bar motif.
2. **Pressure 30–16 seconds:** add offbeat synth stabs and faster hi-hat texture.
3. **Rage 15–6 seconds:** add pulsing bass octave and rising counterline.
4. **Final 5 seconds:** remove harmony, emphasize five exact countdown accents, then leave space for win/fail sting.

All stems must share tempo, key, bar length, and loop boundaries. No recognizable melody.

### Front/back world theme

> Original arcade loop suggesting a kitchen folded into a rotating impossible object: marimba-like digital plucks, reversed metallic textures, elastic bass, 150 BPM, playful dimensional mystery, seamless 32-second loop.

### S&P boss-flight theme

> Original 28-second seamless side-scrolling arcade boss loop for two sibling chefs fighting a giant flying burger. 156 BPM, propulsive analog bass, tight electronic drums, stainless percussion, playful heroic synth motif, condiment-pattern callouts, escalating second half, energetic but not militaristic or frightening, no resemblance to any existing shooter soundtrack, instrumental, clean loop.

Create aligned stems:

1. **Entry:** sparse klaxon-tail, bass pulse, and flight rhythm.
2. **Pattern:** full drums and syncopated motif.
3. **Enrage:** added octave bass and faster utensil percussion without changing tempo.
4. **Vulnerable:** short harmonic lift that layers over the loop.

## Runtime audio behavior

- Randomize repeat-heavy SFX by ±3% pitch and ±1.5 dB gain.
- Alternate footstep variation and stereo position by foot.
- Crossfade music layers at exact timer thresholds.
- Duck music briefly for map flip, secret reveal, burger completion, boss warning, vulnerable-core cue, armor break, and final warning.
- Never stack more than one identical footstep on the same frame.
- Expose separate master, music, SFX, and warning controls.
- Ranked play may mute music, but critical warnings need a visual equivalent.

- During Boss Flight, limit identical spatula transients through voice pooling while preserving the perception that both chefs are firing continuously.
- Condiment warning cues must remain audible with music muted and have matching visual/caption equivalents.
