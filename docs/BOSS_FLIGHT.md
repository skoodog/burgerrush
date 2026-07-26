# S&P Boss Flight — implementation reference

## Contract

Every successfully completed 60-second Stack Phase must enter this sequence before the level can clear:

1. two-pulse klaxon;
2. exact English warning `BOSS COMING!`;
3. exact Japanese line `ボス接近！` directly beneath it;
4. Chef Sal and Chef Pep, using the selected Boy/Girl presentations, jump and fly through the top boundary;
5. transition to an original horizontal side-scrolling arena;
6. both chefs fire unlimited spinning spatulas;
7. defeat the giant flying burger;
8. show the combined level results.

## Solo and co-op behavior

In solo play, the selected sibling is the lead and owns the player hurtbox. The other sibling is a deterministic wing partner. The wing partner remains visibly present, holds a readable offset, and fires a separate spatula stream whenever the lead fires. The wing partner may be temporarily knocked out of formation but cannot create unfair double-hit exposure.

Local co-op assigns one independently controlled sibling to each local player. Each player keeps the selected Sal/Pep identity and Boy/Girl presentation. Player 1 is red in striping/lettering and projectile accent; Player 2 is blue. Slot color is cosmetic, backed by number/shape identifiers, and both retain unlimited ammunition.

## Unlimited ammunition invariant

Boss Flight has no ammo property that can reach zero. It has no pickup, reload, magazine, reserve, heat, durability, or linkage to the three finite field spatulas introduced in level 10. Holding fire emits two streams at the tuned cadence. An object-pool cap may limit concurrently rendered projectiles for performance, but it must not behave as an ammo shortage or interrupt fire unpredictably.

## Boss and projectile grammar

The recurring modular boss, working name **The Dread Stack**, is a huge cute-scary flying burger with red threat eyes and detachable ingredient armor.

- **Pickle discs:** fast circles; straight, staggered, arcing, or boomerang trajectories; basic discs may be destroyed.
- **Ketchup jets:** telegraphed lanes or sweeps; cannot be erased by normal fire.
- **Mustard waves:** fans, sine waves, or corkscrews with predictable gaps.
- **Mayo dollops:** slow outlined blobs that split once or leave brief cloud zones.

Every family needs a unique silhouette, warning icon, motion grammar, sound, pre-fire pose, and color-independent accessibility treatment.

## Teaching order

- Level 1: pickle only.
- Level 2: add ketchup.
- Level 3: add mustard.
- Level 4: add mayo.
- Level 5+: deterministic pattern decks and world variants.

## Core acceptance tests

- The warning renders both exact strings from localization resources.
- Both chefs cross the top boundary before control begins.
- Holding fire for 60 seconds never decrements any ammo or field inventory.
- Both chefs continuously produce visible projectiles.
- In co-op, P1 and P2 projectile origins remain separately attributable by slot number/shape plus red/blue accent, without gameplay differences.
- The selected Sal/Pep identity, Boy/Girl presentation, and player color survive the warning launch and Boss Flight transition.
- Boss patterns replay identically for the same seed and input stream.
- Each unlocked pattern has a validated survivable corridor.
- Results cannot open until the boss defeat state is committed.
- Reduced-motion mode preserves state timing and gameplay.
