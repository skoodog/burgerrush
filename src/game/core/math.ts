/**
 * Deterministic math helpers shared by the doll rig, simulation and procgen.
 *
 * Everything here is a pure function so it can be unit tested without a browser
 * and so simulation results stay identical between the game loop, the headless
 * validator and the replay verifier.
 */

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  return a === b ? 0 : (value - a) / (b - a);
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

/** Wraps an angle into (-PI, PI]. */
export function wrapAngle(angle: number): number {
  let a = (angle + Math.PI) % TAU;
  if (a <= 0) a += TAU;
  return a - Math.PI;
}

/** Shortest-path angular interpolation. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

export function sign(value: number): -1 | 0 | 1 {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

/** Rounds to a fixed number of decimals - used to keep fixtures readable. */
export function round(value: number, decimals = 4): number {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

export type EaseName =
  | 'linear'
  | 'step'
  | 'sineIn'
  | 'sineOut'
  | 'sineInOut'
  | 'quadIn'
  | 'quadOut'
  | 'quadInOut'
  | 'cubicIn'
  | 'cubicOut'
  | 'cubicInOut'
  | 'backOut'
  | 'elasticOut'
  | 'bounceOut';

export type EaseFn = (t: number) => number;

const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;
const ELASTIC_C4 = TAU / 3;

export const EASING: Readonly<Record<EaseName, EaseFn>> = Object.freeze({
  linear: (t) => t,
  step: (t) => (t >= 1 ? 1 : 0),
  sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  quadIn: (t) => t * t,
  quadOut: (t) => 1 - (1 - t) * (1 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => 1 - (1 - t) ** 3,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  backOut: (t) => 1 + BACK_C3 * (t - 1) ** 3 + BACK_C1 * (t - 1) ** 2,
  elasticOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_C4) + 1,
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t - 1.5 / d1) * (t - 1.5 / d1) + 0.75;
    if (t < 2.5 / d1) return n1 * (t - 2.25 / d1) * (t - 2.25 / d1) + 0.9375;
    return n1 * (t - 2.625 / d1) * (t - 2.625 / d1) + 0.984375;
  },
});

export function ease(name: EaseName, t: number): number {
  return EASING[name](clamp01(t));
}

// ---------------------------------------------------------------------------
// 2D affine matrix - the doll rig's transform primitive
// ---------------------------------------------------------------------------

/**
 * Column-major 2x3 affine matrix laid out as canvas/Phaser expect:
 *
 * ```
 * | a  c  tx |
 * | b  d  ty |
 * ```
 */
export interface Mat2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export function mat2dIdentity(out?: Mat2D): Mat2D {
  const m = out ?? ({} as Mat2D);
  m.a = 1;
  m.b = 0;
  m.c = 0;
  m.d = 1;
  m.tx = 0;
  m.ty = 0;
  return m;
}

export function mat2dCopy(src: Mat2D, out?: Mat2D): Mat2D {
  const m = out ?? ({} as Mat2D);
  m.a = src.a;
  m.b = src.b;
  m.c = src.c;
  m.d = src.d;
  m.tx = src.tx;
  m.ty = src.ty;
  return m;
}

/** Builds translate * rotate * scale into `out`. */
export function mat2dCompose(
  x: number,
  y: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
  out?: Mat2D,
): Mat2D {
  const m = out ?? ({} as Mat2D);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  m.a = cos * scaleX;
  m.b = sin * scaleX;
  m.c = -sin * scaleY;
  m.d = cos * scaleY;
  m.tx = x;
  m.ty = y;
  return m;
}

/** out = parent * child. Safe when `out` aliases either input. */
export function mat2dMultiply(parent: Mat2D, child: Mat2D, out?: Mat2D): Mat2D {
  const a = parent.a * child.a + parent.c * child.b;
  const b = parent.b * child.a + parent.d * child.b;
  const c = parent.a * child.c + parent.c * child.d;
  const d = parent.b * child.c + parent.d * child.d;
  const tx = parent.a * child.tx + parent.c * child.ty + parent.tx;
  const ty = parent.b * child.tx + parent.d * child.ty + parent.ty;
  const m = out ?? ({} as Mat2D);
  m.a = a;
  m.b = b;
  m.c = c;
  m.d = d;
  m.tx = tx;
  m.ty = ty;
  return m;
}

export function mat2dDeterminant(m: Mat2D): number {
  return m.a * m.d - m.b * m.c;
}

export function mat2dTransformPoint(
  m: Mat2D,
  x: number,
  y: number,
  out?: { x: number; y: number },
): { x: number; y: number } {
  const p = out ?? { x: 0, y: 0 };
  p.x = m.a * x + m.c * y + m.tx;
  p.y = m.b * x + m.d * y + m.ty;
  return p;
}

export interface DecomposedTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * QR decomposition of an affine matrix into the position/rotation/scale triple
 * a sprite renderer can consume. A mirrored matrix (negative determinant) comes
 * back as a negative `scaleY`, which every 2D renderer we target handles.
 */
export function mat2dDecompose(m: Mat2D, out?: DecomposedTransform): DecomposedTransform {
  const t = out ?? ({} as DecomposedTransform);
  t.x = m.tx;
  t.y = m.ty;
  const det = mat2dDeterminant(m);
  const r = Math.hypot(m.a, m.b);
  if (r > 1e-9) {
    t.rotation = Math.atan2(m.b, m.a);
    t.scaleX = r;
    t.scaleY = det / r;
    return t;
  }
  const s = Math.hypot(m.c, m.d);
  if (s > 1e-9) {
    t.rotation = Math.PI / 2 - Math.atan2(m.d, m.c);
    t.scaleX = det / s;
    t.scaleY = s;
    return t;
  }
  t.rotation = 0;
  t.scaleX = 0;
  t.scaleY = 0;
  return t;
}

// ---------------------------------------------------------------------------
// Critically damped spring - drives cloth trails and camera follow
// ---------------------------------------------------------------------------

export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * Semi-implicit Euler spring integration. Deterministic for a fixed `dt`, which
 * is why the rig only ever advances it from the fixed-step simulation.
 */
export function springStep(
  state: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): SpringState {
  const accel = (target - state.value) * stiffness - state.velocity * damping;
  state.velocity += accel * dt;
  state.value += state.velocity * dt;
  return state;
}
