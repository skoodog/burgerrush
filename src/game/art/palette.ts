/**
 * Burger Rush palette.
 *
 * Derived from the supplied Burgervasion design sheet as *inspiration only* -
 * deep navy stage, warm amber UI, red/white striped chef uniforms, appetizing
 * food materials and cute-scary enemies with red threat eyes. No colour value,
 * lettering or composition is traced from any existing game.
 *
 * Values are CSS strings for the canvas painters and numbers for Phaser tints.
 */

export const INK = '#241a2b';
export const INK_SOFT = '#3a2c42';

/** Chef uniform - cream white cloth rather than pure white so rim light reads. */
export const CLOTH = {
  base: '#fdf8f0',
  mid: '#efe4d4',
  shade: '#d6c6b2',
  deep: '#b7a693',
  rim: '#ffffff',
} as const;

export const SKIN = {
  base: '#f6cda6',
  mid: '#e9b287',
  shade: '#cf9068',
  blush: '#ef9d8c',
} as const;

export const HAIR = {
  base: '#3b2721',
  mid: '#2c1c18',
  hi: '#5c3d31',
} as const;

export const EYE = {
  white: '#fffdf8',
  iris: '#7a4423',
  irisHi: '#c98a48',
  pupil: '#241a2b',
} as const;

/** Player-slot accents. The only colours that change between P1 and P2. */
export const ACCENT = {
  red: { base: '#e0392b', hi: '#ff6a52', shade: '#95201a' },
  blue: { base: '#2f6fe0', hi: '#63a2ff', shade: '#1b3f8f' },
  neutral: { base: '#9aa3b5', hi: '#c3cad8', shade: '#5d6577' },
} as const;

export type AccentName = keyof typeof ACCENT;

/** Cute-scary enemy palettes. Red threat eyes are shared across the roster. */
export const ENEMY = {
  threatEye: '#ff2f2f',
  threatEyeHi: '#ffb3b3',
  eggWhite: '#fffaf0',
  eggWhiteShade: '#e3d6bf',
  yolk: '#f7b52a',
  yolkHi: '#ffd76b',
  yolkShade: '#c47f10',
  sausage: '#a8442a',
  sausageHi: '#d4703f',
  sausageShade: '#6d2718',
  pickle: '#6f9c33',
  pickleHi: '#a8cd63',
  pickleShade: '#3f5f1c',
  onion: '#d99a45',
  onionHi: '#f3c67e',
  onionShade: '#93601f',
} as const;

/** Per-ingredient colour ramps (top highlight, mid, shade, edge). */
export const INGREDIENT_RAMPS = {
  bunTop: { top: '#f2c680', mid: '#dda059', shade: '#a96f2e', edge: '#8a561f' },
  bunBottom: { top: '#eaba71', mid: '#d3944e', shade: '#9f6528', edge: '#80501c' },
  lettuce: { top: '#a9d264', mid: '#7fb23e', shade: '#4f7b22', edge: '#3d5f19' },
  cheese: { top: '#ffd85e', mid: '#f5b81f', shade: '#c98a08', edge: '#9c6a05' },
  patty: { top: '#8a5334', mid: '#6b3c23', shade: '#472616', edge: '#331b0f' },
  tomato: { top: '#f26a5a', mid: '#d63f31', shade: '#9c2419', edge: '#761a12' },
  pickle: { top: '#a8cd63', mid: '#6f9c33', shade: '#456120', edge: '#334a17' },
  onion: { top: '#f3c67e', mid: '#d99a45', shade: '#93601f', edge: '#6f4816' },
} as const;

export type IngredientKind = keyof typeof INGREDIENT_RAMPS;

/** World / stage colours - the Midnight Diner set from the design sheet. */
export const WORLD = {
  skyTop: '#0a1024',
  skyBottom: '#151c3a',
  panel: '#111a35',
  panelEdge: '#26355f',
  steel: '#8e9bb5',
  steelHi: '#c6d1e4',
  steelShade: '#4a5570',
  ladder: '#c7862f',
  ladderHi: '#f0b95c',
  ladderShade: '#7c4f16',
  plate: '#e9eef7',
  plateShade: '#a7b3c9',
  neon: '#38d8ff',
  neonWarm: '#ff8a3d',
} as const;

/** UI colours - arcade gold on deep navy, matching the design sheet's chrome. */
export const UI = {
  gold: '#f5b731',
  goldHi: '#ffe08a',
  goldShade: '#a8760f',
  text: '#f4f1e8',
  textDim: '#9aa3b5',
  danger: '#ff4d4d',
  good: '#5ee08a',
  bgDeep: '#070c1c',
  bgPanel: '#111a35',
  frame: '#2b3a63',
} as const;

/** Boss condiment families. Shape coding carries the meaning; colour supports it. */
export const CONDIMENT = {
  pickle: { base: '#6f9c33', hi: '#b6dd76', shade: '#3f5f1c' },
  ketchup: { base: '#d63f31', hi: '#ff7b63', shade: '#8a1d13' },
  mustard: { base: '#f0b81c', hi: '#ffe07a', shade: '#a37806' },
  mayo: { base: '#f7f2e4', hi: '#ffffff', shade: '#bfb6a0' },
} as const;

export type CondimentFamily = keyof typeof CONDIMENT;

/** Phaser tint numbers mirroring the CSS strings above. */
export const TINT = {
  accentRed: 0xe0392b,
  accentBlue: 0x2f6fe0,
  gold: 0xf5b731,
  text: 0xf4f1e8,
  danger: 0xff4d4d,
  good: 0x5ee08a,
  bgDeep: 0x070c1c,
  panel: 0x111a35,
  frame: 0x2b3a63,
} as const;

export function cssToTint(css: string): number {
  return Number.parseInt(css.replace('#', ''), 16);
}
