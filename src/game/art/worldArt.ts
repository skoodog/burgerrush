/**
 * Stage, ingredient, boss and projectile painters.
 *
 * Ingredient layers are painted per tread state so progress reads by shape and
 * compression, never by colour alone (accessibility requirement). The boss is
 * modular: bun, armour layers and four condiment ports are separate parts so
 * armour can crack and fall away without re-authoring the whole body.
 */

import {
  blobPath,
  capsulePath,
  ellipsePath,
  roundRectPath,
  sheen,
  stroke,
  verticalRamp,
  withAlpha,
  type PaintSurface,
} from './canvasKit';
import { CONDIMENT, ENEMY, INGREDIENT_RAMPS, INK, UI, WORLD, type IngredientKind } from './palette';
import type { PartSpec } from './chefArt';

export const INGREDIENT_KINDS: readonly IngredientKind[] = [
  'bunTop',
  'lettuce',
  'cheese',
  'patty',
  'tomato',
  'pickle',
  'onion',
  'bunBottom',
];

/** Width of one tread segment in world units. */
export const TREAD_SEGMENT_W = 16;
export const INGREDIENT_H = 12;

/**
 * One tread segment of an ingredient layer.
 *
 * `pressed` draws the compressed silhouette plus a footprint notch, so a player
 * with any colour vision can see which segments are done.
 */
function ingredientSegment(s: PaintSurface, kind: IngredientKind, pressed: boolean): void {
  const { ctx, w, h } = s;
  const ramp = INGREDIENT_RAMPS[kind];
  const squash = pressed ? 0.72 : 1;
  const top = h * (1 - squash) + 1;
  const bh = (h - 2) * squash;

  const body = (): void => {
    switch (kind) {
      case 'bunTop':
        ctx.beginPath();
        ctx.moveTo(1, top + bh);
        ctx.quadraticCurveTo(1, top, w * 0.5, top);
        ctx.quadraticCurveTo(w - 1, top, w - 1, top + bh);
        ctx.closePath();
        break;
      case 'lettuce':
        blobPath(
          ctx,
          [
            [1, top + bh * 0.7],
            [w * 0.18, top + bh * 0.1],
            [w * 0.38, top + bh * 0.6],
            [w * 0.58, top + bh * 0.05],
            [w * 0.8, top + bh * 0.55],
            [w - 1, top + bh * 0.2],
            [w - 1, top + bh],
            [1, top + bh],
          ],
          0.7,
        );
        break;
      case 'cheese':
        ctx.beginPath();
        ctx.moveTo(1, top);
        ctx.lineTo(w - 1, top);
        ctx.lineTo(w - 1, top + bh * 0.6);
        ctx.quadraticCurveTo(w * 0.72, top + bh * 1.15, w * 0.55, top + bh * 0.6);
        ctx.quadraticCurveTo(w * 0.3, top + bh * 1.2, w * 0.14, top + bh * 0.6);
        ctx.lineTo(1, top + bh * 0.62);
        ctx.closePath();
        break;
      case 'pickle':
      case 'tomato':
      case 'onion':
        roundRectPath(ctx, 1, top, w - 2, bh, bh * 0.42);
        break;
      case 'bunBottom':
        roundRectPath(ctx, 1, top, w - 2, bh, bh * 0.3);
        break;
      case 'patty':
      default:
        roundRectPath(ctx, 1, top, w - 2, bh, bh * 0.28);
        break;
    }
  };

  body();
  ctx.fillStyle = verticalRamp(ctx, top, top + bh, ramp);
  ctx.fill();

  ctx.save();
  body();
  ctx.clip();
  switch (kind) {
    case 'bunTop':
      ctx.fillStyle = withAlpha('#fff4dd', 0.85);
      for (const [sx, sy] of [
        [0.28, 0.3],
        [0.55, 0.2],
        [0.74, 0.42],
      ] as const) {
        ellipsePath(ctx, w * sx, top + bh * sy, 1.1, 0.6, -0.3);
        ctx.fill();
      }
      break;
    case 'patty':
      ctx.fillStyle = withAlpha('#3a1f12', 0.6);
      for (let i = 0; i < 4; i += 1) {
        ellipsePath(ctx, w * (0.18 + i * 0.22), top + bh * 0.55, 1.3, 0.7);
        ctx.fill();
      }
      break;
    case 'tomato':
      ctx.fillStyle = withAlpha('#ffb3a2', 0.55);
      ellipsePath(ctx, w * 0.5, top + bh * 0.5, w * 0.32, bh * 0.28);
      ctx.fill();
      break;
    case 'pickle':
      ctx.fillStyle = withAlpha('#dff3b0', 0.5);
      for (let i = 0; i < 5; i += 1) {
        ellipsePath(ctx, w * (0.12 + i * 0.19), top + bh * 0.45, 0.9, 0.9);
        ctx.fill();
      }
      break;
    case 'onion':
      ctx.strokeStyle = withAlpha('#fff0c8', 0.6);
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(w * 0.5, top + bh * 0.5, w * (0.16 + i * 0.12), bh * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    default:
      break;
  }
  sheen(ctx, w * 0.3, top + bh * 0.22, w * 0.22, bh * 0.16, 0.35);
  if (pressed) {
    // Footprint notch: shape-coded progress.
    ctx.fillStyle = withAlpha('#000000', 0.22);
    roundRectPath(ctx, w * 0.3, top + bh * 0.18, w * 0.4, bh * 0.42, bh * 0.18);
    ctx.fill();
  }
  ctx.restore();
  stroke(ctx, body, 0.7, ramp.edge ?? INK);
}

// ---------------------------------------------------------------------------
// Stage furniture
// ---------------------------------------------------------------------------

function platformTile(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const body = () => roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, 1.6);
  body();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: WORLD.steelHi,
    mid: WORLD.steel,
    shade: WORLD.steelShade,
  });
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  ctx.strokeStyle = withAlpha('#ffffff', 0.35);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(1, 1.4);
  ctx.lineTo(w - 1, 1.4);
  ctx.stroke();
  ctx.fillStyle = withAlpha('#0a0f1f', 0.28);
  ctx.fillRect(0, h * 0.66, w, h * 0.34);
  ctx.restore();
  stroke(ctx, body, 0.6, '#1b2334');
}

function ladderTile(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const rail = (x: number): void => {
    capsulePath(ctx, x, h * 0.5, 0.01, w * 0.09);
    ctx.fillStyle = verticalRamp(ctx, 0, h, {
      top: WORLD.ladderHi,
      mid: WORLD.ladder,
      shade: WORLD.ladderShade,
    });
    ctx.fill();
    ctx.fillRect(x - w * 0.09, 0, w * 0.18, h);
  };
  ctx.save();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: WORLD.ladderHi,
    mid: WORLD.ladder,
    shade: WORLD.ladderShade,
  });
  rail(w * 0.18);
  rail(w * 0.82);
  // Rungs
  for (let i = 0; i < 3; i += 1) {
    const y = h * (0.18 + i * 0.32);
    roundRectPath(ctx, w * 0.1, y, w * 0.8, h * 0.09, h * 0.04);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = withAlpha(INK, 0.55);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(w * 0.09, 0, w * 0.18, h);
  ctx.strokeRect(w * 0.73, 0, w * 0.18, h);
}

function plateTile(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(0.5, h * 0.2);
    ctx.lineTo(w - 0.5, h * 0.2);
    ctx.quadraticCurveTo(w - 0.5, h - 0.5, w * 0.82, h - 0.5);
    ctx.lineTo(w * 0.18, h - 0.5);
    ctx.quadraticCurveTo(0.5, h - 0.5, 0.5, h * 0.2);
    ctx.closePath();
  };
  body();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: '#ffffff',
    mid: WORLD.plate,
    shade: WORLD.plateShade,
  });
  ctx.fill();
  stroke(ctx, body, 0.7, '#7c879c');
  sheen(ctx, w * 0.3, h * 0.4, w * 0.22, h * 0.16, 0.6);
}

function portalTile(s: PaintSurface): void {
  const { ctx, w, h } = s;
  for (let i = 4; i >= 0; i -= 1) {
    const t = i / 4;
    ellipsePath(ctx, w / 2, h / 2, (w / 2) * (0.45 + t * 0.55), (h / 2) * (0.45 + t * 0.55));
    ctx.fillStyle = withAlpha(i % 2 === 0 ? '#a45bff' : '#38d8ff', 0.16 + (1 - t) * 0.5);
    ctx.fill();
  }
  ctx.strokeStyle = '#d9b3ff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.46, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Boss - The Dread Stack
// ---------------------------------------------------------------------------

function bossBun(s: PaintSurface, top: boolean): void {
  const { ctx, w, h } = s;
  const ramp = top ? INGREDIENT_RAMPS.bunTop : INGREDIENT_RAMPS.bunBottom;
  const body = (): void => {
    ctx.beginPath();
    if (top) {
      ctx.moveTo(w * 0.02, h * 0.92);
      ctx.quadraticCurveTo(w * 0.04, h * 0.06, w * 0.5, h * 0.05);
      ctx.quadraticCurveTo(w * 0.96, h * 0.06, w * 0.98, h * 0.92);
    } else {
      ctx.moveTo(w * 0.04, h * 0.08);
      ctx.lineTo(w * 0.96, h * 0.08);
      ctx.quadraticCurveTo(w * 0.99, h * 0.94, w * 0.5, h * 0.96);
      ctx.quadraticCurveTo(w * 0.01, h * 0.94, w * 0.04, h * 0.08);
    }
    ctx.closePath();
  };
  body();
  ctx.fillStyle = verticalRamp(ctx, 0, h, ramp);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  if (top) {
    ctx.fillStyle = withAlpha('#fff4dd', 0.9);
    for (const [sx, sy, r] of [
      [0.24, 0.3, 1],
      [0.44, 0.2, 0.9],
      [0.64, 0.3, 1],
      [0.34, 0.48, 0.8],
      [0.74, 0.5, 0.9],
      [0.54, 0.42, 0.85],
    ] as const) {
      ellipsePath(ctx, w * sx, h * sy, w * 0.018 * r, h * 0.03 * r, -0.4);
      ctx.fill();
    }
  }
  sheen(ctx, w * 0.28, h * 0.28, w * 0.16, h * 0.14, 0.4);
  ctx.restore();
  stroke(ctx, body, 1.1, ramp.edge ?? INK);
}

function bossFace(s: PaintSurface, enraged: boolean): void {
  const { ctx, w, h } = s;
  // Huge red threat eyes with heavy angry brows.
  for (const dir of [-1, 1] as const) {
    const cx = w * 0.5 + dir * w * 0.19;
    const cy = h * 0.45;
    const r = w * 0.11;
    ellipsePath(ctx, cx, cy, r * 1.15, r * 1.3);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    stroke(ctx, () => ellipsePath(ctx, cx, cy, r * 1.15, r * 1.3), 1, INK);
    ellipsePath(ctx, cx + dir * r * 0.16, cy + r * 0.12, r * 0.66, r * 0.82);
    ctx.fillStyle = enraged ? '#ff5b1a' : ENEMY.threatEye;
    ctx.fill();
    ellipsePath(ctx, cx + dir * r * 0.16, cy + r * 0.12, r * 0.3, r * 0.4);
    ctx.fillStyle = '#4a0000';
    ctx.fill();
    ellipsePath(ctx, cx - dir * r * 0.32, cy - r * 0.44, r * 0.24, r * 0.2);
    ctx.fillStyle = ENEMY.threatEyeHi;
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - dir * r * 1.5, cy - r * (enraged ? 1.5 : 1.75));
    ctx.lineTo(cx + dir * r * 1.25, cy - r * (enraged ? 2.5 : 2.15));
    ctx.stroke();
  }
  // Comic mouth
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.68);
  ctx.quadraticCurveTo(w * 0.5, h * (enraged ? 0.94 : 0.86), w * 0.64, h * 0.68);
  ctx.closePath();
  ctx.fillStyle = '#6d1522';
  ctx.fill();
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(w * 0.36, h * 0.68);
    ctx.quadraticCurveTo(w * 0.5, h * (enraged ? 0.94 : 0.86), w * 0.64, h * 0.68);
    ctx.closePath();
  }, 1);
  ctx.fillStyle = '#fffdf8';
  for (const t of [0.4, 0.53]) {
    ctx.beginPath();
    ctx.moveTo(w * t, h * 0.69);
    ctx.lineTo(w * (t + 0.06), h * 0.69);
    ctx.lineTo(w * (t + 0.03), h * 0.79);
    ctx.closePath();
    ctx.fill();
  }
}

function bossArmour(s: PaintSurface, kind: IngredientKind, cracked: boolean): void {
  const { ctx, w, h } = s;
  const ramp = INGREDIENT_RAMPS[kind];
  const body = () => roundRectPath(ctx, 1, 1, w - 2, h - 2, h * 0.3);
  body();
  ctx.fillStyle = verticalRamp(ctx, 0, h, ramp);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  sheen(ctx, w * 0.26, h * 0.3, w * 0.16, h * 0.2, 0.35);
  if (cracked) {
    ctx.strokeStyle = withAlpha('#1a1018', 0.75);
    ctx.lineWidth = 1;
    for (const x of [0.24, 0.5, 0.76]) {
      ctx.beginPath();
      ctx.moveTo(w * x, 0);
      ctx.lineTo(w * (x + 0.05), h * 0.4);
      ctx.lineTo(w * (x - 0.03), h * 0.7);
      ctx.lineTo(w * (x + 0.04), h);
      ctx.stroke();
    }
  }
  ctx.restore();
  stroke(ctx, body, 1, ramp.edge ?? INK);
}

function condimentPort(s: PaintSurface, family: keyof typeof CONDIMENT): void {
  const { ctx, w, h } = s;
  const c = CONDIMENT[family];
  const body = () => roundRectPath(ctx, 1, h * 0.2, w - 2, h * 0.6, h * 0.28);
  body();
  ctx.fillStyle = verticalRamp(ctx, h * 0.2, h * 0.8, { top: '#c6d1e4', mid: '#8e9bb5', shade: '#4a5570' });
  ctx.fill();
  stroke(ctx, body, 0.8);
  ellipsePath(ctx, w * 0.86, h * 0.5, w * 0.12, h * 0.24);
  ctx.fillStyle = c.base;
  ctx.fill();
  stroke(ctx, () => ellipsePath(ctx, w * 0.86, h * 0.5, w * 0.12, h * 0.24), 0.6);
}

// ---------------------------------------------------------------------------
// Projectiles - each family has a distinct silhouette AND a warning glyph
// ---------------------------------------------------------------------------

function pickleDisc(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const c = CONDIMENT.pickle;
  ellipsePath(ctx, w / 2, h / 2, w * 0.46, h * 0.46);
  ctx.fillStyle = verticalRamp(ctx, 0, h, { top: c.hi, mid: c.base, shade: c.shade });
  ctx.fill();
  stroke(ctx, () => ellipsePath(ctx, w / 2, h / 2, w * 0.46, h * 0.46), 0.9, '#1d2b0d');
  // Concentric ridges - circular silhouette identity.
  ctx.strokeStyle = withAlpha('#dff3b0', 0.85);
  ctx.lineWidth = 0.7;
  for (const r of [0.32, 0.2]) {
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * r, h * r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = withAlpha('#dff3b0', 0.9);
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ellipsePath(ctx, w / 2 + Math.cos(a) * w * 0.24, h / 2 + Math.sin(a) * h * 0.24, 0.8, 0.8);
    ctx.fill();
  }
}

function ketchupJet(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const c = CONDIMENT.ketchup;
  // Rectangular lane slug - unmistakably not a disc.
  const body = () => roundRectPath(ctx, 0.5, h * 0.22, w - 1, h * 0.56, h * 0.2);
  body();
  ctx.fillStyle = verticalRamp(ctx, h * 0.22, h * 0.78, { top: c.hi, mid: c.base, shade: c.shade });
  ctx.fill();
  stroke(ctx, body, 0.8, '#4a0d08');
  ctx.fillStyle = withAlpha('#ffffff', 0.35);
  ctx.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.08);
}

function mustardWave(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const c = CONDIMENT.mustard;
  // Forked triangular silhouette.
  ctx.beginPath();
  ctx.moveTo(w * 0.96, h * 0.5);
  ctx.lineTo(w * 0.1, h * 0.08);
  ctx.lineTo(w * 0.3, h * 0.5);
  ctx.lineTo(w * 0.1, h * 0.92);
  ctx.closePath();
  ctx.fillStyle = verticalRamp(ctx, 0, h, { top: c.hi, mid: c.base, shade: c.shade });
  ctx.fill();
  stroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(w * 0.96, h * 0.5);
    ctx.lineTo(w * 0.1, h * 0.08);
    ctx.lineTo(w * 0.3, h * 0.5);
    ctx.lineTo(w * 0.1, h * 0.92);
    ctx.closePath();
  }, 0.8, '#5a4103');
}

function mayoDollop(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const c = CONDIMENT.mayo;
  const body = () =>
    blobPath(ctx, [
      [w * 0.5, h * 0.08],
      [w * 0.86, h * 0.3],
      [w * 0.82, h * 0.76],
      [w * 0.5, h * 0.94],
      [w * 0.18, h * 0.76],
      [w * 0.14, h * 0.3],
    ]);
  body();
  ctx.fillStyle = verticalRamp(ctx, 0, h, { top: c.hi, mid: c.base, shade: c.shade });
  ctx.fill();
  // Heavy dark outline so a white blob never washes out the screen.
  stroke(ctx, body, 1.5, '#2b2519');
  sheen(ctx, w * 0.36, h * 0.32, w * 0.16, h * 0.12, 0.7);
}

/** Spinning spatula projectile - the chefs' unlimited Boss Flight ammunition. */
function flyingSpatula(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const body = () => roundRectPath(ctx, w * 0.06, h * 0.28, w * 0.88, h * 0.44, h * 0.18);
  body();
  ctx.fillStyle = verticalRamp(ctx, h * 0.28, h * 0.72, {
    top: '#f2f6ff',
    mid: '#c0cbe0',
    shade: '#7d8aa3',
  });
  ctx.fill();
  stroke(ctx, body, 0.8, '#38445c');
  ctx.fillStyle = '#2f3850';
  roundRectPath(ctx, w * 0.02, h * 0.4, w * 0.24, h * 0.2, h * 0.1);
  ctx.fill();
  sheen(ctx, w * 0.6, h * 0.38, w * 0.16, h * 0.08, 0.9);
}

/** Warning glyphs: shape-coded, readable with no colour at all. */
function warningGlyph(s: PaintSurface, family: keyof typeof CONDIMENT): void {
  const { ctx, w, h } = s;
  ctx.strokeStyle = UI.text;
  ctx.fillStyle = UI.text;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  switch (family) {
    case 'pickle':
      ctx.arc(w / 2, h / 2, w * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'ketchup':
      ctx.rect(w * 0.14, h * 0.36, w * 0.72, h * 0.28);
      ctx.stroke();
      break;
    case 'mustard':
      ctx.moveTo(w * 0.16, h * 0.2);
      ctx.lineTo(w * 0.84, h * 0.5);
      ctx.lineTo(w * 0.16, h * 0.8);
      ctx.stroke();
      break;
    case 'mayo':
      ctx.moveTo(w * 0.5, h * 0.16);
      ctx.lineTo(w * 0.84, h * 0.84);
      ctx.lineTo(w * 0.16, h * 0.84);
      ctx.closePath();
      ctx.stroke();
      break;
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export function worldPartSpecs(): PartSpec[] {
  const specs: PartSpec[] = [];

  for (const kind of INGREDIENT_KINDS) {
    specs.push({
      key: `ingredient.${kind}.raw`,
      w: TREAD_SEGMENT_W,
      h: INGREDIENT_H,
      base: (s) => ingredientSegment(s, kind, false),
    });
    specs.push({
      key: `ingredient.${kind}.pressed`,
      w: TREAD_SEGMENT_W,
      h: INGREDIENT_H,
      base: (s) => ingredientSegment(s, kind, true),
    });
  }

  specs.push({ key: 'stage.platform', w: 16, h: 8, base: platformTile });
  specs.push({ key: 'stage.ladder', w: 16, h: 16, base: ladderTile });
  specs.push({ key: 'stage.plate', w: 40, h: 10, base: plateTile });
  specs.push({ key: 'stage.portal', w: 24, h: 32, base: portalTile });

  specs.push({ key: 'boss.bunTop', w: 96, h: 44, base: (s) => bossBun(s, true) });
  specs.push({ key: 'boss.bunBottom', w: 96, h: 36, base: (s) => bossBun(s, false) });
  specs.push({ key: 'boss.face', w: 96, h: 40, base: (s) => bossFace(s, false) });
  specs.push({ key: 'boss.faceEnraged', w: 96, h: 40, base: (s) => bossFace(s, true) });
  for (const kind of ['lettuce', 'cheese', 'patty', 'tomato'] as const) {
    specs.push({ key: `boss.armour.${kind}`, w: 92, h: 16, base: (s) => bossArmour(s, kind, false) });
    specs.push({
      key: `boss.armour.${kind}.cracked`,
      w: 92,
      h: 16,
      base: (s) => bossArmour(s, kind, true),
    });
  }
  for (const family of ['pickle', 'ketchup', 'mustard', 'mayo'] as const) {
    specs.push({ key: `boss.port.${family}`, w: 22, h: 14, base: (s) => condimentPort(s, family) });
    specs.push({ key: `ui.warn.${family}`, w: 16, h: 16, base: (s) => warningGlyph(s, family) });
  }

  specs.push({ key: 'shot.pickle', w: 12, h: 12, base: pickleDisc });
  specs.push({ key: 'shot.ketchup', w: 28, h: 12, base: ketchupJet });
  specs.push({ key: 'shot.mustard', w: 16, h: 12, base: mustardWave });
  specs.push({ key: 'shot.mayo', w: 16, h: 16, base: mayoDollop });
  specs.push({ key: 'shot.spatula', w: 14, h: 7, base: flyingSpatula });

  specs.push({
    key: 'fx.puff',
    w: 12,
    h: 12,
    base: (s) => {
      const { ctx, w, h } = s;
      ellipsePath(ctx, w / 2, h / 2, w * 0.44, h * 0.44);
      ctx.fillStyle = withAlpha('#ffffff', 0.85);
      ctx.fill();
    },
  });
  specs.push({
    key: 'fx.crumb',
    w: 5,
    h: 5,
    base: (s) => {
      const { ctx, w, h } = s;
      roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, 1.4);
      ctx.fillStyle = '#e6c184';
      ctx.fill();
    },
  });
  specs.push({
    key: 'fx.spark',
    w: 8,
    h: 8,
    base: (s) => {
      const { ctx, w, h } = s;
      ctx.fillStyle = UI.goldHi;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w * 0.62, h * 0.38);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w * 0.62, h * 0.62);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(w * 0.38, h * 0.62);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(w * 0.38, h * 0.38);
      ctx.closePath();
      ctx.fill();
    },
  });

  return specs;
}
