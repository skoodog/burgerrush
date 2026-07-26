/**
 * Food-foe doll: one shared skeleton, clip library and state graph for the whole
 * enemy roster. A new foe is art plus a brain - never a new animation system.
 */

import { DEG } from '../core/math';
import { clip, poseClip } from '../anim/clip';
import type { AnimGraphDef, Clip, ClothChainDef, DollDef, PartDef, SkeletonDef } from '../anim/types';
import { enemyBodySize, type EnemySpecies } from '../art/enemyArt';
import type { DollSkin } from '../anim/dollRig';

const BONES = [
  { name: 'body', parent: null, x: 0, y: -12, rotation: 0, length: 10 },
  { name: 'face', parent: 'body', x: 0, y: 0, rotation: 0, length: 6 },
  { name: 'armL', parent: 'body', x: -6, y: -2, rotation: 150 * DEG, length: 7 },
  { name: 'armR', parent: 'body', x: 6, y: -2, rotation: 30 * DEG, length: 7 },
  { name: 'legL', parent: 'body', x: -4, y: 7, rotation: 90 * DEG, length: 7 },
  { name: 'legR', parent: 'body', x: 4, y: 7, rotation: 90 * DEG, length: 7 },
  { name: 'footL', parent: 'legL', x: 7, y: 0, rotation: -90 * DEG, length: 5 },
  { name: 'footR', parent: 'legR', x: 7, y: 0, rotation: -90 * DEG, length: 5 },
  { name: 'stunHalo', parent: 'body', x: 0, y: -14, rotation: 0, length: 4 },
] as const;

export const ENEMY_SKELETON: SkeletonDef = {
  id: 'enemy',
  bones: [...BONES],
  sockets: ['body', 'face'],
};

const PARTS: readonly PartDef[] = [
  { id: 'armL', bone: 'armL', texture: 'enemy.arm', z: 10, x: 3.5, y: 0, rotation: 0, originX: 0.5, originY: 0.5 },
  { id: 'legL', bone: 'legL', texture: 'enemy.leg', z: 12, x: 3.5, y: 0, rotation: 0, originX: 0.5, originY: 0.5 },
  { id: 'footL', bone: 'footL', texture: 'enemy.foot', z: 13, x: 1, y: -1, rotation: 0, originX: 0.4, originY: 0.5 },
  { id: 'legR', bone: 'legR', texture: 'enemy.leg', z: 20, x: 3.5, y: 0, rotation: 0, originX: 0.5, originY: 0.5 },
  { id: 'footR', bone: 'footR', texture: 'enemy.foot', z: 21, x: 1, y: -1, rotation: 0, originX: 0.4, originY: 0.5 },
  { id: 'body', bone: 'body', texture: 'enemy.body', z: 30, x: 0, y: 0, rotation: 0, originX: 0.5, originY: 0.5 },
  { id: 'armR', bone: 'armR', texture: 'enemy.arm', z: 40, x: 3.5, y: 0, rotation: 0, originX: 0.5, originY: 0.5 },
  {
    id: 'stunStar',
    bone: 'stunHalo',
    texture: 'slot.stun',
    z: 50,
    x: 0,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    hiddenByDefault: true,
  },
];

const CLOTH: readonly ClothChainDef[] = [
  {
    bone: 'body',
    stiffness: 90,
    damping: 12,
    gravity: 0,
    drag: -0.03,
    lift: 0.02,
    maxAngle: 16 * DEG,
  },
];

export const ENEMY_DOLL: DollDef = {
  id: 'enemy',
  skeleton: ENEMY_SKELETON,
  parts: PARTS,
  cloth: CLOTH,
  bounds: { x: -18, y: -32, w: 36, h: 34 },
};

export const ENEMY_EVENTS = {
  step: 'enemy.step',
  telegraph: 'enemy.telegraph',
} as const;

const enemyIdle = clip(
  'idle',
  1.4,
  { loop: 'loop' },
  {
    body: {
      y: [
        [0, 0],
        [0.7, -1.4],
        [1.4, 0],
      ],
      sy: [
        [0, 1],
        [0.7, 1.05],
        [1.4, 1],
      ],
      sx: [
        [0, 1],
        [0.7, 0.96],
        [1.4, 1],
      ],
    },
    armL: {
      rot: [
        [0, 0],
        [0.7, -12],
        [1.4, 0],
      ],
    },
    armR: {
      rot: [
        [0, 0],
        [0.7, 12],
        [1.4, 0],
      ],
    },
  },
);

const enemyMove = clip(
  'move',
  0.42,
  {
    loop: 'loop',
    events: [
      { t: 0.02, name: ENEMY_EVENTS.step },
      { t: 0.23, name: ENEMY_EVENTS.step },
    ],
  },
  {
    body: {
      y: [
        [0, 0],
        [0.1, -2.6],
        [0.21, 0],
        [0.31, -2.6],
        [0.42, 0],
      ],
      rot: [
        [0, -4],
        [0.21, 4],
        [0.42, -4],
      ],
    },
    legL: {
      rot: [
        [0, -30],
        [0.21, 26],
        [0.42, -30],
      ],
    },
    legR: {
      rot: [
        [0, 26],
        [0.21, -30],
        [0.42, 26],
      ],
    },
    footL: {
      rot: [
        [0, 12],
        [0.21, -12],
        [0.42, 12],
      ],
    },
    footR: {
      rot: [
        [0, -12],
        [0.21, 12],
        [0.42, -12],
      ],
    },
    armL: {
      rot: [
        [0, 26],
        [0.21, -22],
        [0.42, 26],
      ],
    },
    armR: {
      rot: [
        [0, -22],
        [0.21, 26],
        [0.42, -22],
      ],
    },
  },
);

const enemyClimb = clip(
  'climb',
  0.66,
  { loop: 'loop' },
  {
    body: {
      y: [
        [0, 0],
        [0.33, -1.6],
        [0.66, 0],
      ],
    },
    armL: {
      rot: [
        [0, -110],
        [0.33, -20],
        [0.66, -110],
      ],
    },
    armR: {
      rot: [
        [0, 20],
        [0.33, 110],
        [0.66, 20],
      ],
    },
    legL: {
      rot: [
        [0, -22],
        [0.33, 18],
        [0.66, -22],
      ],
    },
    legR: {
      rot: [
        [0, 18],
        [0.33, -22],
        [0.66, 18],
      ],
    },
  },
);

/** Visible "thinking" beat so predictive brains stay readable and fair. */
const enemyTelegraph = clip(
  'telegraph',
  0.5,
  { loop: 'hold', events: [{ t: 0.05, name: ENEMY_EVENTS.telegraph }] },
  {
    body: {
      sy: [
        [0, 1],
        [0.12, 1.14],
        [0.3, 0.94],
        [0.5, 1],
      ],
      sx: [
        [0, 1],
        [0.12, 0.9],
        [0.3, 1.08],
        [0.5, 1],
      ],
      rot: [
        [0, 0],
        [0.16, -10],
        [0.34, 8],
        [0.5, 0],
      ],
    },
    armL: {
      rot: [
        [0, 0],
        [0.16, -40],
        [0.5, 0],
      ],
    },
    armR: {
      rot: [
        [0, 0],
        [0.16, 40],
        [0.5, 0],
      ],
    },
  },
);

const enemyStun = clip(
  'stun',
  0.9,
  { loop: 'loop', slots: { 'slot.stun': 'enemy.stunStar' } },
  {
    body: {
      rot: [
        [0, -16],
        [0.45, 16],
        [0.9, -16],
      ],
      y: [
        [0, 2],
        [0.9, 2],
      ],
      sy: [[0, 0.82]],
      sx: [[0, 1.14]],
    },
    stunHalo: {
      rot: [
        [0, 0],
        [0.9, 360],
      ],
      x: [
        [0, -4],
        [0.45, 4],
        [0.9, -4],
      ],
    },
    armL: { rot: [[0, -50]] },
    armR: { rot: [[0, 50]] },
  },
);

const enemyCarried = poseClip('carried', 0.5, {
  body: { rot: [[0, 8]], sy: [[0, 0.9]], sx: [[0, 1.08]] },
  armL: { rot: [[0, -80]] },
  armR: { rot: [[0, 80]] },
  legL: { rot: [[0, -34]] },
  legR: { rot: [[0, -30]] },
});

const enemyFlatten = clip(
  'flatten',
  0.6,
  { loop: 'hold' },
  {
    body: {
      sy: [
        [0, 1],
        [0.12, 0.22, 'quadOut'],
        [0.6, 0.18],
      ],
      sx: [
        [0, 1],
        [0.12, 1.6],
        [0.6, 1.7],
      ],
      y: [
        [0, 0],
        [0.12, 10],
        [0.6, 11],
      ],
      a: [
        [0, 1],
        [0.4, 1],
        [0.6, 0],
      ],
    },
    armL: { rot: [[0, -90]] },
    armR: { rot: [[0, 90]] },
  },
);

const enemyPortal = clip(
  'portal',
  0.4,
  { loop: 'hold' },
  {
    body: {
      sx: [
        [0, 1],
        [0.4, 0.06, 'quadIn'],
      ],
      sy: [
        [0, 1],
        [0.16, 1.2],
        [0.4, 0.5],
      ],
      a: [
        [0, 1],
        [0.3, 1],
        [0.4, 0],
      ],
    },
  },
);

export const ENEMY_CLIPS: readonly Clip[] = [
  enemyIdle,
  enemyMove,
  enemyClimb,
  enemyTelegraph,
  enemyStun,
  enemyCarried,
  enemyFlatten,
  enemyPortal,
];

export const ENEMY_GRAPH: AnimGraphDef = {
  id: 'enemy',
  initial: 'idle',
  states: [
    { id: 'idle', clip: 'idle' },
    { id: 'move', clip: 'move', speed: (ctx) => 0.6 + Math.min(1.6, ctx.runBlend * 1.4) },
    { id: 'climb', clip: 'climb' },
    { id: 'telegraph', clip: 'telegraph' },
    { id: 'stun', clip: 'stun' },
    { id: 'carried', clip: 'carried' },
    { id: 'flatten', clip: 'flatten' },
    { id: 'portal', clip: 'portal' },
  ],
  transitions: [
    { from: '*', to: 'flatten', duration: 0.04, priority: 100, when: (c) => c.flags.has('flatten') },
    { from: '*', to: 'carried', duration: 0.08, priority: 90, when: (c) => c.flags.has('carried') },
    { from: '*', to: 'stun', duration: 0.06, priority: 85, when: (c) => c.flags.has('stunned') },
    { from: '*', to: 'portal', duration: 0.05, priority: 80, when: (c) => c.triggers.has('portal') },
    {
      from: '*',
      to: 'telegraph',
      duration: 0.08,
      priority: 60,
      when: (c) => c.triggers.has('telegraph'),
    },
    { from: '*', to: 'climb', duration: 0.1, priority: 40, when: (c) => c.onLadder },
    { from: '*', to: 'move', duration: 0.1, priority: 20, when: (c) => c.runBlend > 0.05 },
    { from: '*', to: 'idle', duration: 0.12, priority: 10, when: (c) => c.runBlend <= 0.05 },
    { from: 'telegraph', to: 'move', duration: 0.1, exitTime: 1, when: (c) => c.runBlend > 0.05 },
    { from: 'telegraph', to: 'idle', duration: 0.1, exitTime: 1, when: () => true },
  ],
};

/** Builds the skin that points the shared parts at a species' art. */
export function enemySkin(species: EnemySpecies): DollSkin {
  return {
    id: `enemy.${species}`,
    textures: {
      'enemy.body': `enemy.${species}.body`,
      'enemy.arm': `enemy.${species}.arm`,
      'enemy.leg': `enemy.${species}.leg`,
      'enemy.foot': `enemy.${species}.foot`,
      'enemy.stunStar': 'enemy.stunStar',
    },
    accent: 'neutral',
  };
}

/** Collision box derived from the species' painted body size. */
export function enemyCollision(species: EnemySpecies): { width: number; height: number } {
  const size = enemyBodySize(species);
  return { width: size.w * 0.7, height: size.h * 0.85 };
}
