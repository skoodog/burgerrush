/**
 * 3D level model.
 *
 * The world is a stack of horizontal floors. Each floor carries walkable strips
 * laid out on an integer (x, z) grid, so a floor is a 2D maze you run around in
 * rather than a single line. Ladders join adjacent floors at a grid cell.
 * Ingredients rest on strips and, when trodden, fall straight down the y axis.
 *
 * Everything is plain data on an integer grid. That is deliberate: the whole
 * playability question reduces to graph reachability over cells, which means the
 * validator can prove a level solvable with no renderer, no physics and no
 * floating-point luck.
 *
 * A burger is a *column*: every ingredient belonging to it shares one (x, z)
 * footprint, and its plate sits at the bottom of that column. That is what makes
 * "will this piece ever reach the plate?" answerable - a piece only ever falls
 * straight down, so its destination is fixed at authoring time.
 */

import type { IngredientKind } from '../art/palette';

export type Axis = 'x' | 'z';

export interface Cell {
  readonly x: number;
  readonly z: number;
}

/** A run of walkable cells on one floor, along one axis. */
export interface Walk3D {
  readonly id: string;
  /** Floor index; 0 is the ground floor. */
  readonly floor: number;
  readonly axis: Axis;
  /** Origin cell. The strip extends `length` cells along `axis`. */
  readonly x: number;
  readonly z: number;
  readonly length: number;
}

/** Joins `lower` to `lower + 1` at a single cell present on both floors. */
export interface Ladder3D {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly lower: number;
}

export interface Ingredient3D {
  readonly id: string;
  readonly kind: IngredientKind;
  readonly burger: string;
  /** Stack order within the burger; 0 is the bottom bun. */
  readonly order: number;
  readonly floor: number;
  readonly axis: Axis;
  readonly x: number;
  readonly z: number;
  /** Tread segments, one per cell. */
  readonly segments: number;
}

export interface Plate3D {
  readonly id: string;
  readonly burger: string;
  readonly x: number;
  readonly z: number;
  readonly axis: Axis;
  readonly segments: number;
}

export interface Level3D {
  readonly id: string;
  readonly seed: number;
  readonly floorCount: number;
  /** World height of one floor, for the renderer. Simulation uses floor index. */
  readonly floorHeight: number;
  readonly cellSize: number;
  readonly walks: readonly Walk3D[];
  readonly ladders: readonly Ladder3D[];
  readonly ingredients: readonly Ingredient3D[];
  readonly plates: readonly Plate3D[];
  readonly spawn: Cell & { readonly floor: number };
}

/** Every cell a strip covers. */
export function walkCells(walk: Walk3D): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < walk.length; i += 1) {
    cells.push(
      walk.axis === 'x' ? { x: walk.x + i, z: walk.z } : { x: walk.x, z: walk.z + i },
    );
  }
  return cells;
}

/** Every cell an ingredient covers. One cell per tread segment. */
export function ingredientCells(ing: Ingredient3D): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < ing.segments; i += 1) {
    cells.push(ing.axis === 'x' ? { x: ing.x + i, z: ing.z } : { x: ing.x, z: ing.z + i });
  }
  return cells;
}

export function plateCells(plate: Plate3D): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < plate.segments; i += 1) {
    cells.push(
      plate.axis === 'x' ? { x: plate.x + i, z: plate.z } : { x: plate.x, z: plate.z + i },
    );
  }
  return cells;
}

export const cellKey = (floor: number, x: number, z: number): string => `${floor}:${x}:${z}`;

/** Ingredients of one burger, bottom bun first. */
export function burgerStack3D(level: Level3D, burger: string): Ingredient3D[] {
  return level.ingredients
    .filter((i) => i.burger === burger)
    .sort((a, b) => a.order - b.order);
}

export function burgerIds3D(level: Level3D): string[] {
  return [...new Set(level.ingredients.map((i) => i.burger))].sort();
}
