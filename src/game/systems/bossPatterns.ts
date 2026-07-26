/**
 * Deterministic boss pattern decks.
 *
 * Each condiment family has its own silhouette, motion grammar, warning glyph,
 * pre-fire telegraph and audio motif. Decks are drawn from a seeded stream so a
 * replay reproduces the exact barrage, and every entry declares a safe corridor
 * the fairness validator can check.
 */

import type { Rng } from '../core/rng';

export type CondimentFamily = 'pickle' | 'ketchup' | 'mustard' | 'mayo';

export interface PatternStep {
  readonly family: CondimentFamily;
  /** Telegraph duration before the first projectile leaves the port. */
  readonly telegraph: number;
  /** Total duration of the volley. */
  readonly duration: number;
  /** Number of discrete emissions. */
  readonly shots: number;
  /** Normalised lane centres (0 = top of arena, 1 = bottom). */
  readonly lanes: readonly number[];
  /**
   * Normalised safe corridor guaranteed to remain passable for the whole step.
   * The fairness validator asserts this is non-empty for every unlocked step.
   */
  readonly safeLane: readonly [number, number];
}

const PICKLE_STRAIGHT: PatternStep = {
  family: 'pickle',
  telegraph: 0.55,
  duration: 1.7,
  shots: 4,
  lanes: [0.22, 0.5, 0.78],
  safeLane: [0.58, 0.72],
};

const PICKLE_STAGGER: PatternStep = {
  family: 'pickle',
  telegraph: 0.45,
  duration: 2.1,
  shots: 6,
  lanes: [0.16, 0.36, 0.64, 0.84],
  safeLane: [0.44, 0.58],
};

const KETCHUP_LANE: PatternStep = {
  family: 'ketchup',
  telegraph: 0.85,
  duration: 1.6,
  shots: 1,
  lanes: [0.34],
  safeLane: [0.62, 0.9],
};

const KETCHUP_SWEEP: PatternStep = {
  family: 'ketchup',
  telegraph: 0.95,
  duration: 2.2,
  shots: 2,
  lanes: [0.28, 0.7],
  safeLane: [0.46, 0.58],
};

const MUSTARD_FAN: PatternStep = {
  family: 'mustard',
  telegraph: 0.6,
  duration: 1.8,
  shots: 3,
  lanes: [0.3, 0.5, 0.7],
  safeLane: [0.12, 0.24],
};

const MUSTARD_WAVE: PatternStep = {
  family: 'mustard',
  telegraph: 0.55,
  duration: 2.4,
  shots: 5,
  lanes: [0.5],
  safeLane: [0.76, 0.92],
};

const MAYO_SPLIT: PatternStep = {
  family: 'mayo',
  telegraph: 0.75,
  duration: 2.6,
  shots: 3,
  lanes: [0.32, 0.66],
  safeLane: [0.46, 0.56],
};

const DECK: Readonly<Record<CondimentFamily, readonly PatternStep[]>> = Object.freeze({
  pickle: [PICKLE_STRAIGHT, PICKLE_STAGGER],
  ketchup: [KETCHUP_LANE, KETCHUP_SWEEP],
  mustard: [MUSTARD_FAN, MUSTARD_WAVE],
  mayo: [MAYO_SPLIT],
});

/** Families unlocked at a given round, per the teaching order. */
export function unlockedFamilies(round: number): CondimentFamily[] {
  if (round <= 1) return ['pickle'];
  if (round === 2) return ['pickle', 'ketchup'];
  if (round === 3) return ['pickle', 'ketchup', 'mustard'];
  return ['pickle', 'ketchup', 'mustard', 'mayo'];
}

/**
 * Builds a shuffled, deterministic deck for a round.
 *
 * Level 1 is a scripted tutorial: slow, widely spaced pickle discs only, with
 * generous safe lanes and no shuffling at all.
 */
export function buildPatternDeck(round: number, rng: Rng, length = 10): PatternStep[] {
  const families = unlockedFamilies(round);
  if (round <= 1) {
    return Array.from({ length }, () => ({ ...PICKLE_STRAIGHT, telegraph: 0.75, duration: 2.1 }));
  }

  const pool: PatternStep[] = [];
  for (const family of families) pool.push(...(DECK[family] ?? []));

  const deck: PatternStep[] = [];
  let lastFamily: CondimentFamily | null = null;
  for (let i = 0; i < length; i += 1) {
    // Never repeat a family back to back: readability before density.
    const candidates = pool.filter((s) => s.family !== lastFamily);
    const step = rng.pick(candidates.length > 0 ? candidates : pool);
    deck.push(step);
    lastFamily = step.family;
  }
  return deck;
}

/** A step is fair when it leaves a corridor of at least this normalised height. */
export const MIN_SAFE_CORRIDOR = 0.1;

export function isStepFair(step: PatternStep): boolean {
  const [lo, hi] = step.safeLane;
  if (hi - lo < MIN_SAFE_CORRIDOR) return false;
  // The safe corridor must not be occupied by any lane in this step.
  return !step.lanes.some((lane) => lane > lo - 0.04 && lane < hi + 0.04);
}

export function validateDeck(deck: readonly PatternStep[]): { ok: boolean; failures: number[] } {
  const failures: number[] = [];
  deck.forEach((step, i) => {
    if (!isStepFair(step)) failures.push(i);
  });
  return { ok: failures.length === 0, failures };
}
