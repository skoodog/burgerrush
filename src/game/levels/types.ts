/**
 * Level data model.
 *
 * Maps are plain data so the same definition feeds the runtime, the headless
 * validator, the deterministic bot and the ASCII debug diagram.
 */

import type { IngredientKind } from '../art/palette';
import type { EnemySpecies } from '../art/enemyArt';

/**
 * Which side of a two-face map a piece of geometry belongs to.
 *
 * Every face-carrying field is optional and absent means face 0, so every
 * single-face map already authored stays valid and behaves identically.
 */
export type Face = 0 | 1;

/** Reads a face off any geometry, defaulting to the front. */
export function faceOf(def: { readonly face?: Face }): Face {
  return def.face ?? 0;
}

export interface PlatformDef {
  readonly id: string;
  /** Walkable top surface. */
  readonly y: number;
  readonly x1: number;
  readonly x2: number;
  readonly face?: Face;
}

export interface LadderDef {
  readonly id: string;
  readonly x: number;
  /** Upper end (smaller y) and lower end (larger y). */
  readonly yTop: number;
  readonly yBottom: number;
  readonly face?: Face;
}

export interface IngredientLayerDef {
  readonly id: string;
  readonly kind: IngredientKind;
  /** Left edge of the layer. */
  readonly x: number;
  /** Resting surface y before the layer is armed. */
  readonly y: number;
  /** 5-7 tread segments per the brief. */
  readonly segments: number;
  /** Burger column this layer belongs to. */
  readonly burger: string;
  /** Stack order within the burger; 0 is the bottom bun. */
  readonly order: number;
  readonly face?: Face;
  /**
   * Marks a layer that only exists on the back face and is not required to
   * finish the round. Scoring reads this to award the secret-burger bonus.
   */
  readonly secret?: boolean;
}

export interface PlateDef {
  readonly id: string;
  readonly burger: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

export interface SpawnDef {
  readonly x: number;
  readonly y: number;
  readonly face?: Face;
}

export interface EnemySpawnDef extends SpawnDef {
  readonly species: EnemySpecies;
  /** Seconds after the timer starts before this foe enters. */
  readonly delay: number;
}

export interface PortalDef {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly face: Face;
  readonly targetFace: Face;
  /**
   * Landing position on the target face.
   *
   * Omitted means the mirrored x at the same height, which is what physically
   * happens when the map turns over: you keep your place in the world while the
   * geometry rotates around it. Author these explicitly only when a map needs a
   * landing spot the mirror does not provide.
   */
  readonly targetX?: number;
  readonly targetY?: number;
}

/** Default mirror axis, matching the play field width. */
export const DEFAULT_LEVEL_WIDTH = 960;

/**
 * Resolves where a portal drops the player.
 *
 * Kept here rather than in the nav graph because the renderer, the validator
 * and the chef all need the identical answer; one source avoids the class of
 * bug where the visual flip and the simulation disagree about where you land.
 */
export function portalTarget(
  level: LevelDef,
  portal: PortalDef,
): { x: number; y: number; face: Face } {
  const width = level.width ?? DEFAULT_LEVEL_WIDTH;
  return {
    x: portal.targetX ?? width - portal.x,
    y: portal.targetY ?? portal.y,
    face: portal.targetFace,
  };
}

export type SecretClassification =
  | 'required-guided'
  | 'required-clued'
  | 'optional-bonus'
  | 'absent'
  | 'decoy-present';

export interface LevelDef {
  readonly id: string;
  readonly name: string;
  readonly world: string;
  readonly round: number;
  readonly faces: 1 | 2;
  /** Mirror axis for two-face maps. Defaults to `DEFAULT_LEVEL_WIDTH`. */
  readonly width?: number;
  readonly platforms: readonly PlatformDef[];
  readonly ladders: readonly LadderDef[];
  readonly layers: readonly IngredientLayerDef[];
  readonly plates: readonly PlateDef[];
  readonly playerSpawns: readonly SpawnDef[];
  readonly enemySpawns: readonly EnemySpawnDef[];
  readonly portals: readonly PortalDef[];
  readonly secret: SecretClassification;
  readonly checkpoints: readonly SpawnDef[];
  /** Target optimal completion window in seconds, used by the validator. */
  readonly targetTime: readonly [number, number];
  readonly hints?: readonly { readonly x: number; readonly y: number; readonly text: string }[];
}

export function burgerLayerIds(level: LevelDef, burger: string): string[] {
  return level.layers
    .filter((l) => l.burger === burger)
    .sort((a, b) => a.order - b.order)
    .map((l) => l.id);
}

export function burgerIds(level: LevelDef): string[] {
  return [...new Set(level.layers.map((l) => l.burger))];
}
