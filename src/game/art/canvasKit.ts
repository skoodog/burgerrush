/**
 * Canvas painting toolkit for the procedural placeholder art.
 *
 * The build must be complete and playable with no external generation, so every
 * doll part, enemy, ingredient, prop and UI chip is drawn here with vector
 * canvas calls. When final source art arrives it drops in behind the same
 * texture keys (art bible: "keep placeholders behind identical IDs").
 *
 * Style targets from the design sheet: soft rounded volumes, a warm dark
 * keyline, a top-left key light with a cool rim on the opposite edge, and
 * silhouettes that survive downsampling.
 */

import { INK } from './palette';

/** Painter resolution: canvas pixels per doll unit. */
export const RES = 4;

/** Extra pixels of bleed so keylines and rim light are never clipped. */
export const PAD = 3;

export interface PaintSurface {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Logical size in doll units. */
  readonly w: number;
  readonly h: number;
}

export function createSurface(w: number, h: number): PaintSurface {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * RES) + PAD * 2;
  canvas.height = Math.ceil(h * RES) + PAD * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.setTransform(RES, 0, 0, RES, PAD, PAD);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { canvas, ctx, w, h };
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export type Pt = readonly [number, number];

/** Closed Catmull-Rom-ish blob through the given points. Gives organic shapes. */
export function blobPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], tension = 0.5): void {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let prev = pts[n - 1] as Pt;
  let start = mid(prev, pts[0] as Pt);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i += 1) {
    const cur = pts[i] as Pt;
    const next = pts[(i + 1) % n] as Pt;
    const end = mid(cur, next);
    const cx = cur[0] + (cur[0] - (prev[0] + next[0]) / 2) * (tension - 0.5) * 0.6;
    const cy = cur[1] + (cur[1] - (prev[1] + next[1]) / 2) * (tension - 0.5) * 0.6;
    ctx.quadraticCurveTo(cx, cy, end[0], end[1]);
    prev = cur;
    start = end;
  }
  ctx.closePath();
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Horizontal capsule - the limb primitive. */
export function capsulePath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  r0: number,
  r1 = r0,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r0, Math.PI / 2, (Math.PI * 3) / 2);
  ctx.lineTo(x + len, y - r1);
  ctx.arc(x + len, y, r1, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x, y + r0);
  ctx.closePath();
}

export function ellipsePath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Fills
// ---------------------------------------------------------------------------

export interface Ramp {
  readonly top: string;
  readonly mid: string;
  readonly shade: string;
  readonly edge?: string;
}

/** Vertical three-stop gradient - the default material shading. */
export function verticalRamp(
  ctx: CanvasRenderingContext2D,
  y0: number,
  y1: number,
  ramp: Ramp,
): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, ramp.top);
  g.addColorStop(0.52, ramp.mid);
  g.addColorStop(1, ramp.shade);
  return g;
}

/** Diagonal key light from the upper left, matching the reference lighting rig. */
export function keyLightRamp(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ramp: Ramp,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, ramp.top);
  g.addColorStop(0.55, ramp.mid);
  g.addColorStop(1, ramp.shade);
  return g;
}

export function fillWithRamp(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  ramp: Ramp,
  y0: number,
  y1: number,
): void {
  path();
  ctx.fillStyle = verticalRamp(ctx, y0, y1, ramp);
  ctx.fill();
}

/** Warm keyline. Width is in doll units so it scales with RES. */
export function stroke(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  width = 0.9,
  color = INK,
  alpha = 1,
): void {
  path();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

/** Soft specular blob used for rim light and material sheen. */
export function sheen(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  strength = 0.55,
  color = '#ffffff',
  rotation = 0,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, withAlpha(color, strength));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Contact shadow beneath a form. */
export function contactShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  strength = 0.3,
): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, `rgba(10,6,16,${strength})`);
  g.addColorStop(1, 'rgba(10,6,16,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

// ---------------------------------------------------------------------------
// Accent mask compositing
// ---------------------------------------------------------------------------

/**
 * Colourises a grayscale accent mask and returns a new canvas.
 *
 * The mask is painted once in neutral grays with its own shading, then
 * multiplied by the slot colour. Because base and accent come from the same
 * source geometry, the red and blue exports are pixel-aligned by construction -
 * exactly what docs/ART_AND_AUDIO_PROMPTS.md asks the accent pipeline to
 * guarantee.
 */
export function tintMask(mask: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = mask.width;
  out.height = mask.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/** Flattens a base layer plus an optional tinted accent mask into one canvas. */
export function compositeAccent(
  base: HTMLCanvasElement,
  mask: HTMLCanvasElement | null,
  color: string | null,
): HTMLCanvasElement {
  if (!mask || !color) return base;
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(base, 0, 0);
  ctx.drawImage(tintMask(mask, color), 0, 0);
  return out;
}

/** Repeated stripe band used for the chef's trousers and sleeve trim. */
export function stripeBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stripeWidth: number,
  angle = 0,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  const span = Math.hypot(w, h);
  for (let i = -span; i < span; i += stripeWidth * 2) {
    ctx.fillRect(i, -span / 2, stripeWidth, span);
  }
  ctx.restore();
}
