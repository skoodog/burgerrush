/**
 * Playability proof for 3D levels.
 *
 * A level is playable when every ingredient can be made to reach its plate. An
 * ingredient earns that in one of two ways:
 *
 *  - **direct**  - the player can reach and tread every one of its segments;
 *  - **cascade** - some ingredient higher in the same burger column is itself
 *    solvable, so dropping that one lands on this one and carries it down.
 *
 * The cascade rule is what lets a generator place a piece the player cannot
 * stand on and still guarantee it comes down: you take it out by running over
 * the one above it. It also yields a hard invariant worth stating plainly - the
 * *topmost* ingredient of every burger has nothing above it, so it must always
 * be directly reachable. If it is not, the whole column is stranded.
 *
 * This is a deliberately *sufficient* condition, not a necessary one. It proves
 * solvability using only the starting layout, ignoring the extra footholds that
 * appear as ingredients come to rest. A level this validator passes is
 * definitely playable; a level it rejects might still be, and is rejected
 * anyway. For a guarantee, false caution is the correct direction to err in.
 */

import {
  burgerIds3D,
  burgerStack3D,
  cellKey,
  ingredientCells,
  plateCells,
  walkCells,
  type Cell,
  type Ingredient3D,
  type Level3D,
} from '../levels/level3d';

export type Justification = 'direct' | 'cascade';

export interface IngredientVerdict {
  readonly id: string;
  readonly burger: string;
  readonly solvable: boolean;
  readonly why: Justification | 'stranded';
}

export interface Solvability {
  readonly ok: boolean;
  readonly failures: readonly string[];
  readonly verdicts: readonly IngredientVerdict[];
  /** Cells the player can stand on, as `floor:x:z`. */
  readonly reachable: ReadonlySet<string>;
}

/** Walkable cells per floor, as a key set. */
function walkableCells(level: Level3D): Set<string> {
  const set = new Set<string>();
  for (const walk of level.walks) {
    for (const cell of walkCells(walk)) set.add(cellKey(walk.floor, cell.x, cell.z));
  }
  return set;
}

/**
 * Flood fill from the spawn across same-floor neighbours and usable ladders.
 *
 * A ladder is only usable when both of its ends are walkable cells; a ladder
 * hanging off the edge of a strip is scenery, not a route.
 */
function floodReachable(level: Level3D, walkable: ReadonlySet<string>): Set<string> {
  const start = cellKey(level.spawn.floor, level.spawn.x, level.spawn.z);
  const seen = new Set<string>();
  if (!walkable.has(start)) return seen;

  // Ladders indexed by each end so lookup during the flood is O(1).
  const ladderUp = new Map<string, string>();
  const ladderDown = new Map<string, string>();
  for (const l of level.ladders) {
    const low = cellKey(l.lower, l.x, l.z);
    const high = cellKey(l.lower + 1, l.x, l.z);
    if (!walkable.has(low) || !walkable.has(high)) continue;
    ladderUp.set(low, high);
    ladderDown.set(high, low);
  }

  seen.add(start);
  const queue: string[] = [start];
  while (queue.length > 0) {
    const key = queue.pop() as string;
    const [f, x, z] = key.split(':').map(Number) as [number, number, number];

    const push = (next: string): void => {
      if (walkable.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    };

    push(cellKey(f, x + 1, z));
    push(cellKey(f, x - 1, z));
    push(cellKey(f, x, z + 1));
    push(cellKey(f, x, z - 1));

    const up = ladderUp.get(key);
    if (up !== undefined) push(up);
    const down = ladderDown.get(key);
    if (down !== undefined) push(down);
  }
  return seen;
}

const sameFootprint = (a: readonly Cell[], b: readonly Cell[]): boolean =>
  a.length === b.length &&
  a.every((cell, i) => cell.x === (b[i] as Cell).x && cell.z === (b[i] as Cell).z);

export function validateLevel3D(level: Level3D): Solvability {
  const failures: string[] = [];
  const walkable = walkableCells(level);
  const reachable = floodReachable(level, walkable);

  if (!walkable.has(cellKey(level.spawn.floor, level.spawn.x, level.spawn.z))) {
    failures.push('spawn is not on a walkable cell');
  }

  // --- structural checks --------------------------------------------------
  const occupied = new Map<string, string>();
  for (const ing of level.ingredients) {
    for (const cell of ingredientCells(ing)) {
      const key = cellKey(ing.floor, cell.x, cell.z);
      const other = occupied.get(key);
      if (other !== undefined) {
        failures.push(`${ing.id} overlaps ${other} at ${key}`);
      }
      occupied.set(key, ing.id);
      if (!walkable.has(key)) {
        failures.push(`${ing.id} rests on nothing at ${key}`);
      }
    }
  }

  // --- per-burger checks --------------------------------------------------
  const verdicts: IngredientVerdict[] = [];

  for (const burger of burgerIds3D(level)) {
    const stack = burgerStack3D(level, burger);
    const plate = level.plates.find((p) => p.burger === burger);

    if (!plate) {
      failures.push(`burger ${burger} has no plate`);
      for (const ing of stack) {
        verdicts.push({ id: ing.id, burger, solvable: false, why: 'stranded' });
      }
      continue;
    }

    // Every piece must fall down the same column, or it will never meet the
    // plate: pieces only ever move straight down.
    const footprint = plateCells(plate);
    for (const ing of stack) {
      if (!sameFootprint(ingredientCells(ing), footprint)) {
        failures.push(`${ing.id} footprint does not sit above plate ${plate.id}`);
      }
    }

    // Highest floor first: an ingredient may lean on anything above it.
    const highestFirst = [...stack].sort((a, b) => b.floor - a.floor);
    let anySolvableAbove = false;

    for (const ing of highestFirst) {
      const direct = ingredientCells(ing).every((c) =>
        reachable.has(cellKey(ing.floor, c.x, c.z)),
      );
      const solvable = direct || anySolvableAbove;
      const why: IngredientVerdict['why'] = direct
        ? 'direct'
        : anySolvableAbove
          ? 'cascade'
          : 'stranded';

      if (!solvable) {
        failures.push(
          `${ing.id} is stranded: not walkable and nothing solvable sits above it`,
        );
      }
      if (solvable) anySolvableAbove = true;
      verdicts.push({ id: ing.id, burger, solvable, why });
    }

    if (stack.length > 0) {
      const top = highestFirst[0] as Ingredient3D;
      const topDirect = ingredientCells(top).every((c) =>
        reachable.has(cellKey(top.floor, c.x, c.z)),
      );
      if (!topDirect) {
        failures.push(`${top.id} is the top of ${burger} and must be directly walkable`);
      }
    }
  }

  return { ok: failures.length === 0, failures, verdicts, reachable };
}
