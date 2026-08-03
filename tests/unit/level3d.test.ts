/**
 * 3D generation and playability tests.
 *
 * The contract being defended: a generated level is never unwinnable. Sweeps
 * run wide because stranding is a tail event - it shows up on the odd seed
 * where a lane lands badly, not on the first one you try.
 */

import { describe, expect, it } from 'vitest';
import { generateLevel3D } from '@/game/levels/generate3d';
import { validateLevel3D } from '@/game/systems/solvable3d';
import {
  burgerIds3D,
  burgerStack3D,
  cellKey,
  ingredientCells,
  walkCells,
  type Level3D,
} from '@/game/levels/level3d';

describe('3D generator', () => {
  it('is deterministic for a seed', () => {
    expect(generateLevel3D(4242)).toEqual(generateLevel3D(4242));
  });

  it('differs between seeds', () => {
    expect(generateLevel3D(1)).not.toEqual(generateLevel3D(2));
  });

  it('produces every burger with a plate directly beneath its column', () => {
    const level = generateLevel3D(7);
    for (const burger of burgerIds3D(level)) {
      const plate = level.plates.find((p) => p.burger === burger);
      expect(plate, `burger ${burger} has no plate`).toBeDefined();
      for (const ing of burgerStack3D(level, burger)) {
        expect(ing.x).toBe(plate!.x);
        expect(ing.z).toBe(plate!.z);
        expect(ing.segments).toBe(plate!.segments);
      }
    }
  });

  it('never stacks two ingredients on the same cell', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const level = generateLevel3D(seed);
      const seen = new Set<string>();
      for (const ing of level.ingredients) {
        for (const c of ingredientCells(ing)) {
          const key = cellKey(ing.floor, c.x, c.z);
          expect(seen.has(key), `overlap at ${key} on seed ${seed}`).toBe(false);
          seen.add(key);
        }
      }
    }
  });

  it('rests every ingredient on a real walkable strip', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const level = generateLevel3D(seed);
      const walkable = new Set<string>();
      for (const w of level.walks) {
        for (const c of walkCells(w)) walkable.add(cellKey(w.floor, c.x, c.z));
      }
      for (const ing of level.ingredients) {
        for (const c of ingredientCells(ing)) {
          expect(
            walkable.has(cellKey(ing.floor, c.x, c.z)),
            `${ing.id} floats on seed ${seed}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('playability guarantee', () => {
  it('passes validation across a wide seed sweep', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 400; seed += 1) {
      const result = validateLevel3D(generateLevel3D(seed));
      if (!result.ok) failures.push(`seed ${seed}: ${result.failures.join('; ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('holds across different level shapes', () => {
    const shapes = [
      { floors: 3, burgers: 1, width: 10, depth: 7 },
      { floors: 4, burgers: 2, width: 14, depth: 9 },
      { floors: 5, burgers: 2, width: 16, depth: 12 },
      { floors: 6, burgers: 3, width: 20, depth: 12 },
    ];
    for (const shape of shapes) {
      for (let seed = 1; seed <= 60; seed += 1) {
        const result = validateLevel3D(generateLevel3D(seed, shape));
        expect(result.ok, `${JSON.stringify(shape)} seed ${seed}: ${result.failures[0]}`).toBe(
          true,
        );
      }
    }
  });

  it('always makes the top of every column directly walkable', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const level = generateLevel3D(seed);
      const { verdicts } = validateLevel3D(level);
      for (const burger of burgerIds3D(level)) {
        const stack = burgerStack3D(level, burger);
        const top = stack.reduce((a, b) => (b.floor > a.floor ? b : a));
        const verdict = verdicts.find((v) => v.id === top.id);
        expect(verdict?.why, `seed ${seed} ${top.id}`).toBe('direct');
      }
    }
  });

  it('does produce the cascade case on some seeds', () => {
    let cascades = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const { verdicts } = validateLevel3D(generateLevel3D(seed));
      if (verdicts.some((v) => v.why === 'cascade')) cascades += 1;
    }
    // The marooned lane is the whole point of the cascade rule; if the
    // generator never exercises it the feature is dead code.
    expect(cascades).toBeGreaterThan(0);
  });

  it('can be told not to maroon anything', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const { ok, verdicts } = validateLevel3D(
        generateLevel3D(seed, { allowMarooned: false }),
      );
      expect(ok).toBe(true);
      expect(verdicts.every((v) => v.why === 'direct')).toBe(true);
    }
  });
});

describe('the validator actually rejects broken levels', () => {
  const base = generateLevel3D(11, { allowMarooned: false });

  it('catches an ingredient stranded with nothing above it', () => {
    // Move the top ingredient of a column onto an unreachable lane.
    const burger = burgerIds3D(base)[0] as string;
    const stack = burgerStack3D(base, burger);
    const top = stack.reduce((a, b) => (b.floor > a.floor ? b : a));
    const broken: Level3D = {
      ...base,
      // Give it a floor with no walkable strip at all.
      ingredients: base.ingredients.map((i) =>
        i.id === top.id ? { ...i, floor: base.floorCount + 5 } : i,
      ),
    };
    const result = validateLevel3D(broken);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/rests on nothing|stranded|directly walkable/);
  });

  it('catches a column that does not sit above its plate', () => {
    const broken: Level3D = {
      ...base,
      plates: base.plates.map((p, i) => (i === 0 ? { ...p, x: p.x + 1 } : p)),
    };
    const result = validateLevel3D(broken);
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/footprint/);
  });

  it('catches a burger with no plate', () => {
    const result = validateLevel3D({ ...base, plates: [] });
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/no plate/);
  });

  it('catches a spawn floating off the walkways', () => {
    const result = validateLevel3D({ ...base, spawn: { x: 999, z: 999, floor: 0 } });
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toMatch(/spawn/);
  });

  it('treats a ladder with a missing end as scenery, not a route', () => {
    // A ladder whose upper end has no strip must not create reachability.
    const withGhost: Level3D = {
      ...base,
      ladders: [...base.ladders, { id: 'ghost', x: 1, z: 999, lower: 0 }],
    };
    const a = validateLevel3D(base).reachable.size;
    const b = validateLevel3D(withGhost).reachable.size;
    expect(b).toBe(a);
  });
});
