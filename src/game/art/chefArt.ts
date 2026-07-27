/**
 * Chef doll part painters.
 *
 * Every drawable piece of Sal and Pep, painted procedurally so the game ships
 * complete with no external art dependency. Parts that carry the player-slot
 * accent paint a second neutral-gray mask layer; the atlas builder tints it red
 * for Player 1 and blue for Player 2 from the identical source geometry.
 *
 * Design cues taken from the supplied sheet: oversized soft toque with an S/P
 * emblem, cream jacket, red neckerchief, vertically striped trousers, chunky
 * white sneakers, big warm-brown anime eyes, compact heroic proportions.
 */

import type { ChefIdentity, FaceExpression, GenderPresentation } from '../config/identity';
import {
  blobPath,
  capsulePath,
  contactShadow,
  ellipsePath,
  roundRectPath,
  sheen,
  stripeBand,
  stroke,
  verticalRamp,
  withAlpha,
  type PaintSurface,
} from './canvasKit';
import { ACCENT, CLOTH, EYE, HAIR, INK, SKIN } from './palette';

/** Neutral gray the accent mask is painted in before tinting. */
const MASK = ACCENT.neutral;

export interface PartSpec {
  readonly key: string;
  /** Logical size in doll units. Must match the pivots in chefDoll.ts. */
  readonly w: number;
  readonly h: number;
  /** Base layer. */
  readonly base: (s: PaintSurface) => void;
  /** Optional accent mask layer, painted in neutral grays. */
  readonly accent?: (s: PaintSurface) => void;
}

const KEYLINE = 0.85;

// ---------------------------------------------------------------------------
// Limbs
// ---------------------------------------------------------------------------

function sleeve(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  const path = () => capsulePath(ctx, 2.2, cy, w - 5.4, h / 2 - 0.9, h / 2 - 1.5);
  path();
  ctx.fillStyle = verticalRamp(ctx, cy - h / 2, cy + h / 2, {
    top: far ? CLOTH.mid : CLOTH.base,
    mid: far ? CLOTH.shade : CLOTH.mid,
    shade: far ? CLOTH.deep : CLOTH.shade,
  });
  ctx.fill();
  if (!far) sheen(ctx, 4.5, cy - 1.4, 3.4, 1.5, 0.5);
  stroke(ctx, path, KEYLINE, INK, far ? 0.65 : 1);
}

function sleeveStripes(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  ctx.save();
  capsulePath(ctx, 2.2, cy, w - 5.4, h / 2 - 0.9, h / 2 - 1.5);
  ctx.clip();
  ctx.fillStyle = far ? MASK.shade : MASK.base;
  // Cuff band plus two shoulder stripes - the mask regions the art bible lists.
  ctx.fillRect(w - 5.2, 0, 2.6, h);
  stripeBand(ctx, 2.4, 0, 5.5, h, 1.1, 0);
  ctx.restore();
  if (!far) {
    ctx.save();
    capsulePath(ctx, 2.2, cy, w - 5.4, h / 2 - 0.9, h / 2 - 1.5);
    ctx.clip();
    ctx.fillStyle = withAlpha(MASK.hi, 0.5);
    ctx.fillRect(w - 5.2, 0.6, 2.6, 1.2);
    ctx.restore();
  }
}

function forearm(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  const path = () => capsulePath(ctx, 2, cy, w - 4.6, h / 2 - 1.2, h / 2 - 1.6);
  path();
  ctx.fillStyle = verticalRamp(ctx, cy - h / 2, cy + h / 2, {
    top: far ? SKIN.mid : SKIN.base,
    mid: far ? SKIN.shade : SKIN.mid,
    shade: far ? SKIN.shade : SKIN.shade,
  });
  ctx.fill();
  stroke(ctx, path, KEYLINE, INK, far ? 0.6 : 1);
}

function hand(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  // Oversized expressive mitt, per the character brief.
  const path = () =>
    blobPath(ctx, [
      [w * 0.18, h * 0.3],
      [w * 0.62, h * 0.16],
      [w * 0.9, h * 0.42],
      [w * 0.82, h * 0.8],
      [w * 0.4, h * 0.9],
      [w * 0.12, h * 0.66],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, h * 0.1, h * 0.95, {
    top: far ? SKIN.mid : SKIN.base,
    mid: far ? SKIN.shade : SKIN.mid,
    shade: SKIN.shade,
  });
  ctx.fill();
  stroke(ctx, path, KEYLINE, INK, far ? 0.6 : 1);
  if (!far) {
    ctx.strokeStyle = withAlpha(SKIN.shade, 0.85);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.34);
    ctx.lineTo(w * 0.5, h * 0.62);
    ctx.stroke();
  }
}

function thigh(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  const path = () => capsulePath(ctx, 2.6, cy, w - 6, h / 2 - 0.8, h / 2 - 1.8);
  path();
  ctx.fillStyle = verticalRamp(ctx, cy - h / 2, cy + h / 2, {
    top: far ? CLOTH.mid : CLOTH.base,
    mid: far ? CLOTH.shade : CLOTH.mid,
    shade: far ? CLOTH.deep : CLOTH.shade,
  });
  ctx.fill();
  stroke(ctx, path, KEYLINE, INK, far ? 0.65 : 1);
}

function trouserStripes(s: PaintSurface, far: boolean, lower: boolean): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  ctx.save();
  capsulePath(ctx, 2.6, cy, w - 6, h / 2 - 0.8, h / 2 - 1.8);
  ctx.clip();
  ctx.fillStyle = far ? MASK.shade : MASK.base;
  // Trousers run striped along their length - the sheet's signature red/white.
  stripeBand(ctx, 0, 0, w, h, 1.15, Math.PI / 2);
  if (lower) {
    ctx.fillStyle = far ? MASK.shade : MASK.base;
    ctx.fillRect(w - 4.4, 0, 2.2, h);
  }
  ctx.restore();
}

function shoe(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  const path = () =>
    blobPath(ctx, [
      [w * 0.06, h * 0.44],
      [w * 0.3, h * 0.2],
      [w * 0.72, h * 0.24],
      [w * 0.95, h * 0.55],
      [w * 0.9, h * 0.86],
      [w * 0.1, h * 0.88],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, h * 0.15, h * 0.9, {
    top: far ? CLOTH.mid : CLOTH.rim,
    mid: far ? CLOTH.shade : CLOTH.mid,
    shade: far ? CLOTH.deep : CLOTH.shade,
  });
  ctx.fill();
  // Rubber sole
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = far ? '#b9b2a6' : '#ded7c9';
  ctx.fillRect(0, h * 0.72, w, h * 0.3);
  ctx.restore();
  stroke(ctx, path, KEYLINE, INK, far ? 0.65 : 1);
}

function shoeTrim(s: PaintSurface, far: boolean): void {
  const { ctx, w, h } = s;
  ctx.save();
  blobPath(ctx, [
    [w * 0.06, h * 0.44],
    [w * 0.3, h * 0.2],
    [w * 0.72, h * 0.24],
    [w * 0.95, h * 0.55],
    [w * 0.9, h * 0.86],
    [w * 0.1, h * 0.88],
  ]);
  ctx.clip();
  ctx.fillStyle = far ? MASK.shade : MASK.base;
  ctx.fillRect(0, h * 0.6, w, h * 0.14);
  ctx.beginPath();
  ctx.moveTo(w * 0.34, h * 0.26);
  ctx.lineTo(w * 0.5, h * 0.62);
  ctx.lineTo(w * 0.38, h * 0.62);
  ctx.lineTo(w * 0.24, h * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function torso(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const path = () =>
    blobPath(ctx, [
      [w * 0.22, h * 0.08],
      [w * 0.78, h * 0.08],
      [w * 0.9, h * 0.42],
      [w * 0.84, h * 0.92],
      [w * 0.16, h * 0.92],
      [w * 0.1, h * 0.42],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: CLOTH.rim,
    mid: CLOTH.base,
    shade: CLOTH.shade,
  });
  ctx.fill();
  // Double-breasted jacket fold
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = withAlpha(CLOTH.shade, 0.55);
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.06);
  ctx.quadraticCurveTo(w * 0.44, h * 0.5, w * 0.5, h * 0.95);
  ctx.lineTo(w * 0.88, h * 0.95);
  ctx.lineTo(w * 0.9, h * 0.06);
  ctx.closePath();
  ctx.fill();
  sheen(ctx, w * 0.3, h * 0.24, w * 0.24, h * 0.16, 0.5);
  ctx.restore();
  stroke(ctx, path, KEYLINE);
  // Collar
  const collar = () => {
    ctx.beginPath();
    ctx.moveTo(w * 0.26, h * 0.1);
    ctx.quadraticCurveTo(w * 0.5, h * 0.26, w * 0.74, h * 0.1);
    ctx.stroke();
  };
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = withAlpha(INK, 0.7);
  collar();
}

function torsoAccent(s: PaintSurface): void {
  const { ctx, w, h } = s;
  ctx.save();
  blobPath(ctx, [
    [w * 0.22, h * 0.08],
    [w * 0.78, h * 0.08],
    [w * 0.9, h * 0.42],
    [w * 0.84, h * 0.92],
    [w * 0.16, h * 0.92],
    [w * 0.1, h * 0.42],
  ]);
  ctx.clip();
  // Button placket
  ctx.fillStyle = MASK.base;
  ctx.fillRect(w * 0.46, h * 0.14, w * 0.07, h * 0.78);
  // Two buttons
  ctx.fillStyle = MASK.hi;
  ellipsePath(ctx, w * 0.63, h * 0.32, 0.75, 0.75);
  ctx.fill();
  ellipsePath(ctx, w * 0.63, h * 0.56, 0.75, 0.75);
  ctx.fill();
  // Hem stripe
  ctx.fillStyle = MASK.shade;
  ctx.fillRect(0, h * 0.86, w, h * 0.07);
  ctx.restore();
}

function apron(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const path = () =>
    blobPath(ctx, [
      [w * 0.2, h * 0.06],
      [w * 0.8, h * 0.06],
      [w * 0.88, h * 0.5],
      [w * 0.8, h * 0.94],
      [w * 0.2, h * 0.94],
      [w * 0.12, h * 0.5],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: CLOTH.base,
    mid: CLOTH.mid,
    shade: CLOTH.deep,
  });
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = withAlpha(CLOTH.deep, 0.6);
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h * 0.62);
  ctx.lineTo(w * 0.84, h * 0.62);
  ctx.stroke();
  ctx.restore();
  stroke(ctx, path, KEYLINE);
}

function tail(s: PaintSurface, kind: 'scarf' | 'apron'): void {
  const { ctx, w, h } = s;
  const path = () =>
    blobPath(ctx, [
      [w * 0.5, h * 0.02],
      [w * 0.88, h * 0.3],
      [w * 0.62, h * 0.68],
      [w * 0.72, h * 0.96],
      [w * 0.26, h * 0.72],
      [w * 0.14, h * 0.28],
    ]);
  path();
  ctx.fillStyle =
    kind === 'scarf'
      ? verticalRamp(ctx, 0, h, { top: MASK.hi, mid: MASK.base, shade: MASK.shade })
      : verticalRamp(ctx, 0, h, { top: CLOTH.base, mid: CLOTH.mid, shade: CLOTH.deep });
  ctx.fill();
  stroke(ctx, path, KEYLINE * 0.85);
}

function scarf(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const path = () =>
    blobPath(ctx, [
      [w * 0.12, h * 0.24],
      [w * 0.5, h * 0.08],
      [w * 0.88, h * 0.26],
      [w * 0.8, h * 0.62],
      [w * 0.5, h * 0.92],
      [w * 0.2, h * 0.6],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: MASK.hi,
    mid: MASK.base,
    shade: MASK.shade,
  });
  ctx.fill();
  stroke(ctx, path, KEYLINE);
  // Knot
  ellipsePath(ctx, w * 0.5, h * 0.66, w * 0.14, h * 0.16);
  ctx.fillStyle = MASK.shade;
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Head, hair, toque, faces
// ---------------------------------------------------------------------------

/**
 * Neck.
 *
 * Cut-out rigs need an explicit piece here: the head and torso silhouettes are
 * both curve-inset from their boxes, so without it the chin and the collar leave
 * a visible seam whatever the offsets are.
 */
function neck(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const path = () => roundRectPath(ctx, w * 0.28, h * 0.06, w * 0.44, h * 0.9, w * 0.16);
  path();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: SKIN.shade,
    mid: SKIN.mid,
    shade: SKIN.base,
  });
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  // Contact shadow cast by the jaw.
  ctx.fillStyle = withAlpha('#8a4f2c', 0.45);
  ctx.fillRect(0, 0, w, h * 0.4);
  ctx.restore();
  stroke(ctx, path, KEYLINE * 0.8, INK, 0.7);
}

function head(s: PaintSurface, presentation: GenderPresentation): void {
  const { ctx, w, h } = s;
  const narrow = presentation === 'girl' ? 0.94 : 1;
  const path = () =>
    blobPath(ctx, [
      [w * 0.5, h * 0.05],
      [w * (0.5 + 0.42 * narrow), h * 0.3],
      [w * (0.5 + 0.4 * narrow), h * 0.66],
      [w * 0.5, h * 0.96],
      [w * (0.5 - 0.4 * narrow), h * 0.66],
      [w * (0.5 - 0.42 * narrow), h * 0.3],
    ]);
  path();
  ctx.fillStyle = verticalRamp(ctx, 0, h, {
    top: SKIN.base,
    mid: SKIN.base,
    shade: SKIN.mid,
  });
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  sheen(ctx, w * 0.34, h * 0.3, w * 0.26, h * 0.2, 0.5);
  // Ear
  ellipsePath(ctx, w * 0.86, h * 0.52, w * 0.07, h * 0.1);
  ctx.fillStyle = SKIN.mid;
  ctx.fill();
  ctx.restore();
  stroke(ctx, path, KEYLINE);
}

function hairFront(s: PaintSurface, presentation: GenderPresentation): void {
  const { ctx, w, h } = s;
  const spiky = presentation === 'boy';
  const pts: [number, number][] = spiky
    ? [
        [w * 0.5, h * 0.06],
        [w * 0.86, h * 0.2],
        [w * 0.92, h * 0.62],
        [w * 0.7, h * 0.5],
        [w * 0.56, h * 0.72],
        [w * 0.42, h * 0.48],
        [w * 0.24, h * 0.7],
        [w * 0.1, h * 0.42],
        [w * 0.16, h * 0.16],
      ]
    : [
        [w * 0.5, h * 0.06],
        [w * 0.84, h * 0.22],
        [w * 0.9, h * 0.66],
        [w * 0.66, h * 0.56],
        [w * 0.36, h * 0.62],
        [w * 0.12, h * 0.5],
        [w * 0.14, h * 0.18],
      ];
  const path = () => blobPath(ctx, pts, 0.62);
  path();
  ctx.fillStyle = verticalRamp(ctx, 0, h, { top: HAIR.hi, mid: HAIR.base, shade: HAIR.mid });
  ctx.fill();
  stroke(ctx, path, KEYLINE);
  ctx.save();
  path();
  ctx.clip();
  sheen(ctx, w * (presentation === 'girl' ? 0.36 : 0.4), h * 0.24, w * 0.24, h * 0.1, 0.32);
  ctx.restore();
}

function hairBack(s: PaintSurface, presentation: GenderPresentation): void {
  const { ctx, w, h } = s;
  ctx.save();
  if (presentation === 'girl') {
    // Twin tails - readable in side view, matching the reference sheet's Chef S.
    for (const [cx, cy, rx, ry, rot] of [
      [w * 0.42, h * 0.3, w * 0.3, h * 0.22, -0.3],
      [w * 0.5, h * 0.66, w * 0.34, h * 0.3, 0.2],
    ] as const) {
      ellipsePath(ctx, cx, cy, rx, ry, rot);
      ctx.fillStyle = verticalRamp(ctx, cy - ry, cy + ry, {
        top: HAIR.base,
        mid: HAIR.mid,
        shade: HAIR.mid,
      });
      ctx.fill();
      stroke(ctx, () => ellipsePath(ctx, cx, cy, rx, ry, rot), KEYLINE * 0.9);
    }
    // Tie band
    ellipsePath(ctx, w * 0.46, h * 0.44, w * 0.16, h * 0.05, 0.1);
    ctx.fillStyle = HAIR.hi;
    ctx.fill();
  } else {
    const path = () =>
      blobPath(ctx, [
        [w * 0.5, h * 0.04],
        [w * 0.86, h * 0.28],
        [w * 0.72, h * 0.62],
        [w * 0.5, h * 0.7],
        [w * 0.24, h * 0.56],
        [w * 0.14, h * 0.24],
      ]);
    path();
    ctx.fillStyle = verticalRamp(ctx, 0, h * 0.7, {
      top: HAIR.base,
      mid: HAIR.mid,
      shade: HAIR.mid,
    });
    ctx.fill();
    stroke(ctx, path, KEYLINE * 0.9);
    {
      // Cowlick tuft
      ctx.beginPath();
      ctx.moveTo(w * 0.66, h * 0.12);
      ctx.quadraticCurveTo(w * 0.98, h * 0.02, w * 0.86, h * 0.32);
      ctx.closePath();
      ctx.fillStyle = HAIR.base;
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Toque crown.
 *
 * The pivot sits at the bottom of the box (originY 0.95 in the rig), so the
 * drawn crown must fill 0.04-0.78 of the height and the hat's own base band
 * 0.72-0.94. Everything below that is bleed for the keyline.
 */
function toque(s: PaintSurface): void {
  const { ctx, w, h } = s;
  // Puffy crown: three overlapping lobes.
  const crown = () =>
    blobPath(
      ctx,
      [
        [w * 0.18, h * 0.62],
        [w * 0.13, h * 0.3],
        [w * 0.33, h * 0.08],
        [w * 0.5, h * 0.2],
        [w * 0.67, h * 0.06],
        [w * 0.87, h * 0.28],
        [w * 0.82, h * 0.62],
        [w * 0.5, h * 0.72],
      ],
      0.62,
    );
  crown();
  ctx.fillStyle = verticalRamp(ctx, 0, h * 0.78, {
    top: CLOTH.rim,
    mid: CLOTH.base,
    shade: CLOTH.mid,
  });
  ctx.fill();
  stroke(ctx, crown, KEYLINE);
  ctx.save();
  crown();
  ctx.clip();
  sheen(ctx, w * 0.33, h * 0.24, w * 0.2, h * 0.1, 0.65);
  ctx.strokeStyle = withAlpha(CLOTH.shade, 0.5);
  ctx.lineWidth = 0.5;
  for (const x of [0.36, 0.52, 0.68]) {
    ctx.beginPath();
    ctx.moveTo(w * x, h * 0.16);
    ctx.quadraticCurveTo(w * (x - 0.02), h * 0.44, w * x, h * 0.66);
    ctx.stroke();
  }
  ctx.restore();
  // White base band the accent stripe sits on top of.
  const band = () => roundRectPath(ctx, w * 0.19, h * 0.7, w * 0.62, h * 0.24, h * 0.09);
  band();
  ctx.fillStyle = verticalRamp(ctx, h * 0.7, h * 0.94, {
    top: CLOTH.base,
    mid: CLOTH.mid,
    shade: CLOTH.shade,
  });
  ctx.fill();
  stroke(ctx, band, KEYLINE);
}

function toqueBand(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const band = () => roundRectPath(ctx, w * 0.04, h * 0.22, w * 0.92, h * 0.56, h * 0.24);
  band();
  ctx.fillStyle = verticalRamp(ctx, h * 0.2, h * 0.8, {
    top: MASK.hi,
    mid: MASK.base,
    shade: MASK.shade,
  });
  ctx.fill();
}

/** Emblem backing disc. Base layer, so it stays white in both slot colours. */
function emblemDisc(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const r = Math.min(w, h) * 0.42;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha('#ffffff', 0.94);
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = withAlpha(INK, 0.45);
  ctx.stroke();
}

/**
 * Toque emblem letter. Drawn as vector letterforms rather than generated type,
 * painted into the accent mask so it takes the player-slot colour, and flagged
 * `counterFlip` in the rig so `S`/`P` stay readable facing either way.
 */
function emblem(s: PaintSurface, identity: ChefIdentity): void {
  const { ctx, w, h } = s;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const r = Math.min(w, h) * 0.42;

  ctx.fillStyle = MASK.base;
  ctx.strokeStyle = MASK.base;
  ctx.lineWidth = 1.35;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const u = r * 0.62;
  ctx.beginPath();
  if (identity === 'sal') {
    // S: two mirrored arcs
    ctx.moveTo(u * 0.85, -u * 0.7);
    ctx.bezierCurveTo(-u * 0.95, -u * 1.25, -u * 1.05, u * 0.12, u * 0.1, -u * 0.02);
    ctx.bezierCurveTo(u * 1.15, -u * 0.16, u * 0.95, u * 1.2, -u * 0.85, u * 0.72);
  } else {
    // P: stem plus bowl
    ctx.moveTo(-u * 0.55, u * 1.05);
    ctx.lineTo(-u * 0.55, -u * 1.05);
    ctx.lineTo(u * 0.15, -u * 1.05);
    ctx.bezierCurveTo(u * 1.15, -u * 1.05, u * 1.15, u * 0.12, u * 0.15, u * 0.12);
    ctx.lineTo(-u * 0.5, u * 0.12);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Faces - one sheet per identity/presentation/expression
// ---------------------------------------------------------------------------

interface EyeShape {
  readonly openness: number;
  readonly browAngle: number;
  readonly browLift: number;
  readonly mouth: 'smile' | 'open' | 'flat' | 'grit' | 'wide' | 'small';
  readonly pupilY: number;
  readonly blush: number;
}

const EXPRESSIONS: Readonly<Record<FaceExpression, EyeShape>> = Object.freeze({
  neutral: { openness: 1, browAngle: 0, browLift: 0, mouth: 'smile', pupilY: 0, blush: 0.25 },
  determined: { openness: 0.78, browAngle: -0.34, browLift: -0.6, mouth: 'grit', pupilY: 0.1, blush: 0.2 },
  happy: { openness: 0.62, browAngle: 0.12, browLift: -0.2, mouth: 'wide', pupilY: -0.1, blush: 0.45 },
  surprised: { openness: 1.25, browAngle: 0.3, browLift: -1.3, mouth: 'open', pupilY: -0.15, blush: 0.3 },
  hurt: { openness: 0.34, browAngle: 0.45, browLift: 0.4, mouth: 'small', pupilY: 0.2, blush: 0.5 },
  lookUp: { openness: 1.1, browAngle: 0.18, browLift: -1.1, mouth: 'open', pupilY: -0.55, blush: 0.28 },
});

function face(
  s: PaintSurface,
  presentation: GenderPresentation,
  expression: FaceExpression,
): void {
  const { ctx, w, h } = s;
  const e = EXPRESSIONS[expression];
  const lashes = presentation === 'girl';
  const eyeRx = 0.124 * w;
  const eyeRy = eyeRx * 1.18 * e.openness;

  const drawEye = (cx: number, scale: number): void => {
    const cy = h * 0.48;
    ellipsePath(ctx, cx, cy, eyeRx * scale, eyeRy);
    ctx.fillStyle = EYE.white;
    ctx.fill();
    stroke(ctx, () => ellipsePath(ctx, cx, cy, eyeRx * scale, eyeRy), 0.55, INK, 0.9);

    ctx.save();
    ellipsePath(ctx, cx, cy, eyeRx * scale, eyeRy);
    ctx.clip();
    const py = cy + eyeRy * e.pupilY;
    ellipsePath(ctx, cx, py, eyeRx * scale * 0.74, eyeRy * 0.82);
    ctx.fillStyle = EYE.iris;
    ctx.fill();
    ellipsePath(ctx, cx, py + eyeRy * 0.16, eyeRx * scale * 0.5, eyeRy * 0.5);
    ctx.fillStyle = EYE.irisHi;
    ctx.fill();
    ellipsePath(ctx, cx, py, eyeRx * scale * 0.4, eyeRy * 0.44);
    ctx.fillStyle = EYE.pupil;
    ctx.fill();
    ellipsePath(ctx, cx - eyeRx * scale * 0.3, py - eyeRy * 0.34, eyeRx * scale * 0.24, eyeRy * 0.22);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    if (lashes) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(cx - eyeRx * scale, cy - eyeRy * 0.75);
      ctx.quadraticCurveTo(cx, cy - eyeRy * 1.2, cx + eyeRx * scale, cy - eyeRy * 0.7);
      ctx.stroke();
    }
  };

  // Three-quarter view: far eye is compressed.
  drawEye(w * 0.3, 0.7);
  drawEye(w * 0.66, 1);

  // Brows
  ctx.strokeStyle = HAIR.mid;
  ctx.lineWidth = 0.95;
  ctx.lineCap = 'round';
  for (const [cx, dir, scale] of [
    [w * 0.3, -1, 0.7],
    [w * 0.66, 1, 1],
  ] as const) {
    const by = h * 0.48 - eyeRy - h * 0.09 + e.browLift * h * 0.045;
    ctx.beginPath();
    ctx.moveTo(cx - eyeRx * scale * 1.05, by + e.browAngle * h * 0.05 * dir * -1);
    ctx.quadraticCurveTo(cx, by - h * 0.03, cx + eyeRx * scale * 1.05, by + e.browAngle * h * 0.05 * dir);
    ctx.stroke();
  }

  // Blush
  if (e.blush > 0) {
    ctx.save();
    ctx.globalAlpha = e.blush * 0.55;
    sheen(ctx, w * 0.2, h * 0.66, w * 0.11, h * 0.06, 0.9, SKIN.blush);
    sheen(ctx, w * 0.78, h * 0.66, w * 0.11, h * 0.06, 0.9, SKIN.blush);
    ctx.restore();
  }

  // Mouth
  const mx = w * 0.5;
  const my = h * 0.79;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#93334a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  switch (e.mouth) {
    case 'smile':
      ctx.moveTo(mx - w * 0.11, my - h * 0.02);
      ctx.quadraticCurveTo(mx, my + h * 0.07, mx + w * 0.11, my - h * 0.02);
      ctx.stroke();
      break;
    case 'wide':
      ctx.moveTo(mx - w * 0.14, my - h * 0.03);
      ctx.quadraticCurveTo(mx, my + h * 0.13, mx + w * 0.14, my - h * 0.03);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'open':
      ellipsePath(ctx, mx, my + h * 0.02, w * 0.08, h * 0.07);
      ctx.fill();
      ctx.stroke();
      break;
    case 'grit':
      ctx.moveTo(mx - w * 0.12, my);
      ctx.lineTo(mx + w * 0.12, my);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - w * 0.06, my);
      ctx.lineTo(mx - w * 0.03, my + h * 0.04);
      ctx.moveTo(mx + w * 0.04, my);
      ctx.lineTo(mx + w * 0.07, my + h * 0.04);
      ctx.stroke();
      break;
    case 'small':
      ellipsePath(ctx, mx, my, w * 0.045, h * 0.035);
      ctx.fill();
      break;
    case 'flat':
    default:
      ctx.moveTo(mx - w * 0.09, my);
      ctx.lineTo(mx + w * 0.09, my);
      ctx.stroke();
      break;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function spatula(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  // Handle
  const handle = () => capsulePath(ctx, w * 0.04, cy, w * 0.4, h * 0.13);
  handle();
  ctx.fillStyle = verticalRamp(ctx, cy - h * 0.2, cy + h * 0.2, {
    top: '#4a5570',
    mid: '#2f3850',
    shade: '#1c2233',
  });
  ctx.fill();
  stroke(ctx, handle, 0.6);
  // Blade - brushed stainless
  const blade = () => roundRectPath(ctx, w * 0.48, cy - h * 0.34, w * 0.48, h * 0.68, h * 0.12);
  blade();
  ctx.fillStyle = verticalRamp(ctx, cy - h * 0.34, cy + h * 0.34, {
    top: '#e8eef8',
    mid: '#b6c2d6',
    shade: '#7d8aa3',
  });
  ctx.fill();
  ctx.save();
  blade();
  ctx.clip();
  ctx.strokeStyle = withAlpha('#7d8aa3', 0.7);
  ctx.lineWidth = 0.35;
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w * 0.52, cy - h * 0.34 + (h * 0.68 * i) / 4);
    ctx.lineTo(w * 0.94, cy - h * 0.34 + (h * 0.68 * i) / 4);
    ctx.stroke();
  }
  ctx.restore();
  stroke(ctx, blade, 0.7);
  sheen(ctx, w * 0.62, cy - h * 0.16, w * 0.12, h * 0.08, 0.8);
}

function whisk(s: PaintSurface): void {
  const { ctx, w, h } = s;
  const cy = h / 2;
  const handle = () => capsulePath(ctx, w * 0.04, cy, w * 0.36, h * 0.12);
  handle();
  ctx.fillStyle = '#2f3850';
  ctx.fill();
  stroke(ctx, handle, 0.6);
  ctx.strokeStyle = '#c6d1e4';
  ctx.lineWidth = 0.55;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w * 0.42, cy);
    ctx.quadraticCurveTo(w * 0.72, cy + i * h * 0.16, w * 0.96, cy + i * h * 0.05);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const IDENTITIES: readonly ChefIdentity[] = ['sal', 'pep'];
const PRESENTATIONS: readonly GenderPresentation[] = ['boy', 'girl'];
const EXPRESSION_KEYS = Object.keys(EXPRESSIONS) as FaceExpression[];

/** Every chef part, sized to match the pivots declared in `chefDoll.ts`. */
export function chefPartSpecs(): PartSpec[] {
  const specs: PartSpec[] = [
    { key: 'chef.torso', w: 22, h: 26, base: torso, accent: torsoAccent },
    { key: 'chef.neck', w: 12, h: 16, base: neck },
    { key: 'chef.apron', w: 20, h: 26, base: apron },
    { key: 'chef.apronTie', w: 8, h: 14, base: (s) => tail(s, 'apron'), accent: (s) => tail(s, 'apron') },
    { key: 'chef.scarf', w: 16, h: 10, base: () => undefined, accent: scarf },
    { key: 'chef.scarfTail', w: 10, h: 16, base: () => undefined, accent: (s) => tail(s, 'scarf') },

    { key: 'chef.armUpper', w: 13, h: 9, base: (s) => sleeve(s, false), accent: (s) => sleeveStripes(s, false) },
    { key: 'chef.armUpperFar', w: 13, h: 9, base: (s) => sleeve(s, true), accent: (s) => sleeveStripes(s, true) },
    { key: 'chef.armLower', w: 12, h: 8, base: (s) => forearm(s, false) },
    { key: 'chef.armLowerFar', w: 12, h: 8, base: (s) => forearm(s, true) },
    { key: 'chef.hand', w: 8, h: 8, base: (s) => hand(s, false) },
    { key: 'chef.handFar', w: 8, h: 8, base: (s) => hand(s, true) },

    { key: 'chef.legUpper', w: 14, h: 11, base: (s) => thigh(s, false), accent: (s) => trouserStripes(s, false, false) },
    { key: 'chef.legUpperFar', w: 14, h: 11, base: (s) => thigh(s, true), accent: (s) => trouserStripes(s, true, false) },
    { key: 'chef.legLower', w: 13, h: 10, base: (s) => thigh(s, false), accent: (s) => trouserStripes(s, false, true) },
    { key: 'chef.legLowerFar', w: 13, h: 10, base: (s) => thigh(s, true), accent: (s) => trouserStripes(s, true, true) },
    { key: 'chef.shoe', w: 14, h: 9, base: (s) => shoe(s, false), accent: (s) => shoeTrim(s, false) },
    { key: 'chef.shoeFar', w: 14, h: 9, base: (s) => shoe(s, true), accent: (s) => shoeTrim(s, true) },

    { key: 'chef.toque', w: 36, h: 30, base: toque },
    { key: 'chef.toqueBand', w: 26, h: 7, base: () => undefined, accent: toqueBand },

    { key: 'prop.spatula', w: 18, h: 8, base: spatula },
    { key: 'prop.whisk', w: 18, h: 8, base: whisk },
  ];

  for (const identity of IDENTITIES) {
    specs.push({
      key: `chef.emblem.${identity}`,
      w: 12,
      h: 12,
      base: emblemDisc,
      accent: (s) => emblem(s, identity),
    });
  }

  for (const presentation of PRESENTATIONS) {
    specs.push({
      key: `chef.head.${presentation}`,
      w: 22,
      h: 24,
      base: (s) => head(s, presentation),
    });
  }

  // Body art is keyed by presentation alone: Sal and Pep share it exactly, and
  // are told apart by the toque letter and the uniform accent colour.
  for (const presentation of PRESENTATIONS) {
    specs.push({
      key: `chef.hairFront.${presentation}`,
      w: 25,
      h: 14,
      base: (s) => hairFront(s, presentation),
    });
    specs.push({
      key: `chef.hairBack.${presentation}`,
      w: 24,
      h: 28,
      base: (s) => hairBack(s, presentation),
    });
    for (const expression of EXPRESSION_KEYS) {
      specs.push({
        key: `chef.face.${presentation}.${expression}`,
        w: 16,
        h: 14,
        base: (s) => face(s, presentation, expression),
      });
    }
  }

  return specs;
}

/** Soft ellipse the gameplay layer parents under each chef. */
export function chefShadowSpec(): PartSpec {
  return {
    key: 'chef.shadow',
    w: 26,
    h: 10,
    base: (s) => contactShadow(s.ctx, s.w / 2, s.h / 2, s.w / 2, s.h / 2, 0.42),
  };
}
