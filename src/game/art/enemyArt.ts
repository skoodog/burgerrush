/**
 * Food-foe part painters.
 *
 * The roster and silhouettes follow the design sheet: a fried egg, a sausage, a
 * pickle and a pair of onion rings. All four are "cute-scary" - rounded
 * collectible-toy volumes, appetizing materials, red threat eyes and lowered
 * brows. No gore, no rotting food, and explicitly no salt or pepper shaker
 * family anywhere in the roster.
 *
 * Each species reuses one shared enemy skeleton, so a new foe is art plus a
 * brain, never a new animation system.
 */

import {
  blobPath,
  capsulePath,
  ellipsePath,
  sheen,
  stroke,
  verticalRamp,
  withAlpha,
  type PaintSurface,
} from './canvasKit';
import { ENEMY, INK } from './palette';
import type { PartSpec } from './chefArt';

export type EnemySpecies = 'stalker' | 'brat' | 'phantom' | 'ringletSmall' | 'ringletLarge';

export const ENEMY_SPECIES: readonly EnemySpecies[] = [
  'stalker',
  'brat',
  'phantom',
  'ringletSmall',
  'ringletLarge',
];

export const ENEMY_DISPLAY_NAMES: Readonly<Record<EnemySpecies, string>> = Object.freeze({
  stalker: 'Sunny-Side Stalker',
  brat: 'Brat Beast',
  phantom: 'Pickle Phantom',
  ringletSmall: 'Onion Ringlet (Sprint)',
  ringletLarge: 'Onion Ringlet (Heavy)',
});

const KEY = 0.85;

/** Red threat eyes with a white keyline so they never read as Player 1 red. */
function threatEyes(s: PaintSurface, cx: number, cy: number, spread: number, r: number, angry: number): void {
  const { ctx } = s;
  for (const dir of [-1, 1] as const) {
    const ex = cx + dir * spread;
    ellipsePath(ctx, ex, cy, r * 1.25, r * 1.35);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    stroke(ctx, () => ellipsePath(ctx, ex, cy, r * 1.25, r * 1.35), 0.6, INK, 0.85);

    ellipsePath(ctx, ex + dir * r * 0.12, cy + r * 0.1, r * 0.72, r * 0.86);
    ctx.fillStyle = ENEMY.threatEye;
    ctx.fill();
    ellipsePath(ctx, ex + dir * r * 0.12, cy + r * 0.1, r * 0.34, r * 0.42);
    ctx.fillStyle = '#5a0000';
    ctx.fill();
    ellipsePath(ctx, ex - dir * r * 0.3, cy - r * 0.4, r * 0.26, r * 0.22);
    ctx.fillStyle = ENEMY.threatEyeHi;
    ctx.fill();

    // Lowered brow - the "cute but dangerous" read.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(ex - dir * r * 1.4, cy - r * (1.55 + angry * 0.5) + dir * 0);
    ctx.lineTo(ex + dir * r * 1.1, cy - r * (1.9 + angry * 0.9));
    ctx.stroke();
  }
}

function fangMouth(s: PaintSurface, cx: number, cy: number, w: number, h: number): void {
  const { ctx } = s;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - h * 0.2);
  ctx.quadraticCurveTo(cx, cy + h, cx + w / 2, cy - h * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#6d1522';
  ctx.fill();
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h * 0.2);
    ctx.quadraticCurveTo(cx, cy + h, cx + w / 2, cy - h * 0.2);
    ctx.closePath();
  }, 0.6);
  ctx.fillStyle = '#fffdf8';
  for (const t of [-0.28, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(cx + w * t, cy - h * 0.15);
    ctx.lineTo(cx + w * (t + 0.13), cy - h * 0.15);
    ctx.lineTo(cx + w * (t + 0.065), cy + h * 0.32);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------

function stalkerBody(s: PaintSurface): void {
  const { ctx, w, h } = s;
  // Lacy fried-egg white
  const white = () =>
    blobPath(
      ctx,
      [
        [w * 0.5, h * 0.06],
        [w * 0.8, h * 0.14],
        [w * 0.94, h * 0.44],
        [w * 0.84, h * 0.8],
        [w * 0.54, h * 0.94],
        [w * 0.2, h * 0.84],
        [w * 0.06, h * 0.5],
        [w * 0.18, h * 0.16],
      ],
      0.68,
    );
  white();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: '#ffffff',
    mid: ENEMY.eggWhite,
    shade: ENEMY.eggWhiteShade,
  });
  ctx.fill();
  stroke(ctx, white, KEY);

  // Yolk face
  const yolk = () => ellipsePath(ctx, w * 0.5, h * 0.46, w * 0.29, h * 0.29);
  yolk();
  ctx.fillStyle = verticalRamp(ctx, h * 0.17, h * 0.75, {
    top: ENEMY.yolkHi,
    mid: ENEMY.yolk,
    shade: ENEMY.yolkShade,
  });
  ctx.fill();
  stroke(ctx, yolk, KEY * 0.9);
  sheen(ctx, w * 0.4, h * 0.36, w * 0.1, h * 0.07, 0.8);

  threatEyes(s, w * 0.5, h * 0.42, w * 0.115, w * 0.055, 0.5);
  fangMouth(s, w * 0.5, h * 0.58, w * 0.18, h * 0.1);
}

function bratBody(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const body = () => capsulePath(ctx, w * 0.16, h * 0.5, w * 0.68, h * 0.34, h * 0.32);
  body();
  ctx.fillStyle = verticalRamp(ctx, h * 0.16, h * 0.84, {
    top: ENEMY.sausageHi,
    mid: ENEMY.sausage,
    shade: ENEMY.sausageShade,
  });
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // Grill marks
  ctx.strokeStyle = withAlpha(ENEMY.sausageShade, 0.85);
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 4; i += 1) {
    const x = w * (0.26 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(x, h * 0.2);
    ctx.lineTo(x - w * 0.05, h * 0.8);
    ctx.stroke();
  }
  sheen(ctx, w * 0.42, h * 0.3, w * 0.18, h * 0.07, 0.5);
  ctx.restore();
  stroke(ctx, body, KEY);

  threatEyes(s, w * 0.6, h * 0.38, w * 0.1, w * 0.05, 0.85);
  fangMouth(s, w * 0.62, h * 0.58, w * 0.17, h * 0.11);
}

function phantomBody(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const body = () => ellipsePath(ctx, w * 0.5, h * 0.5, w * 0.42, h * 0.44);
  body();
  ctx.fillStyle = verticalRamp(ctx, h * 0.06, h * 0.94, {
    top: ENEMY.pickleHi,
    mid: ENEMY.pickle,
    shade: ENEMY.pickleShade,
  });
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  // Bumps and translucent brine rim
  ctx.fillStyle = withAlpha(ENEMY.pickleHi, 0.55);
  for (const [bx, by, br] of [
    [0.3, 0.3, 0.05],
    [0.66, 0.26, 0.04],
    [0.72, 0.66, 0.055],
    [0.28, 0.68, 0.045],
    [0.5, 0.8, 0.04],
  ] as const) {
    ellipsePath(ctx, w * bx, h * by, w * br, h * br);
    ctx.fill();
  }
  sheen(ctx, w * 0.34, h * 0.28, w * 0.14, h * 0.09, 0.55);
  ctx.restore();
  stroke(ctx, body, KEY);
  // Ridged rim
  ctx.strokeStyle = withAlpha('#dff3b0', 0.75);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.36, h * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();

  threatEyes(s, w * 0.5, h * 0.44, w * 0.12, w * 0.05, 0.7);
  // Calculating flat mouth
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.68);
  ctx.lineTo(w * 0.6, h * 0.66);
  ctx.stroke();
}

function ringletBody(s: PaintSurface, large: boolean): void {
  const { ctx, w, h } = s;
  const outer = () => ellipsePath(ctx, w * 0.5, h * 0.5, w * 0.46, h * 0.46);
  outer();
  ctx.fillStyle = verticalRamp(ctx, h * 0.04, h * 0.96, {
    top: ENEMY.onionHi,
    mid: ENEMY.onion,
    shade: ENEMY.onionShade,
  });
  ctx.fill();
  stroke(ctx, outer, KEY);

  // Punched centre - the ring silhouette that reads at any size.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ellipsePath(ctx, w * 0.5, h * 0.5, w * (large ? 0.19 : 0.22), h * (large ? 0.19 : 0.22));
  ctx.fill();
  ctx.restore();
  stroke(
    ctx,
    () => ellipsePath(ctx, w * 0.5, h * 0.5, w * (large ? 0.19 : 0.22), h * (large ? 0.19 : 0.22)),
    KEY * 0.8,
  );

  // Breading texture
  ctx.save();
  outer();
  ctx.clip();
  ctx.fillStyle = withAlpha('#fff0c8', 0.5);
  for (let i = 0; i < (large ? 22 : 16); i += 1) {
    const a = (i / (large ? 22 : 16)) * Math.PI * 2;
    const r = w * 0.33;
    ellipsePath(ctx, w * 0.5 + Math.cos(a) * r, h * 0.5 + Math.sin(a) * r, w * 0.035, h * 0.03);
    ctx.fill();
  }
  ctx.restore();

  threatEyes(s, w * 0.5, h * 0.24, w * 0.13, w * (large ? 0.055 : 0.048), large ? 0.9 : 0.4);
}

// ---------------------------------------------------------------------------
// Shared limbs
// ---------------------------------------------------------------------------

function stubLimb(s: PaintSurface, color: string, shade: string): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  const path = () => capsulePath(ctx, 1.6, cy, w - 4, h / 2 - 1, h / 2 - 1.4);
  path();
  ctx.fillStyle = verticalRamp(ctx, cy - h / 2, cy + h / 2, { top: color, mid: color, shade });
  ctx.fill();
  stroke(ctx, path, KEY * 0.8);
}

function bootPart(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const path = () =>
    blobPath(ctx, [
      [w * 0.1, h * 0.4],
      [w * 0.6, h * 0.22],
      [w * 0.94, h * 0.56],
      [w * 0.84, h * 0.9],
      [w * 0.12, h * 0.88],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, h * 0.2, h * 0.9, {
    top: '#5d4a44',
    mid: '#41322e',
    shade: '#2a1f1c',
  });
  ctx.fill();
  stroke(ctx, path, KEY * 0.8);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const BODY_SIZE: Readonly<Record<EnemySpecies, { w: number; h: number }>> = Object.freeze({
  stalker: { w: 30, h: 26 },
  brat: { w: 32, h: 20 },
  phantom: { w: 26, h: 26 },
  ringletSmall: { w: 22, h: 22 },
  ringletLarge: { w: 30, h: 30 },
});

const LIMB_COLORS: Readonly<Record<EnemySpecies, { base: string; shade: string }>> = Object.freeze({
  stalker: { base: ENEMY.eggWhite, shade: ENEMY.eggWhiteShade },
  brat: { base: ENEMY.sausageHi, shade: ENEMY.sausageShade },
  phantom: { base: ENEMY.pickleHi, shade: ENEMY.pickleShade },
  ringletSmall: { base: ENEMY.onionHi, shade: ENEMY.onionShade },
  ringletLarge: { base: ENEMY.onionHi, shade: ENEMY.onionShade },
});

export function enemyBodySize(species: EnemySpecies): { w: number; h: number } {
  return BODY_SIZE[species];
}

export function enemyPartSpecs(): PartSpec[] {
  const specs: PartSpec[] = [];
  const bodyPainters: Record<EnemySpecies, (s: PaintSurface) => void> = {
    stalker: stalkerBody,
    brat: bratBody,
    phantom: phantomBody,
    ringletSmall: (s) => ringletBody(s, false),
    ringletLarge: (s) => ringletBody(s, true),
  };

  for (const species of ENEMY_SPECIES) {
    const size = BODY_SIZE[species];
    const limb = LIMB_COLORS[species];
    specs.push({
      key: `enemy.${species}.body`,
      w: size.w,
      h: size.h,
      base: bodyPainters[species],
    });
    specs.push({
      key: `enemy.${species}.arm`,
      w: 8,
      h: 5,
      base: (s) => stubLimb(s, limb.base, limb.shade),
    });
    specs.push({
      key: `enemy.${species}.leg`,
      w: 8,
      h: 5,
      base: (s) => stubLimb(s, limb.base, limb.shade),
    });
    specs.push({ key: `enemy.${species}.foot`, w: 8, h: 6, base: bootPart });
  }

  // Stun stars, shared by every species.
  specs.push({
    key: 'enemy.stunStar',
    w: 8,
    h: 8,
    base: (s) => {
      const { ctx, w, h } = s;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? w * 0.46 : w * 0.2;
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = '#ffe08a';
      ctx.fill();
      stroke(ctx, () => undefined, 0.5);
    },
  });

  return specs;
}
