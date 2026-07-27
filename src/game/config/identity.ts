/**
 * Chef identity model.
 *
 * Four concerns, deliberately never fused into one enum:
 *
 *   identity     - Sal (`S`) or Pep (`P`); a personality, not a gender
 *   presentation - Boy or Girl; equal variants, identical gameplay
 *   slot         - Player 1 or Player 2; carries number + marker shape
 *   accent       - derived from identity only: Sal red, Pep blue.
 *
 * Sal and Pep share body art within a presentation - Pep Girl is literally the
 * same artwork as Sal Girl - so the emblem letter and the uniform colour are
 * what tell them apart.
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
  /** Derived from `identity`; stored for convenience but never written directly. */
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

/**
 * Uniform colour follows the **chef identity**: Sal is red, Pep is blue.
 *
 * This is the one and only place that mapping is decided. Because an identity
 * can be held by only one local player at a time, the two on-screen chefs are
 * always a red one and a blue one, so co-op still reads at a glance - the
 * difference is that the colour now tells you *who the character is*, and the
 * slot number plus marker shape tell you *which player controls them*.
 */
export function accentForIdentity(identity: ChefIdentity): PlayerAccent {
  return identity === 'sal' ? 'red' : 'blue';
}

/** Non-colour player marker. Slot identity is carried by number and shape. */
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
    identity: overrides.identity ?? (slot === 1 ? 'sal' : 'pep'),
    presentation: overrides.presentation ?? (slot === 1 ? 'boy' : 'girl'),
    accent: accentForIdentity(overrides.identity ?? (slot === 1 ? 'sal' : 'pep')),
    inputDeviceId: overrides.inputDeviceId ?? null,
    ready: overrides.ready ?? false,
  };
}

/**
 * Swaps the identities held by two selections.
 *
 * Presentation and device assignment are explicitly preserved. The uniform
 * colour follows the identity across the swap, while the slot number and marker
 * shape stay with the player - so who-controls-whom is never ambiguous.
 */
export function swapIdentities(a: PlayerSelection, b: PlayerSelection): void {
  const held = a.identity;
  a.identity = b.identity;
  b.identity = held;
  // Colour travels with the identity, so a swap swaps the colours too.
  a.accent = accentForIdentity(a.identity);
  b.accent = accentForIdentity(b.identity);
}

/**
 * Texture-key namespace for body art.
 *
 * Keyed on presentation alone, because Sal and Pep share their head, hair and
 * face artwork - the letter and the uniform colour carry identity.
 */
export function variantKey(presentation: GenderPresentation): string {
  return presentation;
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
 * Two axes, not four:
 *
 * - **presentation** (boy/girl) selects the *body art* - head, hair and face.
 *   Sal and Pep share it exactly: Pep Girl is literally the same artwork as Sal
 *   Girl. That halves the art matrix and keeps the siblings on-model.
 * - **identity** (sal/pep) selects the emblem letter and, through
 *   `accentForIdentity`, the uniform colour: Sal red, Pep blue.
 *
 * The skeleton, clip library, state machine and collision bounds are shared by
 * construction, so every combination plays identically.
 */
export function chefSkin(
  identity: ChefIdentity,
  presentation: GenderPresentation,
  accentOverride?: PlayerAccent | 'neutral',
): DollSkin {
  const v = presentation;
  const a = accentOverride ?? accentForIdentity(identity);
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
    'chef.hairBack': `chef.hairBack.${presentation}`,
    'chef.hairFront': `chef.hairFront.${presentation}`,
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
