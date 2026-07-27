/**
 * Map B - "Back of House". The first two-face map.
 *
 * The kitchen has a front and a back. Portals are the only way between them,
 * and stepping through one turns the world over: you keep your place in the
 * room while the geometry rotates around you, so a portal on the left of the
 * front opens on the right of the back. That mirror is the whole route puzzle -
 * a portal is a shortcut across the map as much as it is a change of side.
 *
 * The back face carries a secret burger. It is `optional-bonus`: the round can
 * be finished entirely on the front, so a player who never finds the back is
 * never blocked, and a player who does is paid for it.
 *
 * Geometry is authored so that every portal mouth lands on a real platform of
 * the target face. The unit tests prove it rather than trusting the author.
 */

import type { LevelDef } from './types';

export const FLIP_MAP_B: LevelDef = {
  id: 'map-b-back-of-house',
  name: 'Back of House',
  world: 'diner',
  round: 3,
  faces: 2,
  width: 960,

  platforms: [
    // --- front ---------------------------------------------------------
    { id: 'f0-floor', y: 470, x1: 80, x2: 880, face: 0 },
    { id: 'f0-deck1', y: 390, x1: 80, x2: 560, face: 0 },
    { id: 'f0-deck2', y: 310, x1: 320, x2: 880, face: 0 },
    { id: 'f0-deck3', y: 230, x1: 80, x2: 880, face: 0 },
    // --- back ----------------------------------------------------------
    { id: 'f1-floor', y: 470, x1: 80, x2: 880, face: 1 },
    { id: 'f1-deck1', y: 350, x1: 240, x2: 880, face: 1 },
    { id: 'f1-deck2', y: 230, x1: 80, x2: 720, face: 1 },
  ],

  ladders: [
    // --- front ---------------------------------------------------------
    { id: 'f0-l1', x: 200, yTop: 390, yBottom: 470, face: 0 },
    { id: 'f0-l2', x: 480, yTop: 310, yBottom: 390, face: 0 },
    { id: 'f0-l3', x: 760, yTop: 230, yBottom: 310, face: 0 },
    { id: 'f0-l4', x: 360, yTop: 230, yBottom: 310, face: 0 },
    // --- back ----------------------------------------------------------
    { id: 'f1-l1', x: 760, yTop: 350, yBottom: 470, face: 1 },
    { id: 'f1-l2', x: 300, yTop: 230, yBottom: 350, face: 1 },
    { id: 'f1-l3', x: 640, yTop: 230, yBottom: 350, face: 1 },
  ],

  layers: [
    // --- front: the required burger -------------------------------------
    { id: 'b0-bun-bottom', kind: 'bunBottom', x: 400, y: 390, segments: 5, burger: 'front', order: 0, face: 0 },
    { id: 'b0-patty', kind: 'patty', x: 400, y: 310, segments: 5, burger: 'front', order: 1, face: 0 },
    { id: 'b0-bun-top', kind: 'bunTop', x: 400, y: 230, segments: 5, burger: 'front', order: 2, face: 0 },
    // --- back: the secret burger ----------------------------------------
    { id: 'b1-bun-bottom', kind: 'bunBottom', x: 500, y: 350, segments: 5, burger: 'secret', order: 0, face: 1, secret: true },
    { id: 'b1-bun-top', kind: 'bunTop', x: 500, y: 230, segments: 5, burger: 'secret', order: 1, face: 1, secret: true },
  ],

  plates: [
    { id: 'plate-front', burger: 'front', x: 400, y: 470, width: 80 },
    { id: 'plate-secret', burger: 'secret', x: 500, y: 470, width: 80 },
  ],

  playerSpawns: [
    { x: 160, y: 470, face: 0 },
    { x: 240, y: 470, face: 0 },
  ],

  enemySpawns: [
    { x: 840, y: 470, species: 'stalker', delay: 2.5, face: 0 },
    { x: 840, y: 230, species: 'brat', delay: 9, face: 0 },
  ],

  // Left-bottom on the front opens right-bottom on the back, and left-top on
  // the back opens right-top on the front. Neither is a round trip in place:
  // every crossing also moves you across the room.
  portals: [
    { id: 'portal-front-low', x: 200, y: 470, face: 0, targetFace: 1 },
    { id: 'portal-back-high', x: 200, y: 230, face: 1, targetFace: 0 },
  ],

  secret: 'optional-bonus',

  checkpoints: [
    { x: 160, y: 470, face: 0 },
    { x: 480, y: 390, face: 0 },
    { x: 760, y: 230, face: 0 },
  ],

  targetTime: [22, 46],

  hints: [{ x: 200, y: 446, text: 'PORTALS FLIP THE KITCHEN' }],
};
