/**
 * Tutorial Map A - Midnight Diner, round 1 and 2.
 *
 * Original geometry. Five staggered service decks with an asymmetric ladder
 * network, one burger column offset left of centre, and a deliberate loop on the
 * right so pursuit is never a dead end. Nothing here is proportioned from, traced
 * from, or measured against any existing game's opening stage.
 *
 * Readability goals:
 *  - the whole burger column is visible from the spawn point;
 *  - every deck has at least two exits, so no floor is a trap;
 *  - the left ladder column is a full-height express route, which is what the
 *    round-2 rematch teaches players to exploit.
 */

import type { LevelDef } from './types';

const DECK = {
  d0: 470,
  d1: 392,
  d2: 314,
  d3: 236,
  d4: 158,
} as const;

/** Burger column: 6 tread segments of 16 units = 96 units wide. */
const BURGER_X = 372;
const SEGMENTS = 6;

export const TUTORIAL_MAP_A: LevelDef = {
  id: 'map-a',
  name: 'Midnight Diner - Service Line',
  world: 'midnight-diner',
  round: 1,
  faces: 1,
  platforms: [
    { id: 'd0', y: DECK.d0, x1: 96, x2: 872 },
    { id: 'd1a', y: DECK.d1, x1: 128, x2: 560 },
    { id: 'd1b', y: DECK.d1, x1: 616, x2: 840 },
    { id: 'd2', y: DECK.d2, x1: 96, x2: 840 },
    { id: 'd3a', y: DECK.d3, x1: 128, x2: 552 },
    { id: 'd3b', y: DECK.d3, x1: 600, x2: 872 },
    { id: 'd4', y: DECK.d4, x1: 200, x2: 792 },
  ],
  ladders: [
    // Left express column - the mastery route.
    { id: 'l-left-0', x: 152, yTop: DECK.d1, yBottom: DECK.d0 },
    { id: 'l-left-1', x: 152, yTop: DECK.d2, yBottom: DECK.d1 },
    { id: 'l-left-2', x: 152, yTop: DECK.d3, yBottom: DECK.d2 },
    { id: 'l-left-3', x: 232, yTop: DECK.d4, yBottom: DECK.d3 },
    // Mid-left service ladders.
    { id: 'l-mid-0', x: 296, yTop: DECK.d1, yBottom: DECK.d0 },
    { id: 'l-mid-1', x: 328, yTop: DECK.d3, yBottom: DECK.d2 },
    // Right of the burger column.
    { id: 'l-rc-0', x: 520, yTop: DECK.d2, yBottom: DECK.d1 },
    { id: 'l-rc-1', x: 520, yTop: DECK.d4, yBottom: DECK.d3 },
    // Right loop column.
    { id: 'l-right-0', x: 688, yTop: DECK.d1, yBottom: DECK.d0 },
    { id: 'l-right-1', x: 688, yTop: DECK.d2, yBottom: DECK.d1 },
    { id: 'l-right-2', x: 656, yTop: DECK.d3, yBottom: DECK.d2 },
    { id: 'l-right-3', x: 744, yTop: DECK.d4, yBottom: DECK.d3 },
    // Far right shortcut that makes the right side a genuine loop.
    { id: 'l-far-0', x: 808, yTop: DECK.d2, yBottom: DECK.d0 },
  ],
  layers: [
    { id: 'a-bun-top', kind: 'bunTop', x: BURGER_X, y: DECK.d4, segments: SEGMENTS, burger: 'A', order: 3 },
    { id: 'a-lettuce', kind: 'lettuce', x: BURGER_X, y: DECK.d3, segments: SEGMENTS, burger: 'A', order: 2 },
    { id: 'a-patty', kind: 'patty', x: BURGER_X, y: DECK.d2, segments: SEGMENTS, burger: 'A', order: 1 },
    { id: 'a-bun-bottom', kind: 'bunBottom', x: BURGER_X, y: DECK.d1, segments: SEGMENTS, burger: 'A', order: 0 },
  ],
  plates: [{ id: 'plate-a', burger: 'A', x: BURGER_X - 8, y: DECK.d0, width: SEGMENTS * 16 + 16 }],
  playerSpawns: [
    { x: 168, y: DECK.d0 },
    { x: 232, y: DECK.d0 },
  ],
  enemySpawns: [
    { species: 'stalker', x: 792, y: DECK.d0, delay: 1.2 },
    { species: 'brat', x: 736, y: DECK.d3, delay: 6.5 },
  ],
  portals: [],
  secret: 'absent',
  checkpoints: [
    { x: 168, y: DECK.d0 },
    { x: 296, y: DECK.d1 },
    { x: 152, y: DECK.d2 },
    { x: 688, y: DECK.d1 },
    { x: 520, y: DECK.d3 },
  ],
  // Optimal enemy-free route window, measured by scripts/validate-maps.ts.
  // Tutorial Map A is deliberately quick (~15s optimal) so a novice clears it
  // comfortably inside 60s. The 36-44s window in the brief is the target for
  // procedural rounds, not for the teaching stage - see docs/PROCGEN.md.
  targetTime: [12, 30],
  hints: [
    { x: 200, y: DECK.d0 - 34, text: 'WALK ACROSS EVERY SEGMENT' },
    { x: BURGER_X + 48, y: DECK.d4 - 34, text: 'FULL LAYER = IT DROPS' },
    { x: 700, y: DECK.d3 - 34, text: 'LADDERS BEAT FOOTSPEED' },
  ],
};

/**
 * Round 2 reuses the exact geometry for mastery and adds the second enemy
 * earlier, per the progression brief.
 */
export const TUTORIAL_MAP_A_ROUND_2: LevelDef = {
  ...TUTORIAL_MAP_A,
  id: 'map-a-r2',
  round: 2,
  enemySpawns: [
    { species: 'stalker', x: 792, y: DECK.d0, delay: 0.8 },
    { species: 'brat', x: 736, y: DECK.d3, delay: 2.5 },
  ],
  hints: [],
};

export const DECKS = DECK;
