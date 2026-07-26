/**
 * Chef clip library.
 *
 * Covers the complete animation key set required by MASTER_PROMPT section 17.
 * All four base variants (Sal Boy, Sal Girl, Pep Boy, Pep Girl) play these exact
 * clips - identity personality is expressed through the `personality` scalars
 * below, not through separate timelines, so frame timing and ground contact stay
 * identical across variants as the brief requires.
 *
 * Authoring conventions:
 * - rotations in degrees, times in seconds;
 * - the doll faces +x; negative leg/arm rotation swings the limb forward;
 * - positive torso/head rotation leans forward, negative leans back;
 * - `hips.y` is the only vertical bob channel so ground contact stays authored
 *   in one place.
 */

import { clip, poseClip, type ClipSpec } from '../anim/clip';
import type { Clip } from '../anim/types';

/** Animation event names the gameplay layer listens for. */
export const CHEF_EVENTS = {
  footstep: 'chef.footstep',
  ladderRung: 'chef.ladderRung',
  fieldSpatulaRelease: 'chef.fieldSpatulaRelease',
  flightSpatulaFire: 'chef.flightSpatulaFire',
  launchPush: 'chef.launchPush',
  landSquash: 'chef.landSquash',
  swapSparkle: 'chef.swapSparkle',
  volleySync: 'chef.volleySync',
} as const;

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Neutral standing pose used as the base for several one-shots. */
const NEUTRAL: ClipSpec = {
  hips: { y: [[0, 0]] },
  torso: { rot: [[0, 2]] },
  chest: { rot: [[0, -1]] },
  head: { rot: [[0, 0]] },
  armNearUpper: { rot: [[0, -6]] },
  armNearLower: { rot: [[0, -18]] },
  armFarUpper: { rot: [[0, 6]] },
  armFarLower: { rot: [[0, 18]] },
  legNearUpper: { rot: [[0, -3]] },
  legNearLower: { rot: [[0, 5]] },
  legFarUpper: { rot: [[0, 3]] },
  legFarLower: { rot: [[0, 5]] },
};

// ---------------------------------------------------------------------------
// Stack Phase locomotion
// ---------------------------------------------------------------------------

const idle = clip(
  'idle',
  1.7,
  { loop: 'loop' },
  {
    hips: {
      y: [
        [0, 0],
        [0.85, -0.9],
        [1.7, 0],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.85, 3.4],
        [1.7, 2],
      ],
    },
    chest: {
      rot: [
        [0, -1],
        [0.85, -2.6],
        [1.7, -1],
      ],
    },
    head: {
      rot: [
        [0, 0.5],
        [0.6, -1.4],
        [1.2, 1.2],
        [1.7, 0.5],
      ],
    },
    toque: {
      rot: [
        [0, -1],
        [0.85, 1.6],
        [1.7, -1],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.85, -10],
        [1.7, -6],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [0.85, -13],
        [1.7, -18],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.85, 10],
        [1.7, 6],
      ],
    },
    armFarLower: {
      rot: [
        [0, 18],
        [0.85, 13],
        [1.7, 18],
      ],
    },
    legNearUpper: { rot: [[0, -3]] },
    legFarUpper: { rot: [[0, 3]] },
    legNearLower: { rot: [[0, 5]] },
    legFarLower: { rot: [[0, 5]] },
  },
);

/**
 * Two-step run cycle. Contacts land at t=0.02 and t=0.24 so the footstep events
 * line up with the visual ground contact and the substrate SFX reads correctly.
 */
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
        [0.33, -3.1],
        [0.44, -0.4],
      ],
      x: [
        [0, 0.6],
        [0.22, 1.2],
        [0.44, 0.6],
      ],
      rot: [
        [0, -1.5],
        [0.22, 1.5],
        [0.44, -1.5],
      ],
    },
    torso: {
      rot: [
        [0, 12],
        [0.11, 14],
        [0.22, 12],
        [0.33, 14],
        [0.44, 12],
      ],
    },
    chest: {
      rot: [
        [0, -3],
        [0.22, -5],
        [0.44, -3],
      ],
    },
    head: {
      rot: [
        [0, -7],
        [0.11, -9],
        [0.22, -7],
        [0.33, -9],
        [0.44, -7],
      ],
    },
    toque: {
      rot: [
        [0, -3],
        [0.15, 2],
        [0.3, -3],
        [0.44, -3],
      ],
    },
    armNearUpper: {
      rot: [
        [0, 34],
        [0.22, -40],
        [0.44, 34],
      ],
    },
    armNearLower: {
      rot: [
        [0, -30],
        [0.22, -52],
        [0.44, -30],
      ],
    },
    armFarUpper: {
      rot: [
        [0, -40],
        [0.22, 34],
        [0.44, -40],
      ],
    },
    armFarLower: {
      rot: [
        [0, -52],
        [0.22, -30],
        [0.44, -52],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -38],
        [0.11, -6],
        [0.22, 30],
        [0.33, -12],
        [0.44, -38],
      ],
    },
    legNearLower: {
      rot: [
        [0, 12],
        [0.11, 4],
        [0.22, 10],
        [0.33, 62],
        [0.44, 12],
      ],
    },
    footNear: {
      rot: [
        [0, 14],
        [0.11, 0],
        [0.22, -16],
        [0.33, 8],
        [0.44, 14],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 30],
        [0.11, -12],
        [0.22, -38],
        [0.33, -6],
        [0.44, 30],
      ],
    },
    legFarLower: {
      rot: [
        [0, 10],
        [0.11, 62],
        [0.22, 12],
        [0.33, 4],
        [0.44, 10],
      ],
    },
    footFar: {
      rot: [
        [0, -16],
        [0.11, 8],
        [0.22, 14],
        [0.33, 0],
        [0.44, -16],
      ],
    },
  },
);

/** Hard stop with the arcade-legible backward lean. */
const skid = clip(
  'skid',
  0.32,
  { loop: 'hold', events: [{ t: 0.02, name: CHEF_EVENTS.footstep, value: 'skid' }] },
  {
    hips: {
      y: [
        [0, -1],
        [0.1, 2.5],
        [0.32, 1],
      ],
      x: [
        [0, 0],
        [0.1, -3],
        [0.32, -1.5],
      ],
    },
    torso: {
      rot: [
        [0, 10],
        [0.1, -14],
        [0.32, -8],
      ],
    },
    head: {
      rot: [
        [0, -6],
        [0.12, 8],
        [0.32, 4],
      ],
    },
    armNearUpper: {
      rot: [
        [0, 20],
        [0.1, -62],
        [0.32, -48],
      ],
    },
    armNearLower: {
      rot: [
        [0, -20],
        [0.1, -46],
        [0.32, -38],
      ],
    },
    armFarUpper: {
      rot: [
        [0, -20],
        [0.1, 58],
        [0.32, 44],
      ],
    },
    armFarLower: {
      rot: [
        [0, -30],
        [0.1, 10],
        [0.32, 6],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -20],
        [0.1, -46],
        [0.32, -38],
      ],
    },
    legNearLower: {
      rot: [
        [0, 10],
        [0.1, 6],
        [0.32, 8],
      ],
    },
    footNear: {
      rot: [
        [0, 0],
        [0.1, -22],
        [0.32, -18],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 16],
        [0.1, 26],
        [0.32, 20],
      ],
    },
    legFarLower: {
      rot: [
        [0, 10],
        [0.1, 30],
        [0.32, 24],
      ],
    },
  },
);

/** Quick 180 read - the cut-out turn is the scaleX pinch through zero. */
const pivot = clip(
  'pivot',
  0.2,
  { loop: 'once' },
  {
    hips: {
      sx: [
        [0, 1],
        [0.09, 0.22, 'quadIn'],
        [0.11, 0.22],
        [0.2, 1, 'quadOut'],
      ],
      y: [
        [0, 0],
        [0.1, -2.2],
        [0.2, 0],
      ],
    },
    torso: {
      rot: [
        [0, 6],
        [0.1, 0],
        [0.2, 6],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -20],
        [0.1, -46],
        [0.2, -6],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 20],
        [0.1, 46],
        [0.2, 6],
      ],
    },
  },
);

/** Ladder climb. Hands alternate on the rungs; the torso stays near-vertical. */
const climb = clip(
  'climb',
  0.72,
  {
    loop: 'loop',
    events: [
      { t: 0.03, name: CHEF_EVENTS.ladderRung, value: 'near' },
      { t: 0.39, name: CHEF_EVENTS.ladderRung, value: 'far' },
    ],
  },
  {
    hips: {
      y: [
        [0, 0],
        [0.18, -1.4],
        [0.36, 0],
        [0.54, -1.4],
        [0.72, 0],
      ],
      rot: [
        [0, -2],
        [0.36, 2],
        [0.72, -2],
      ],
    },
    torso: { rot: [[0, -2]] },
    chest: { rot: [[0, 1]] },
    head: {
      rot: [
        [0, -2],
        [0.36, 2],
        [0.72, -2],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -128],
        [0.36, -46],
        [0.72, -128],
      ],
    },
    armNearLower: {
      rot: [
        [0, 26],
        [0.36, 16],
        [0.72, 26],
      ],
    },
    armFarUpper: {
      rot: [
        [0, -46],
        [0.36, -128],
        [0.72, -46],
      ],
    },
    armFarLower: {
      rot: [
        [0, 16],
        [0.36, 26],
        [0.72, 16],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -8],
        [0.36, -46],
        [0.72, -8],
      ],
    },
    legNearLower: {
      rot: [
        [0, 12],
        [0.36, 52],
        [0.72, 12],
      ],
    },
    legFarUpper: {
      rot: [
        [0, -46],
        [0.36, -8],
        [0.72, -46],
      ],
    },
    legFarLower: {
      rot: [
        [0, 52],
        [0.36, 12],
        [0.72, 52],
      ],
    },
    footNear: { rot: [[0, -8]] },
    footFar: { rot: [[0, -8]] },
  },
);

/** Held grip while stationary on a ladder. */
const climbIdle = poseClip('climbIdle', 0.4, {
  hips: { y: [[0, 0]] },
  torso: { rot: [[0, -2]] },
  armNearUpper: { rot: [[0, -120]] },
  armNearLower: { rot: [[0, 22]] },
  armFarUpper: { rot: [[0, -54]] },
  armFarLower: { rot: [[0, 20]] },
  legNearUpper: { rot: [[0, -10]] },
  legNearLower: { rot: [[0, 16]] },
  legFarUpper: { rot: [[0, -40]] },
  legFarLower: { rot: [[0, 46]] },
});

/** Weight-drop onto an ingredient tread segment. */
const compress = clip(
  'compress',
  0.26,
  { loop: 'once', events: [{ t: 0.05, name: CHEF_EVENTS.landSquash }] },
  {
    hips: {
      y: [
        [0, 0],
        [0.06, 3.4, 'quadOut'],
        [0.26, 0, 'backOut'],
      ],
      sy: [
        [0, 1],
        [0.06, 0.88],
        [0.26, 1],
      ],
      sx: [
        [0, 1],
        [0.06, 1.09],
        [0.26, 1],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.06, 12],
        [0.26, 2],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.06, 7],
        [0.26, 0],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [0.06, -28],
        [0.26, -3],
      ],
    },
    legNearLower: {
      rot: [
        [0, 5],
        [0.06, 42],
        [0.26, 5],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [0.06, -22],
        [0.26, 3],
      ],
    },
    legFarLower: {
      rot: [
        [0, 5],
        [0.06, 38],
        [0.26, 5],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.06, -34],
        [0.26, -6],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.06, 34],
        [0.26, 6],
      ],
    },
  },
);

// ---------------------------------------------------------------------------
// Portals, damage, spatulas
// ---------------------------------------------------------------------------

const portalEnter = clip(
  'portalEnter',
  0.42,
  { loop: 'hold' },
  {
    hips: {
      sx: [
        [0, 1],
        [0.42, 0.05, 'quadIn'],
      ],
      sy: [
        [0, 1],
        [0.16, 1.16],
        [0.42, 0.4, 'quadIn'],
      ],
      y: [
        [0, 0],
        [0.42, -6],
      ],
      a: [
        [0, 1],
        [0.3, 1],
        [0.42, 0],
      ],
      rot: [
        [0, 0],
        [0.42, 26],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.42, -110],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.42, -110],
      ],
    },
  },
);

const portalExit = clip(
  'portalExit',
  0.38,
  { loop: 'once' },
  {
    hips: {
      sx: [
        [0, 0.05],
        [0.38, 1, 'backOut'],
      ],
      sy: [
        [0, 0.4],
        [0.38, 1, 'backOut'],
      ],
      y: [
        [0, -6],
        [0.38, 0],
      ],
      a: [
        [0, 0],
        [0.12, 1],
      ],
      rot: [
        [0, -20],
        [0.38, 0],
      ],
    },
    head: {
      rot: [
        [0, -10],
        [0.38, 0],
      ],
    },
  },
);

/** Readable hit: knocked back, chin up, arms flung. No gore, comic only. */
const hit = clip(
  'hit',
  0.5,
  { loop: 'hold' },
  {
    hips: {
      x: [
        [0, 0],
        [0.1, -7, 'quadOut'],
        [0.5, -4],
      ],
      y: [
        [0, 0],
        [0.1, -4],
        [0.28, 0.5],
        [0.5, 0],
      ],
      rot: [
        [0, 0],
        [0.1, -16],
        [0.5, -8],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.1, -22],
        [0.5, -12],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.1, -26],
        [0.5, -14],
      ],
    },
    toque: {
      rot: [
        [0, 0],
        [0.1, -22],
        [0.32, 10],
        [0.5, -4],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.1, -104],
        [0.5, -70],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [0.1, -30],
        [0.5, -24],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.1, -96],
        [0.5, -64],
      ],
    },
    armFarLower: {
      rot: [
        [0, 18],
        [0.1, -20],
        [0.5, -16],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [0.1, -40],
        [0.5, -18],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [0.1, 22],
        [0.5, 12],
      ],
    },
  },
);

const respawn = clip(
  'respawn',
  0.62,
  { loop: 'once' },
  {
    hips: {
      a: [
        [0, 0],
        [0.1, 1],
        [0.18, 0.35],
        [0.26, 1],
        [0.36, 0.5],
        [0.44, 1],
      ],
      sy: [
        [0, 0.6],
        [0.2, 1.1],
        [0.62, 1, 'backOut'],
      ],
      sx: [
        [0, 1.3],
        [0.2, 0.94],
        [0.62, 1, 'backOut'],
      ],
      y: [
        [0, 6],
        [0.62, 0],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -46],
        [0.62, -6],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 46],
        [0.62, 6],
      ],
    },
  },
);

const fieldPickup = clip(
  'fieldPickup',
  0.42,
  { loop: 'once' },
  {
    hips: {
      y: [
        [0, 0],
        [0.16, 4],
        [0.42, 0],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.16, 26],
        [0.42, 2],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.16, 16],
        [0.42, 0],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.16, 44],
        [0.3, -30],
        [0.42, -6],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [0.16, -6],
        [0.42, -18],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [0.16, -34],
        [0.42, -3],
      ],
    },
    legNearLower: {
      rot: [
        [0, 5],
        [0.16, 48],
        [0.42, 5],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [0.16, -26],
        [0.42, 3],
      ],
    },
    legFarLower: {
      rot: [
        [0, 5],
        [0.16, 40],
        [0.42, 5],
      ],
    },
  },
);

/** Finite Stack Phase field spatula. Release lands on the forward snap. */
const fieldThrow = clip(
  'fieldThrow',
  0.44,
  {
    loop: 'once',
    events: [{ t: 0.19, name: CHEF_EVENTS.fieldSpatulaRelease }],
  },
  {
    hips: {
      x: [
        [0, 0],
        [0.14, -2.5],
        [0.24, 2],
        [0.44, 0],
      ],
      rot: [
        [0, 0],
        [0.14, -8],
        [0.24, 6],
        [0.44, 0],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.14, -14],
        [0.24, 18],
        [0.44, 2],
      ],
    },
    chest: {
      rot: [
        [0, -1],
        [0.14, -8],
        [0.24, 8],
        [0.44, -1],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.14, -8],
        [0.24, 6],
        [0.44, 0],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.14, -160, 'quadOut'],
        [0.2, -132],
        [0.24, -34, 'quadIn'],
        [0.44, -6],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [0.14, -58],
        [0.24, 6],
        [0.44, -18],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.14, 40],
        [0.24, -18],
        [0.44, 6],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [0.14, 10],
        [0.24, -22],
        [0.44, -3],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [0.14, -14],
        [0.24, 18],
        [0.44, 3],
      ],
    },
  },
);

// ---------------------------------------------------------------------------
// Boss warning and launch
// ---------------------------------------------------------------------------

/** Additive layer: the chef notices the klaxon and looks up. */
const lookUp = clip(
  'lookUp',
  0.5,
  { loop: 'hold', additive: true },
  {
    head: {
      rot: [
        [0, 0],
        [0.22, -30, 'backOut'],
        [0.5, -26],
      ],
    },
    neck: {
      rot: [
        [0, 0],
        [0.22, -10],
        [0.5, -8],
      ],
    },
    chest: {
      rot: [
        [0, 0],
        [0.22, -8],
        [0.5, -6],
      ],
    },
    torso: {
      rot: [
        [0, 0],
        [0.22, -6],
        [0.5, -5],
      ],
    },
    toque: {
      rot: [
        [0, 0],
        [0.22, 8],
        [0.5, 6],
      ],
    },
  },
);

const bossWarningLookUp = clip(
  'bossWarningLookUp',
  0.9,
  { loop: 'hold' },
  {
    hips: {
      y: [
        [0, 0],
        [0.9, -1],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.3, -12],
        [0.9, -10],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.3, -34, 'backOut'],
        [0.9, -30],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.3, -58],
        [0.9, -52],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [0.3, -40],
        [0.9, -36],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.3, -34],
        [0.9, -30],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [0.9, -8],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [0.9, 8],
      ],
    },
  },
);

const crouchLaunch = clip(
  'crouchLaunch',
  0.62,
  {
    loop: 'hold',
    events: [{ t: 0.3, name: CHEF_EVENTS.launchPush }],
  },
  {
    hips: {
      y: [
        [0, -1],
        [0.26, 9, 'quadOut'],
        [0.3, 7],
        [0.62, -34, 'quadIn'],
      ],
      sy: [
        [0, 1],
        [0.26, 0.82],
        [0.36, 1.16],
        [0.62, 1.12],
      ],
      sx: [
        [0, 1],
        [0.26, 1.14],
        [0.36, 0.9],
        [0.62, 0.94],
      ],
    },
    torso: {
      rot: [
        [0, -10],
        [0.26, 16],
        [0.62, -14],
      ],
    },
    head: {
      rot: [
        [0, -30],
        [0.26, -6],
        [0.62, -34],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -52],
        [0.26, 44],
        [0.62, -168],
      ],
    },
    armNearLower: {
      rot: [
        [0, -36],
        [0.26, 10],
        [0.62, -20],
      ],
    },
    armFarUpper: {
      rot: [
        [0, -30],
        [0.26, 50],
        [0.62, -158],
      ],
    },
    armFarLower: {
      rot: [
        [0, 18],
        [0.26, 14],
        [0.62, -14],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -8],
        [0.26, -62],
        [0.62, 16],
      ],
    },
    legNearLower: {
      rot: [
        [0, 5],
        [0.26, 78],
        [0.62, 8],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 8],
        [0.26, -54],
        [0.62, 26],
      ],
    },
    legFarLower: {
      rot: [
        [0, 5],
        [0.26, 70],
        [0.62, 12],
      ],
    },
    footNear: {
      rot: [
        [0, 0],
        [0.26, 26],
        [0.62, -28],
      ],
    },
    footFar: {
      rot: [
        [0, 0],
        [0.26, 22],
        [0.62, -24],
      ],
    },
  },
);

// ---------------------------------------------------------------------------
// Boss Flight
// ---------------------------------------------------------------------------

/** Horizontal flight pose: body tipped forward, legs trailing, cloth flying. */
const flightIdle = clip(
  'flightIdle',
  1.15,
  { loop: 'loop' },
  {
    hips: {
      rot: [
        [0, -16],
        [0.57, -12],
        [1.15, -16],
      ],
      y: [
        [0, 0],
        [0.57, -2.2],
        [1.15, 0],
      ],
    },
    torso: {
      rot: [
        [0, -8],
        [0.57, -12],
        [1.15, -8],
      ],
    },
    chest: {
      rot: [
        [0, 4],
        [0.57, 7],
        [1.15, 4],
      ],
    },
    head: {
      rot: [
        [0, 10],
        [0.57, 7],
        [1.15, 10],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -74],
        [0.57, -68],
        [1.15, -74],
      ],
    },
    armNearLower: {
      rot: [
        [0, -22],
        [0.57, -28],
        [1.15, -22],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 44],
        [0.57, 50],
        [1.15, 44],
      ],
    },
    armFarLower: {
      rot: [
        [0, 26],
        [0.57, 20],
        [1.15, 26],
      ],
    },
    legNearUpper: {
      rot: [
        [0, 40],
        [0.57, 46],
        [1.15, 40],
      ],
    },
    legNearLower: {
      rot: [
        [0, -14],
        [0.57, -22],
        [1.15, -14],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 54],
        [0.57, 48],
        [1.15, 54],
      ],
    },
    legFarLower: {
      rot: [
        [0, -20],
        [0.57, -12],
        [1.15, -20],
      ],
    },
    footNear: { rot: [[0, 18]] },
    footFar: { rot: [[0, 22]] },
  },
);

/**
 * Additive fire recoil, looped at the boss-flight cadence. Layering it keeps the
 * flight pose intact while the throwing arm cycles - and because it is additive
 * the wing partner and both co-op players can share one clip.
 */
const flightFire = clip(
  'flightFire',
  0.145,
  {
    loop: 'loop',
    additive: true,
    events: [{ t: 0.02, name: CHEF_EVENTS.flightSpatulaFire }],
  },
  {
    armNearUpper: {
      rot: [
        [0, 0],
        [0.04, -34, 'quadOut'],
        [0.09, 16],
        [0.145, 0],
      ],
    },
    armNearLower: {
      rot: [
        [0, 0],
        [0.04, -18],
        [0.09, 8],
        [0.145, 0],
      ],
    },
    hips: {
      x: [
        [0, 0],
        [0.05, -1.6],
        [0.145, 0],
      ],
    },
    torso: {
      rot: [
        [0, 0],
        [0.05, -3],
        [0.145, 0],
      ],
    },
  },
);

const flightHit = clip(
  'flightHit',
  0.48,
  { loop: 'hold' },
  {
    hips: {
      x: [
        [0, 0],
        [0.1, -11, 'quadOut'],
        [0.48, -5],
      ],
      rot: [
        [0, -16],
        [0.1, 22],
        [0.48, -8],
      ],
    },
    torso: {
      rot: [
        [0, -8],
        [0.1, 20],
        [0.48, -4],
      ],
    },
    head: {
      rot: [
        [0, 10],
        [0.1, 28],
        [0.48, 14],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -74],
        [0.1, -128],
        [0.48, -84],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 44],
        [0.1, 96],
        [0.48, 52],
      ],
    },
    legNearUpper: {
      rot: [
        [0, 40],
        [0.1, 68],
        [0.48, 44],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 54],
        [0.1, 78],
        [0.48, 58],
      ],
    },
  },
);

/** The synchronised sibling finisher on boss defeat. */
const pairedVolley = clip(
  'pairedVolley',
  0.85,
  {
    loop: 'hold',
    events: [
      { t: 0.24, name: CHEF_EVENTS.volleySync },
      { t: 0.26, name: CHEF_EVENTS.flightSpatulaFire },
      { t: 0.32, name: CHEF_EVENTS.flightSpatulaFire },
      { t: 0.38, name: CHEF_EVENTS.flightSpatulaFire },
    ],
  },
  {
    hips: {
      x: [
        [0, 0],
        [0.2, -9],
        [0.32, 8],
        [0.85, 4],
      ],
      rot: [
        [0, -16],
        [0.2, -30],
        [0.32, -4],
        [0.85, -12],
      ],
    },
    torso: {
      rot: [
        [0, -8],
        [0.2, -22],
        [0.32, 14],
        [0.85, -6],
      ],
    },
    head: {
      rot: [
        [0, 10],
        [0.2, -6],
        [0.32, 16],
        [0.85, 8],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -74],
        [0.2, -172],
        [0.32, -30, 'quadIn'],
        [0.85, -64],
      ],
    },
    armNearLower: {
      rot: [
        [0, -22],
        [0.2, -52],
        [0.32, 8],
        [0.85, -20],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 44],
        [0.2, -164],
        [0.32, -24],
        [0.85, 40],
      ],
    },
    armFarLower: {
      rot: [
        [0, 26],
        [0.2, -40],
        [0.32, 10],
        [0.85, 24],
      ],
    },
    legNearUpper: {
      rot: [
        [0, 40],
        [0.2, 62],
        [0.32, 22],
        [0.85, 40],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 54],
        [0.2, 74],
        [0.32, 30],
        [0.85, 54],
      ],
    },
  },
);

// ---------------------------------------------------------------------------
// Results, select screen, device states
// ---------------------------------------------------------------------------

const victory = clip(
  'victory',
  1.25,
  { loop: 'hold' },
  {
    hips: {
      y: [
        [0, 0],
        [0.14, 4, 'quadOut'],
        [0.4, -13, 'quadOut'],
        [0.62, 0, 'quadIn'],
        [0.72, 2],
        [1.25, 0, 'backOut'],
      ],
      sy: [
        [0, 1],
        [0.14, 0.86],
        [0.4, 1.1],
        [0.66, 0.92],
        [1.25, 1],
      ],
      sx: [
        [0, 1],
        [0.14, 1.12],
        [0.4, 0.92],
        [0.66, 1.08],
        [1.25, 1],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [0.14, 16],
        [0.4, -12],
        [1.25, -4],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.14, 12],
        [0.4, -16],
        [1.25, -6],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [0.14, 34],
        [0.4, -168],
        [0.9, -150],
        [1.25, -160],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [0.4, -22],
        [1.25, -14],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [0.14, 38],
        [0.4, -156],
        [0.9, -142],
        [1.25, -150],
      ],
    },
    armFarLower: {
      rot: [
        [0, 18],
        [0.4, 20],
        [1.25, 14],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [0.14, -40],
        [0.4, -24],
        [1.25, -4],
      ],
    },
    legNearLower: {
      rot: [
        [0, 5],
        [0.14, 54],
        [0.4, 30],
        [1.25, 6],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [0.14, -32],
        [0.4, 22],
        [1.25, 4],
      ],
    },
    legFarLower: {
      rot: [
        [0, 5],
        [0.14, 46],
        [0.4, 8],
        [1.25, 6],
      ],
    },
  },
);

const gameOver = clip(
  'gameOver',
  1.0,
  { loop: 'hold' },
  {
    hips: {
      y: [
        [0, 0],
        [1.0, 5],
      ],
      rot: [
        [0, 0],
        [1.0, -4],
      ],
    },
    torso: {
      rot: [
        [0, 2],
        [1.0, 24],
      ],
    },
    chest: {
      rot: [
        [0, -1],
        [1.0, 10],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [1.0, 26],
      ],
    },
    toque: {
      rot: [
        [0, 0],
        [0.4, -14],
        [1.0, -10],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -6],
        [1.0, 22],
      ],
    },
    armNearLower: {
      rot: [
        [0, -18],
        [1.0, -6],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 6],
        [1.0, 26],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -3],
        [1.0, -16],
      ],
    },
    legNearLower: {
      rot: [
        [0, 5],
        [1.0, 24],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 3],
        [1.0, 12],
      ],
    },
    legFarLower: {
      rot: [
        [0, 5],
        [1.0, 20],
      ],
    },
  },
);

const selectIdle = clip(
  'selectIdle',
  2.3,
  { loop: 'loop' },
  {
    hips: {
      y: [
        [0, 0],
        [0.58, -1.6],
        [1.15, 0],
        [1.72, -1.2],
        [2.3, 0],
      ],
      rot: [
        [0, -1],
        [1.15, 1],
        [2.3, -1],
      ],
    },
    torso: {
      rot: [
        [0, 1],
        [1.15, 4],
        [2.3, 1],
      ],
    },
    head: {
      rot: [
        [0, -2],
        [0.7, 3],
        [1.5, -4],
        [2.3, -2],
      ],
    },
    toque: {
      rot: [
        [0, -2],
        [1.15, 3],
        [2.3, -2],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -14],
        [1.15, -22],
        [2.3, -14],
      ],
    },
    armNearLower: {
      rot: [
        [0, -34],
        [1.15, -26],
        [2.3, -34],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 12],
        [1.15, 18],
        [2.3, 12],
      ],
    },
    armFarLower: {
      rot: [
        [0, 22],
        [1.15, 16],
        [2.3, 22],
      ],
    },
    legNearUpper: { rot: [[0, -6]] },
    legFarUpper: { rot: [[0, 8]] },
    legNearLower: { rot: [[0, 6]] },
    legFarLower: { rot: [[0, 4]] },
  },
);

/**
 * Character-select turntable. A cut-out doll turns by pinching through zero
 * width and flipping the sheet - the classic paper-puppet spin, and it keeps
 * the toque letter legible because the emblem part counter-flips.
 */
const turntable = clip(
  'turntable',
  3.2,
  { loop: 'loop' },
  {
    hips: {
      sx: [
        [0, 1],
        [0.8, 0.04, 'sineIn'],
        [1.6, -1, 'sineOut'],
        [2.4, -0.04, 'sineIn'],
        [3.2, 1, 'sineOut'],
      ],
      y: [
        [0, 0],
        [0.8, -1.4],
        [1.6, 0],
        [2.4, -1.4],
        [3.2, 0],
      ],
    },
    torso: { rot: [[0, 2]] },
    armNearUpper: {
      rot: [
        [0, -14],
        [1.6, -20],
        [3.2, -14],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 14],
        [1.6, 20],
        [3.2, 14],
      ],
    },
  },
);

const joinIn = clip(
  'joinIn',
  0.5,
  { loop: 'once' },
  {
    hips: {
      y: [
        [0, 34],
        [0.32, -5, 'quadOut'],
        [0.5, 0, 'bounceOut'],
      ],
      sy: [
        [0, 0.8],
        [0.32, 1.12],
        [0.5, 1],
      ],
      sx: [
        [0, 1.16],
        [0.32, 0.92],
        [0.5, 1],
      ],
      a: [
        [0, 0],
        [0.12, 1],
      ],
    },
    armNearUpper: {
      rot: [
        [0, 40],
        [0.32, -46],
        [0.5, -14],
      ],
    },
    armFarUpper: {
      rot: [
        [0, -40],
        [0.32, 46],
        [0.5, 12],
      ],
    },
    head: {
      rot: [
        [0, 18],
        [0.32, -12],
        [0.5, -2],
      ],
    },
  },
);

/**
 * Swap between Sal and Pep panels. The doll slides out, the skin is exchanged at
 * the midpoint, and it slides back - presentation, device and slot colour are
 * untouched because they live outside the rig.
 */
const identitySwap = clip(
  'identitySwap',
  0.52,
  { loop: 'once', events: [{ t: 0.26, name: CHEF_EVENTS.swapSparkle }] },
  {
    hips: {
      x: [
        [0, 0],
        [0.24, 26, 'quadIn'],
        [0.28, -26],
        [0.52, 0, 'backOut'],
      ],
      sx: [
        [0, 1],
        [0.24, 0.3],
        [0.28, 0.3],
        [0.52, 1],
      ],
      a: [
        [0, 1],
        [0.24, 0.15],
        [0.28, 0.15],
        [0.42, 1],
      ],
      rot: [
        [0, 0],
        [0.24, 14],
        [0.28, -14],
        [0.52, 0],
      ],
    },
  },
);

/**
 * Boy/Girl presentation change. A clean vertical shimmer with no transformation
 * gag - the art bible is explicit that this must not read as a mocking effect.
 */
const presentationSwap = clip(
  'presentationSwap',
  0.44,
  { loop: 'once', events: [{ t: 0.22, name: CHEF_EVENTS.swapSparkle }] },
  {
    hips: {
      sy: [
        [0, 1],
        [0.2, 1.06],
        [0.22, 1.06],
        [0.44, 1],
      ],
      a: [
        [0, 1],
        [0.2, 0.55],
        [0.24, 0.55],
        [0.38, 1],
      ],
      y: [
        [0, 0],
        [0.22, -2.5],
        [0.44, 0],
      ],
    },
    head: {
      rot: [
        [0, 0],
        [0.22, -6],
        [0.44, 0],
      ],
    },
  },
);

const ready = clip(
  'ready',
  0.62,
  { loop: 'hold' },
  {
    hips: {
      y: [
        [0, 0],
        [0.16, 3],
        [0.36, -5],
        [0.62, 0, 'backOut'],
      ],
    },
    torso: {
      rot: [
        [0, 1],
        [0.16, 12],
        [0.36, -8],
        [0.62, -4],
      ],
    },
    head: {
      rot: [
        [0, -2],
        [0.36, -10],
        [0.62, -6],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -14],
        [0.16, 26],
        [0.36, -150, 'backOut'],
        [0.62, -142],
      ],
    },
    armNearLower: {
      rot: [
        [0, -34],
        [0.36, -24],
        [0.62, -20],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 12],
        [0.36, 30],
        [0.62, 26],
      ],
    },
    legNearUpper: {
      rot: [
        [0, -6],
        [0.16, -26],
        [0.62, -8],
      ],
    },
    legFarUpper: {
      rot: [
        [0, 8],
        [0.16, -14],
        [0.62, 10],
      ],
    },
  },
);

const unready = clip(
  'unready',
  0.36,
  { loop: 'once' },
  {
    hips: {
      y: [
        [0, 0],
        [0.14, 2.5],
        [0.36, 0],
      ],
    },
    torso: {
      rot: [
        [0, -4],
        [0.14, 8],
        [0.36, 1],
      ],
    },
    head: {
      rot: [
        [0, -6],
        [0.14, 8],
        [0.36, -2],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -142],
        [0.36, -14],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 26],
        [0.36, 12],
      ],
    },
  },
);

/** Held "where did my controller go" beat during a disconnect. */
const deviceLost = clip(
  'deviceLost',
  1.4,
  { loop: 'loop' },
  {
    hips: {
      y: [
        [0, 0],
        [0.7, 1.6],
        [1.4, 0],
      ],
    },
    torso: {
      rot: [
        [0, 1],
        [0.7, 6],
        [1.4, 1],
      ],
    },
    head: {
      rot: [
        [0, -8],
        [0.35, 10],
        [0.7, -8],
        [1.05, 10],
        [1.4, -8],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -52],
        [0.7, -44],
        [1.4, -52],
      ],
    },
    armNearLower: {
      rot: [
        [0, -66],
        [0.7, -74],
        [1.4, -66],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 50],
        [0.7, 42],
        [1.4, 50],
      ],
    },
    armFarLower: {
      rot: [
        [0, 64],
        [0.7, 72],
        [1.4, 64],
      ],
    },
  },
);

/** Slot-preserving reconnect acknowledgement: a decisive nod. */
const deviceReconnect = clip(
  'deviceReconnect',
  0.6,
  { loop: 'once' },
  {
    hips: {
      y: [
        [0, 0],
        [0.2, 2],
        [0.6, 0],
      ],
    },
    head: {
      rot: [
        [0, -8],
        [0.18, 18],
        [0.34, -6],
        [0.6, -2],
      ],
    },
    torso: {
      rot: [
        [0, 1],
        [0.18, 10],
        [0.6, 1],
      ],
    },
    armNearUpper: {
      rot: [
        [0, -52],
        [0.24, -128],
        [0.6, -14],
      ],
    },
    armFarUpper: {
      rot: [
        [0, 50],
        [0.24, 20],
        [0.6, 12],
      ],
    },
  },
);

const neutralPose = poseClip('neutral', 0.5, NEUTRAL);

export const CHEF_CLIPS: readonly Clip[] = [
  neutralPose,
  idle,
  run,
  skid,
  pivot,
  climb,
  climbIdle,
  compress,
  portalEnter,
  portalExit,
  hit,
  respawn,
  fieldPickup,
  fieldThrow,
  lookUp,
  bossWarningLookUp,
  crouchLaunch,
  flightIdle,
  flightFire,
  flightHit,
  pairedVolley,
  victory,
  gameOver,
  selectIdle,
  turntable,
  joinIn,
  identitySwap,
  presentationSwap,
  ready,
  unready,
  deviceLost,
  deviceReconnect,
];

export const CHEF_CLIP_IDS = CHEF_CLIPS.map((c) => c.id);
