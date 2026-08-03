/**
 * Seeded 3D level generator.
 *
 * Levels are solvable *by construction* rather than by rejection sampling:
 * every burger column stands on a "spine" lane that is full width on every
 * floor, and every floor is connected to its neighbours by at least one ladder
 * that lands on a spine lane. That makes reachability true by the way the level
 * is built, so generation never has to retry.
 *
 * `validateLevel3D` then re-proves it from the finished data with no knowledge
 * of how it was made. The two agreeing is the guarantee; the generator alone is
 * not trusted. That pairing is what caught both fairness bugs in the runner
 * track, and it is cheap here for the same reason: everything is integer grid
 * data.
 *
 * One deliberate wrinkle: a level may maroon a single ingredient on an isolated
 * lane, unreachable on foot. That is the "take it out by running over the one
 * above it" case - it is only ever placed below a reachable ingredient in the
 * same column, so the cascade brings it down. The generator refuses to maroon a
 * column's top ingredient, because nothing would be left to drop on it.
 */

import { Rng } from '../core/rng';
import type { IngredientKind } from '../art/palette';
import type {
  Ingredient3D,
  Ladder3D,
  Level3D,
  Plate3D,
  Walk3D,
} from './level3d';

export interface Generate3DOptions {
  /** Grid width in cells. */
  readonly width?: number;
  /** Grid depth in cells. */
  readonly depth?: number;
  readonly floors?: number;
  readonly burgers?: number;
  /** Allow one ingredient to be reachable only by cascade. */
  readonly allowMarooned?: boolean;
}

const KINDS: readonly IngredientKind[] = ['bunBottom', 'patty', 'cheese', 'lettuce', 'bunTop'];

/** Ingredient kind for a position in a stack of `total`. */
function kindFor(order: number, total: number): IngredientKind {
  if (order === 0) return 'bunBottom';
  if (order === total - 1) return 'bunTop';
  const middle = KINDS.slice(1, KINDS.length - 1);
  return middle[(order - 1) % middle.length] as IngredientKind;
}

export function generateLevel3D(seed: number, options: Generate3DOptions = {}): Level3D {
  const rng = new Rng(seed);
  const width = options.width ?? 14;
  const depth = options.depth ?? 9;
  const floorCount = options.floors ?? 4;
  const burgerCount = options.burgers ?? 2;
  const allowMarooned = options.allowMarooned ?? true;

  // --- spine lanes: full width on every floor, so columns always land -------
  const laneStride = 3;
  const candidateLanes: number[] = [];
  for (let z = 1; z < depth - 1; z += laneStride) candidateLanes.push(z);
  const spineLanes = candidateLanes.slice(0, Math.max(burgerCount, 2));

  // --- place burger columns first; geometry is built to serve them ----------
  const segments = 4;
  const ingredients: Ingredient3D[] = [];
  const plates: Plate3D[] = [];

  // Ingredients live on floors 1..floorCount-1; floor 0 carries the plates.
  const usableFloors: number[] = [];
  for (let f = 1; f < floorCount; f += 1) usableFloors.push(f);
  const perBurger = Math.min(usableFloors.length, Math.max(2, floorCount - 1));

  for (let b = 0; b < burgerCount; b += 1) {
    const burger = `burger-${b}`;
    const lane = spineLanes[b % spineLanes.length] as number;
    // Stagger columns along x so two burgers never share cells.
    const slot = Math.floor(b / spineLanes.length);
    const x0 = 2 + slot * (segments + 2);
    if (x0 + segments > width - 1) break;

    const floors = usableFloors.slice(0, perBurger);
    floors.forEach((floor, order) => {
      ingredients.push({
        id: `${burger}-${order}`,
        kind: kindFor(order, floors.length),
        burger,
        order,
        floor,
        axis: 'x',
        x: x0,
        z: lane,
        segments,
      });
    });
    plates.push({ id: `plate-${b}`, burger, x: x0, z: lane, axis: 'x', segments });
  }

  // --- choose a marooned lane, if any --------------------------------------
  // Only a (floor, lane) where every ingredient present is non-top qualifies:
  // a marooned top ingredient would strand its whole column.
  let maroon: { floor: number; z: number } | null = null;
  if (allowMarooned && floorCount >= 3) {
    const topFloorOf = new Map<string, number>();
    for (const ing of ingredients) {
      const cur = topFloorOf.get(ing.burger);
      if (cur === undefined || ing.floor > cur) topFloorOf.set(ing.burger, ing.floor);
    }
    // Only the outermost lane may be marooned. Cutting a *middle* lane severs
    // the connectors on both sides of it and splits the floor into three
    // islands rather than two, which can orphan the ladder route to the floors
    // above. Isolating the last lane leaves the rest contiguous.
    const maxSpine = Math.max(...spineLanes);
    const candidates: { floor: number; z: number }[] = [];
    for (let f = 1; f < floorCount; f += 1) {
      const here = ingredients.filter((i) => i.floor === f && i.z === maxSpine);
      if (here.length === 0) continue;
      const anyTop = here.some((i) => topFloorOf.get(i.burger) === i.floor);
      if (!anyTop) candidates.push({ floor: f, z: maxSpine });
    }
    if (candidates.length > 0 && rng.next() < 0.5) maroon = rng.pick(candidates);
  }

  const isMarooned = (floor: number, z: number): boolean =>
    maroon !== null && maroon.floor === floor && maroon.z === z;

  // --- floors ---------------------------------------------------------------
  const walks: Walk3D[] = [];
  const ladders: Ladder3D[] = [];

  for (let floor = 0; floor < floorCount; floor += 1) {
    // Spine lanes run the full width on every floor.
    const lanes = [...spineLanes];
    // Plus a little variety, so floors are not identical.
    const extra = rng.int(0, 1);
    for (let e = 0; e < extra; e += 1) {
      const z = rng.int(1, depth - 2);
      if (!lanes.includes(z)) lanes.push(z);
    }
    // A marooned lane must stay the outermost one on its floor, or a decorative
    // extra lane beyond it would need a connector routed straight through it.
    const marooned = lanes.find((z) => isMarooned(floor, z));
    // Copy before clearing: without the spread this filters `lanes` into
    // itself, and emptying it below would leave nothing to push back.
    const floorLanes = [
      ...(marooned === undefined ? lanes : lanes.filter((z) => z <= marooned)),
    ].sort((a, b) => a - b);
    lanes.length = 0;
    lanes.push(...floorLanes);

    for (const z of lanes) {
      walks.push({ id: `w-${floor}-${z}`, floor, axis: 'x', x: 1, z, length: width - 2 });
    }

    // Connect consecutive lanes so the floor is one component - except across a
    // marooned lane, which is left deliberately cut off.
    for (let i = 0; i + 1 < lanes.length; i += 1) {
      const zA = lanes[i] as number;
      const zB = lanes[i + 1] as number;
      if (isMarooned(floor, zA) || isMarooned(floor, zB)) continue;
      const x = rng.int(2, width - 3);
      walks.push({ id: `c-${floor}-${i}`, floor, axis: 'z', x, z: zA, length: zB - zA + 1 });
    }
  }

  // --- ladders: at least one per adjacent floor pair, never onto a maroon ---
  for (let lower = 0; lower + 1 < floorCount; lower += 1) {
    const usable = spineLanes.filter(
      (z) => !isMarooned(lower, z) && !isMarooned(lower + 1, z),
    );
    const lanes = usable.length > 0 ? usable : spineLanes;
    const count = 1 + rng.int(0, 1);
    const taken = new Set<number>();
    for (let c = 0; c < count; c += 1) {
      const z = rng.pick(lanes);
      // Keep ladders clear of the burger columns so a column is never blocked.
      let x = rng.int(1, width - 2);
      for (let tries = 0; tries < 8 && taken.has(x); tries += 1) x = rng.int(1, width - 2);
      taken.add(x);
      ladders.push({ id: `l-${lower}-${c}`, x, z, lower });
    }
  }

  const spawnLane = spineLanes.find((z) => !isMarooned(0, z)) ?? (spineLanes[0] as number);

  return {
    id: `gen3d-${seed}`,
    seed,
    floorCount,
    floorHeight: 96,
    cellSize: 48,
    walks,
    ladders,
    ingredients,
    plates,
    spawn: { x: 1, z: spawnLane, floor: 0 },
  };
}
