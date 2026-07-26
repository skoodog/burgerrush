/**
 * Chef doll definition - one skeleton, one part layout, four skins.
 *
 * Sal Boy, Sal Girl, Pep Boy and Pep Girl share this rig exactly. Identity and
 * gender presentation resolve to different *textures* through `DollSkin`; the
 * player-slot accent resolves to a different tint of the same aligned art. That
 * is the contract in docs/LOCAL_COOP_CHARACTER_SELECT.md section 7: never
 * duplicate physics or animation state machines for the eight visual
 * combinations.
 *
 * Doll units: 1 unit = 1 px at scale 1. The chef stands 64 units tall from the
 * ground line (y = 0) to the top of the toque, which keeps the gameplay master
 * inside the 72-120 px band the art bible asks for once world scale is applied.
 */

import { DEG } from '../core/math';
import type { BoneDef, ClothChainDef, DollDef, PartDef, SkeletonDef } from '../anim/types';

/** Named draw layers so part ordering stays readable and collision-free. */
export const CHEF_Z = {
  farArm: 10,
  farLeg: 20,
  hairBack: 30,
  apron: 40,
  torso: 50,
  scarf: 60,
  nearLeg: 70,
  nearArm: 80,
  head: 90,
  face: 100,
  hairFront: 110,
  toque: 120,
  emblem: 130,
  prop: 140,
} as const;

/**
 * Bone layout, side-on three-quarter. `hips` is the root and sits at the doll's
 * ground contact point, so world y maps straight onto the feet.
 */
const BONES: readonly BoneDef[] = [
  { name: 'hips', parent: null, x: 0, y: -20, rotation: 0, length: 10 },
  { name: 'torso', parent: 'hips', x: 0, y: -1, rotation: 0, length: 16 },
  { name: 'chest', parent: 'torso', x: 0, y: -14, rotation: 0, length: 8 },
  { name: 'neck', parent: 'chest', x: 0.5, y: -6, rotation: 0, length: 4 },
  { name: 'head', parent: 'neck', x: 0, y: -4, rotation: 0, length: 12 },
  // `toque` is the rigid hat band that sits on the hairline; `toqueTip` is the
  // soft crown above it, driven by a cloth spring so the hat trails on turns.
  { name: 'toque', parent: 'head', x: -0.5, y: -13, rotation: 0, length: 6 },
  { name: 'toqueTip', parent: 'toque', x: 0, y: -1.5, rotation: 0, length: 10 },
  { name: 'hairTail', parent: 'head', x: -4, y: -6, rotation: 0, length: 10 },

  { name: 'scarf', parent: 'chest', x: 1, y: -1, rotation: 0, length: 6 },
  { name: 'scarfTail', parent: 'scarf', x: -1, y: 2, rotation: 0, length: 8 },
  { name: 'apron', parent: 'hips', x: 0, y: -2, rotation: 0, length: 12 },
  { name: 'apronTie', parent: 'hips', x: -4, y: -3, rotation: 0, length: 8 },

  { name: 'armFarUpper', parent: 'chest', x: -2, y: -2, rotation: 100 * DEG, length: 9 },
  { name: 'armFarLower', parent: 'armFarUpper', x: 9, y: 0, rotation: 0, length: 8 },
  { name: 'handFar', parent: 'armFarLower', x: 8, y: 0, rotation: 0, length: 4 },

  { name: 'armNearUpper', parent: 'chest', x: 2, y: -2, rotation: 80 * DEG, length: 9 },
  { name: 'armNearLower', parent: 'armNearUpper', x: 9, y: 0, rotation: 0, length: 8 },
  { name: 'handNear', parent: 'armNearLower', x: 8, y: 0, rotation: 0, length: 4 },

  { name: 'legFarUpper', parent: 'hips', x: -2.5, y: 1, rotation: 90 * DEG, length: 10 },
  { name: 'legFarLower', parent: 'legFarUpper', x: 10, y: 0, rotation: 0, length: 9 },
  { name: 'footFar', parent: 'legFarLower', x: 9, y: 0, rotation: -90 * DEG, length: 6 },

  { name: 'legNearUpper', parent: 'hips', x: 2.5, y: 1, rotation: 90 * DEG, length: 10 },
  { name: 'legNearLower', parent: 'legNearUpper', x: 10, y: 0, rotation: 0, length: 9 },
  { name: 'footNear', parent: 'legNearLower', x: 9, y: 0, rotation: -90 * DEG, length: 6 },
];

export const CHEF_SKELETON: SkeletonDef = {
  id: 'chef',
  bones: BONES,
  sockets: ['handNear', 'handFar', 'head', 'toqueTip', 'hips', 'chest', 'footNear', 'footFar'],
};

/**
 * Parts. `texture` values that appear in a skin's texture map are variant
 * points (hair, face, emblem); the rest are shared across all four chefs.
 *
 * `accent: true` marks the exact regions the art bible lists as the accent
 * mask - uniform stripes, toque letter, scarf, shoe trim.
 */
const PARTS: readonly PartDef[] = [
  // ---- far side -----------------------------------------------------------
  {
    id: 'armFarUpper',
    bone: 'armFarUpper',
    texture: 'chef.armUpper.far',
    z: CHEF_Z.farArm,
    x: 4.5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'armFarLower',
    bone: 'armFarLower',
    texture: 'chef.armLower.far',
    z: CHEF_Z.farArm + 1,
    x: 4,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    id: 'handFar',
    bone: 'handFar',
    texture: 'chef.hand.far',
    z: CHEF_Z.farArm + 2,
    x: 1.5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    id: 'propFar',
    bone: 'handFar',
    texture: 'slot.propFar',
    z: CHEF_Z.farArm + 3,
    x: 3,
    y: 0,
    rotation: 0,
    originX: 0.2,
    originY: 0.5,
    hiddenByDefault: true,
  },
  {
    id: 'legFarUpper',
    bone: 'legFarUpper',
    texture: 'chef.legUpper.far',
    z: CHEF_Z.farLeg,
    x: 5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'legFarLower',
    bone: 'legFarLower',
    texture: 'chef.legLower.far',
    z: CHEF_Z.farLeg + 1,
    x: 4.5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'footFar',
    bone: 'footFar',
    texture: 'chef.shoe.far',
    z: CHEF_Z.farLeg + 2,
    x: 1,
    y: -2,
    rotation: 0,
    originX: 0.42,
    originY: 0.5,
    accent: true,
  },

  // ---- back hair ----------------------------------------------------------
  {
    id: 'hairBack',
    bone: 'hairTail',
    texture: 'chef.hairBack',
    z: CHEF_Z.hairBack,
    x: 0,
    y: -10,
    rotation: 0,
    originX: 0.55,
    originY: 0.12,
  },

  // ---- body ---------------------------------------------------------------
  {
    id: 'apron',
    bone: 'apron',
    texture: 'chef.apron',
    z: CHEF_Z.apron,
    x: 0,
    y: 5,
    rotation: 0,
    originX: 0.5,
    originY: 0.2,
  },
  {
    id: 'apronTie',
    bone: 'apronTie',
    texture: 'chef.apronTie',
    z: CHEF_Z.apron + 1,
    x: -1,
    y: 4,
    rotation: 0,
    originX: 0.7,
    originY: 0.1,
    accent: true,
  },
  {
    id: 'torso',
    bone: 'torso',
    texture: 'chef.torso',
    z: CHEF_Z.torso,
    x: 0,
    y: -7,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'scarf',
    bone: 'scarf',
    texture: 'chef.scarf',
    z: CHEF_Z.scarf,
    x: 0,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.25,
    accent: true,
  },
  {
    id: 'scarfTail',
    bone: 'scarfTail',
    texture: 'chef.scarfTail',
    z: CHEF_Z.scarf - 1,
    x: 0,
    y: 3,
    rotation: 0,
    originX: 0.7,
    originY: 0.1,
    accent: true,
  },

  // ---- near side ----------------------------------------------------------
  {
    id: 'legNearUpper',
    bone: 'legNearUpper',
    texture: 'chef.legUpper.near',
    z: CHEF_Z.nearLeg,
    x: 5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'legNearLower',
    bone: 'legNearLower',
    texture: 'chef.legLower.near',
    z: CHEF_Z.nearLeg + 1,
    x: 4.5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'footNear',
    bone: 'footNear',
    texture: 'chef.shoe.near',
    z: CHEF_Z.nearLeg + 2,
    x: 1,
    y: -2,
    rotation: 0,
    originX: 0.42,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'armNearUpper',
    bone: 'armNearUpper',
    texture: 'chef.armUpper.near',
    z: CHEF_Z.nearArm,
    x: 4.5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'armNearLower',
    bone: 'armNearLower',
    texture: 'chef.armLower.near',
    z: CHEF_Z.nearArm + 1,
    x: 4,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    id: 'handNear',
    bone: 'handNear',
    texture: 'chef.hand.near',
    z: CHEF_Z.nearArm + 2,
    x: 1.5,
    y: 0,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    id: 'propNear',
    bone: 'handNear',
    texture: 'slot.propNear',
    z: CHEF_Z.nearArm + 3,
    x: 3,
    y: 0,
    rotation: 0,
    originX: 0.2,
    originY: 0.5,
    hiddenByDefault: true,
  },

  // ---- head ---------------------------------------------------------------
  {
    id: 'head',
    bone: 'head',
    texture: 'chef.head',
    z: CHEF_Z.head,
    x: 0,
    y: -6,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    id: 'face',
    bone: 'head',
    texture: 'slot.face',
    z: CHEF_Z.face,
    x: 1.5,
    y: -5,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    id: 'hairFront',
    bone: 'head',
    texture: 'chef.hairFront',
    z: CHEF_Z.hairFront,
    x: 0,
    y: -12,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
  },
  {
    // Crown pivots at its own base so the cloth spring rocks it, not the band.
    id: 'toque',
    bone: 'toqueTip',
    texture: 'chef.toque',
    z: CHEF_Z.toque,
    x: 0,
    y: 1.5,
    rotation: 0,
    originX: 0.5,
    originY: 0.95,
  },
  {
    id: 'toqueBand',
    bone: 'toque',
    texture: 'chef.toqueBand',
    z: CHEF_Z.toque + 1,
    x: 0,
    y: -4,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
  },
  {
    id: 'emblem',
    bone: 'toqueTip',
    texture: 'chef.emblem',
    z: CHEF_Z.emblem,
    x: 2.5,
    y: -13,
    rotation: 0,
    originX: 0.5,
    originY: 0.5,
    accent: true,
    counterFlip: true,
  },
];

/**
 * Secondary motion. The brief asks for toques, scarves and apron ties that
 * "trail in the acceleration" - these springs deliver that without any
 * per-clip authoring, and they run on the fixed step so they stay replay-safe.
 */
const CLOTH: readonly ClothChainDef[] = [
  {
    bone: 'toqueTip',
    stiffness: 150,
    damping: 15,
    gravity: -2 * DEG,
    drag: -0.055,
    lift: 0.03,
    maxAngle: 34 * DEG,
  },
  {
    bone: 'scarfTail',
    stiffness: 105,
    damping: 11,
    gravity: 6 * DEG,
    drag: -0.085,
    lift: 0.05,
    maxAngle: 62 * DEG,
  },
  {
    bone: 'apronTie',
    stiffness: 120,
    damping: 12,
    gravity: 4 * DEG,
    drag: -0.07,
    lift: 0.045,
    maxAngle: 55 * DEG,
  },
  {
    bone: 'hairTail',
    stiffness: 135,
    damping: 13,
    gravity: 3 * DEG,
    drag: -0.06,
    lift: 0.04,
    maxAngle: 48 * DEG,
  },
];

export const CHEF_DOLL: DollDef = {
  id: 'chef',
  skeleton: CHEF_SKELETON,
  parts: PARTS,
  cloth: CLOTH,
  bounds: { x: -18, y: -66, w: 36, h: 68 },
};

/** Collision box shared by every identity/presentation/accent combination. */
export const CHEF_COLLISION = Object.freeze({
  width: 18,
  height: 40,
  /** Offset from the doll origin (feet) to the box centre. */
  offsetY: -20,
});
