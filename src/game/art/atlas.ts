/**
 * Texture bakery.
 *
 * Runs once during preload: paints every part spec to a canvas, tints the accent
 * masks into Player 1 red and Player 2 blue exports from the *same* source
 * geometry, and registers the results with Phaser under stable keys.
 *
 * Stable keys are the whole point - when final source art lands it replaces the
 * painter behind the same key and nothing else in the game changes.
 */

import type Phaser from 'phaser';
import { chefPartSpecs, chefShadowSpec, type PartSpec } from './chefArt';
import { enemyPartSpecs } from './enemyArt';
import { worldPartSpecs } from './worldArt';
import { compositeAccent, createSurface, PAD, RES } from './canvasKit';
import { ACCENT, type AccentName } from './palette';

/** Accent variants baked for every accent-bearing part. */
const ACCENT_VARIANTS: readonly AccentName[] = ['red', 'blue', 'neutral'];

export interface AtlasReport {
  readonly textureCount: number;
  readonly accentTextureCount: number;
  readonly elapsedMs: number;
  readonly keys: readonly string[];
}

/** Doll-unit -> texture-pixel scale. The view divides by this. */
export const ART_RES = RES;

function bakeSpec(spec: PartSpec): {
  base: HTMLCanvasElement;
  mask: HTMLCanvasElement | null;
} {
  const base = createSurface(spec.w, spec.h);
  spec.base(base);
  if (!spec.accent) return { base: base.canvas, mask: null };
  const mask = createSurface(spec.w, spec.h);
  spec.accent(mask);
  return { base: base.canvas, mask: mask.canvas };
}

function addCanvas(textures: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement): void {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

/**
 * Bakes every procedural texture into the scene's texture manager.
 *
 * Accent-bearing parts produce `<key>.red`, `<key>.blue` and `<key>.neutral`.
 * Parts with no accent keep their bare key.
 */
export function buildProceduralAtlas(scene: Phaser.Scene): AtlasReport {
  const started = performance.now();
  const textures = scene.textures;
  const specs: PartSpec[] = [
    ...chefPartSpecs(),
    chefShadowSpec(),
    ...enemyPartSpecs(),
    ...worldPartSpecs(),
  ];

  const keys: string[] = [];
  let accentCount = 0;

  for (const spec of specs) {
    const { base, mask } = bakeSpec(spec);
    if (!mask) {
      addCanvas(textures, spec.key, base);
      keys.push(spec.key);
      continue;
    }
    for (const variant of ACCENT_VARIANTS) {
      const key = `${spec.key}.${variant}`;
      addCanvas(textures, key, compositeAccent(base, mask, ACCENT[variant].base));
      keys.push(key);
      accentCount += 1;
    }
  }

  return {
    textureCount: keys.length,
    accentTextureCount: accentCount,
    elapsedMs: performance.now() - started,
    keys,
  };
}

/**
 * Pivot correction.
 *
 * `createSurface` adds `PAD` pixels of bleed on every side so keylines are never
 * clipped. The rig authored its pivots against the *logical* part box, so the
 * view converts a normalised logical origin into a normalised texture origin.
 */
export function paddedOrigin(originX: number, originY: number, w: number, h: number): {
  x: number;
  y: number;
} {
  const texW = Math.ceil(w * RES) + PAD * 2;
  const texH = Math.ceil(h * RES) + PAD * 2;
  return {
    x: (PAD + originX * w * RES) / texW,
    y: (PAD + originY * h * RES) / texH,
  };
}

/** Logical doll-unit sizes, keyed by texture key prefix, for pivot maths. */
const LOGICAL_SIZES = new Map<string, { w: number; h: number }>();

export function registerLogicalSizes(): ReadonlyMap<string, { w: number; h: number }> {
  if (LOGICAL_SIZES.size > 0) return LOGICAL_SIZES;
  const specs: PartSpec[] = [
    ...chefPartSpecs(),
    chefShadowSpec(),
    ...enemyPartSpecs(),
    ...worldPartSpecs(),
  ];
  for (const spec of specs) {
    LOGICAL_SIZES.set(spec.key, { w: spec.w, h: spec.h });
    for (const variant of ACCENT_VARIANTS) {
      LOGICAL_SIZES.set(`${spec.key}.${variant}`, { w: spec.w, h: spec.h });
    }
  }
  return LOGICAL_SIZES;
}

export function logicalSize(key: string): { w: number; h: number } | undefined {
  return registerLogicalSizes().get(key);
}
