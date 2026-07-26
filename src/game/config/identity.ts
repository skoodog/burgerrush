/**
 * Chef identity model.
 *
 * Four independent concerns, deliberately never fused into one enum
 * (docs/LOCAL_COOP_CHARACTER_SELECT.md section 2):
 *
 *   identity     - Sal (`S`) or Pep (`P`); a personality, not a gender
 *   presentation - Boy or Girl; equal variants, identical gameplay
 *   slot         - Player 1 or Player 2
 *   accent       - derived from slot only: P1 red, P2 blue. Never selectable.
 */

import type { DollSkin } from '../anim/dollRig';

export type ChefIdentity = 'sal' | 'pep';
export type GenderPresentation = 'boy' | 'girl';
export type PlayerSlot = 1 | 2;
export type PlayerAccent = 'red' | 'blue';
/** Non-colour marker so P1/P2 stay distinguishable in monochrome. */
export type SlotMarker = 'diamond' | 'circle';

export const CHEF_IDENTITIES: readonly ChefIdentity[] = ['sal', 'pep'];
export const PRESENTATIONS: readonly GenderPresentation[] = ['boy', 'girl'];

export interface PlayerSelection {
  slot: PlayerSlot;
  identity: ChefIdentity;
  presentation: GenderPresentation;
  /** Derived from `slot`; stored for convenience but never written directly. */
  accent: PlayerAccent;
  inputDeviceId: string | null;
  ready: boolean;
}

export const IDENTITY_META: Readonly<
  Record<ChefIdentity, { readonly name: string; readonly letter: 'S' | 'P'; readonly blurb: string }>
> = Object.freeze({
  sal: {
    name: 'Chef Sal',
    letter: 'S',
    blurb: 'Observant, clever, precise. Reads the whole kitchen before moving.',
  },
  pep: {
    name: 'Chef Pep',
    letter: 'P',
    blurb: 'Upbeat, brave, impulsive. Commits first and grins about it.',
  },
});

export const PRESENTATION_META: Readonly<
  Record<GenderPresentation, { readonly label: string; readonly icon: string }>
> = Object.freeze({
  // Neutral text + neutral glyphs: never pink/blue stereotype coding.
  boy: { label: 'BOY', icon: '△' },
  girl: { label: 'GIRL', icon: '○' },
});

/** The one and only place slot colour is decided. */
export function accentForSlot(slot: PlayerSlot): PlayerAccent {
  return slot === 1 ? 'red' : 'blue';
}

export function markerForSlot(slot: PlayerSlot): SlotMarker {
  return slot === 1 ? 'diamond' : 'circle';
}

/** Warm arcade red / saturated cobalt blue, per the art bible. */
export const ACCENT_COLORS: Readonly<Record<PlayerAccent | 'neutral', number>> = Object.freeze({
  red: 0xe0392b,
  blue: 0x2f6fe0,
  neutral: 0x9aa3b5,
});

export const ACCENT_SHADOW_COLORS: Readonly<Record<PlayerAccent | 'neutral', number>> =
  Object.freeze({
    red: 0x8e1d17,
    blue: 0x1a3f8c,
    neutral: 0x596074,
  });

export function createSelection(slot: PlayerSlot, overrides: Partial<PlayerSelection> = {}): PlayerSelection {
  return {
    slot,
    identity: overrides.identity ?? (slot === 1 ? 'pep' : 'sal'),
    presentation: overrides.presentation ?? (slot === 1 ? 'boy' : 'girl'),
    accent: accentForSlot(slot),
    inputDeviceId: overrides.inputDeviceId ?? null,
    ready: overrides.ready ?? false,
  };
}

/**
 * Swaps the identities held by two selections.
 *
 * Presentation, device assignment and slot colour are explicitly preserved -
 * acceptance test 6 in the co-op spec.
 */
export function swapIdentities(a: PlayerSelection, b: PlayerSelection): void {
  const held = a.identity;
  a.identity = b.identity;
  b.identity = held;
  a.accent = accentForSlot(a.slot);
  b.accent = accentForSlot(b.slot);
}

/** Texture-key namespace for a variant's art. Keep in sync with the atlas builder. */
export function variantKey(identity: ChefIdentity, presentation: GenderPresentation): string {
  return `${identity}.${presentation}`;
}

export type FaceExpression =
  | 'neutral'
  | 'determined'
  | 'happy'
  | 'surprised'
  | 'hurt'
  | 'lookUp';

export const FACE_EXPRESSIONS: readonly FaceExpression[] = [
  'neutral',
  'determined',
  'happy',
  'surprised',
  'hurt',
  'lookUp',
];

/**
 * Builds the doll skin for a runtime chef.
 *
 * Only textures change across the eight visual combinations. The skeleton, clip
 * library, state machine and collision bounds are shared by construction.
 */
export function chefSkin(
  identity: ChefIdentity,
  presentation: GenderPresentation,
  accent: PlayerAccent | 'neutral',
): DollSkin {
  const v = variantKey(identity, presentation);
  const a = accent;
  const textures: Record<string, string> = {
    // Shared body art, tinted per accent at bake time.
    'chef.torso': `chef.torso.${a}`,
    'chef.apron': 'chef.apron',
    'chef.neck': 'chef.neck',
    'chef.apronTie': `chef.apronTie.${a}`,
    'chef.scarf': `chef.scarf.${a}`,
    'chef.scarfTail': `chef.scarfTail.${a}`,
    'chef.armUpper.near': `chef.armUpper.${a}`,
    'chef.armUpper.far': `chef.armUpperFar.${a}`,
    'chef.armLower.near': 'chef.armLower',
    'chef.armLower.far': 'chef.armLowerFar',
    'chef.hand.near': 'chef.hand',
    'chef.hand.far': 'chef.handFar',
    'chef.legUpper.near': `chef.legUpper.${a}`,
    'chef.legUpper.far': `chef.legUpperFar.${a}`,
    'chef.legLower.near': `chef.legLower.${a}`,
    'chef.legLower.far': `chef.legLowerFar.${a}`,
    'chef.shoe.near': `chef.shoe.${a}`,
    'chef.shoe.far': `chef.shoeFar.${a}`,
    'chef.toque': 'chef.toque',
    'chef.toqueBand': `chef.toqueBand.${a}`,
    'chef.emblem': `chef.emblem.${identity}.${a}`,
    'chef.head': `chef.head.${presentation}`,
    'chef.hairBack': `chef.hairBack.${v}`,
    'chef.hairFront': `chef.hairFront.${v}`,
  };

  // Face slot entries: the animator swaps `face.<expression>` and the skin maps
  // it onto the variant's own face art.
  for (const expression of FACE_EXPRESSIONS) {
    textures[`face.${expression}`] = `chef.face.${v}.${expression}`;
  }
  textures['prop.spatula'] = 'prop.spatula';
  textures['prop.whisk'] = 'prop.whisk';

  return {
    id: `${v}.${a}`,
    textures,
    slots: { 'slot.face': 'face.neutral' },
    accent: a,
  };
}
