/**
 * Seeded RNG with named streams.
 *
 * The simulation, map generator, enemy AI, boss pattern decks and cosmetic
 * variance each draw from their own stream so that adding a particle effect can
 * never shift a map layout or a boss pattern for the same run seed.
 */

/** FNV-1a 32-bit - stable across engines, good enough to derive stream seeds. */
export function hashString(input: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 - small, fast, and deterministic across platforms. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty list');
    return items[this.int(0, items.length - 1)] as T;
  }

  /** In-place Fisher-Yates. Returns the same array for chaining. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      const a = items[i] as T;
      const b = items[j] as T;
      items[i] = b;
      items[j] = a;
    }
    return items;
  }

  /** Snapshot/restore support for replay verification. */
  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}

export type RngStreamName =
  | 'map'
  | 'ai'
  | 'pickup'
  | 'cosmetic'
  | 'boss'
  | 'audio'
  | 'attract'
  | 'test';

/**
 * Groups the per-run streams. Streams are created lazily but deterministically:
 * `stream('ai')` returns the same sequence regardless of call order.
 */
export class RngStreams {
  readonly runSeed: number;
  private readonly streams = new Map<string, Rng>();

  constructor(runSeed: number) {
    this.runSeed = runSeed >>> 0;
  }

  stream(name: RngStreamName | string): Rng {
    let rng = this.streams.get(name);
    if (!rng) {
      rng = new Rng(hashString(name, this.runSeed));
      this.streams.set(name, rng);
    }
    return rng;
  }

  /** A fresh, independent RNG derived from the run seed - never cached. */
  derive(name: string, index = 0): Rng {
    return new Rng(hashString(`${name}#${index}`, this.runSeed));
  }

  reset(): void {
    this.streams.clear();
  }
}

/** Turns a human-typed seed ("MIDNIGHT") into a numeric run seed. */
export function parseSeed(input: string | number | undefined | null): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input >>> 0;
  if (typeof input === 'string' && input.trim().length > 0) {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10) >>> 0;
    return hashString(trimmed.toUpperCase());
  }
  return 0x5eed1234;
}

/** Renders a run seed as the 8-character code shown on the round intro card. */
export function formatSeed(seed: number): string {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
