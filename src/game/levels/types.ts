/**
 * Level data model.
 *
 * Maps are plain data so the same definition feeds the runtime, the headless
 * validator, the deterministic bot and the ASCII debug diagram.
 */

import type { IngredientKind } from '../art/palette';
import type { EnemySpecies } from '../art/enemyArt';

export interface PlatformDef {
  readonly id: string;
  /** Walkable top surface. */
  readonly y: number;
  readonly x1: number;
  readonly x2: number;
}

export interface LadderDef {
  readonly id: string;
  readonly x: number;
  /** Upper end (smaller y) and lower end (larger y). */
  readonly yTop: number;
  readonly yBottom: number;
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
  readonly face: 0 | 1;
  readonly targetFace: 0 | 1;
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
