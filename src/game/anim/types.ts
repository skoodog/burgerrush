/**
 * Doll-rig data model.
 *
 * A "doll" is a cut-out puppet: a bone hierarchy (`SkeletonDef`) plus a flat
 * list of drawable parts (`PartDef`) pinned to those bones. Every playable chef,
 * food enemy and boss in the game is one of these. Nothing here touches the
 * renderer or Phaser - the rig solves to plain transforms that any 2D backend
 * can consume, which is what makes it unit-testable in Node.
 */

import type { EaseName } from '../core/math';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export interface BoneDef {
  /** Unique within a skeleton. Clips and parts address bones by this name. */
  readonly name: string;
  /** Parent bone name, or null for the root. Parents must appear before children. */
  readonly parent: string | null;
  /** Bind-pose offset from the parent joint, in doll units (1 unit = 1 px at 1x). */
  readonly x: number;
  readonly y: number;
  /** Bind-pose rotation in radians. */
  readonly rotation: number;
  /** Visual bone length. Debug drawing only; never affects the solve. */
  readonly length?: number;
}

export interface SkeletonDef {
  readonly id: string;
  readonly bones: readonly BoneDef[];
  /** Bones whose world transform is published for gameplay/VFX attachment. */
  readonly sockets?: readonly string[];
}

// ---------------------------------------------------------------------------
// Parts (the cut-out pieces)
// ---------------------------------------------------------------------------

export interface PartDef {
  /** Unique within a doll. */
  readonly id: string;
  /** Bone this part is pinned to. */
  readonly bone: string;
  /**
   * Texture key, or a *slot* name when the part can be swapped at runtime
   * (faces, held items). Slots resolve through `DollSkin.slots`.
   */
  readonly texture: string;
  /** Draw order. Lower renders first (further back). */
  readonly z: number;
  /** Offset from the bone origin, in doll units. */
  readonly x: number;
  readonly y: number;
  /** Extra rotation on top of the bone, in radians. */
  readonly rotation: number;
  /** Normalised pivot inside the texture. */
  readonly originX: number;
  readonly originY: number;
  /** Part carries the player-slot accent (red/blue) and needs a tinted variant. */
  readonly accent?: boolean;
  /**
   * Keep this part readable when the doll faces left. Toque letters and HUD
   * emblems set this so `S`/`P` never render mirrored.
   */
  readonly counterFlip?: boolean;
  /** Hidden until a clip or the skin explicitly enables it (held props). */
  readonly hiddenByDefault?: boolean;
  /** Multiplies the solved alpha. */
  readonly alpha?: number;
}

export interface DollDef {
  readonly id: string;
  readonly skeleton: SkeletonDef;
  readonly parts: readonly PartDef[];
  /** Secondary-motion chains (toque tip, scarf tail, apron ties). */
  readonly cloth?: readonly ClothChainDef[];
  /** Doll-space bounds used for framing previews and debug boxes. */
  readonly bounds?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

// ---------------------------------------------------------------------------
// Pose
// ---------------------------------------------------------------------------

/** Animatable channels. `a` is alpha; `x`/`y` are additive to the bind offset. */
export type ChannelId = 'x' | 'y' | 'rot' | 'sx' | 'sy' | 'a';

export const CHANNEL_IDS: readonly ChannelId[] = ['x', 'y', 'rot', 'sx', 'sy', 'a'];

/** Identity values per channel - what an unanimated bone resolves to. */
export const CHANNEL_DEFAULTS: Readonly<Record<ChannelId, number>> = Object.freeze({
  x: 0,
  y: 0,
  rot: 0,
  sx: 1,
  sy: 1,
  a: 1,
});

/**
 * A pose is a dense set of per-bone channel deltas, stored as parallel typed
 * arrays indexed by bone index. Dense + typed keeps sampling and blending
 * allocation-free in the hot loop.
 */
export interface Pose {
  readonly boneCount: number;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly rot: Float64Array;
  readonly sx: Float64Array;
  readonly sy: Float64Array;
  readonly a: Float64Array;
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------

export interface Keyframe {
  /** Time in seconds from clip start. */
  readonly t: number;
  readonly v: number;
  /** Easing applied on the segment *leaving* this key. */
  readonly ease: EaseName;
}

export interface Track {
  readonly bone: string;
  readonly channel: ChannelId;
  readonly keys: readonly Keyframe[];
}

/**
 * A clip event. `name` is matched by the doll's event listeners - footsteps,
 * spatula releases, dust puffs, hit-stop, audio cues.
 */
export interface ClipEvent {
  readonly t: number;
  readonly name: string;
  readonly value?: string | number;
}

export type ClipLoopMode = 'loop' | 'once' | 'hold' | 'pingpong';

export interface Clip {
  readonly id: string;
  readonly duration: number;
  readonly loop: ClipLoopMode;
  readonly tracks: readonly Track[];
  readonly events: readonly ClipEvent[];
  /**
   * Additive clips are layered on top of a base pose rather than replacing it.
   * The boss-warning look-up and the flight-fire recoil are additive.
   */
  readonly additive: boolean;
  /** Slot overrides applied while this clip is the dominant state. */
  readonly slots?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Secondary motion
// ---------------------------------------------------------------------------

export interface ClothChainDef {
  /** Bone driven by the spring. Usually a leaf: toque tip, scarf tail, apron tie. */
  readonly bone: string;
  /** Spring constant. Higher = stiffer, snappier. */
  readonly stiffness: number;
  /** Velocity damping. Higher = settles sooner. */
  readonly damping: number;
  /** Radians of droop under gravity when the doll is at rest. */
  readonly gravity: number;
  /** How strongly horizontal doll velocity drags the tip back, rad per unit/s. */
  readonly drag: number;
  /** How strongly vertical doll velocity lifts the tip, rad per unit/s. */
  readonly lift: number;
  /** Hard clamp on the resulting angle, radians. */
  readonly maxAngle: number;
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Blackboard the animation state machine reads. Gameplay writes it once per
 * fixed step; the state machine never reads gameplay objects directly, so any
 * entity (player chef, wing partner, replay ghost, attract-mode bot) can drive
 * the same rig.
 */
export interface AnimContext {
  /** Signed horizontal speed in world units/second. */
  velocityX: number;
  velocityY: number;
  /** Absolute horizontal speed normalised against the chef's max run speed. */
  runBlend: number;
  grounded: boolean;
  onLadder: boolean;
  climbing: boolean;
  /** Player-intent axis, -1..1, before physics. Drives skid/pivot detection. */
  inputX: number;
  inputY: number;
  facing: 1 | -1;
  /** Set for a single step when the corresponding event fires. */
  triggers: Set<string>;
  /** Latched gameplay states. */
  flags: Set<string>;
  /** Seconds since the current gameplay state began. */
  stateTime: number;
}

export interface AnimStateDef {
  readonly id: string;
  readonly clip: string;
  /** Playback rate; a function lets `run` scale with actual speed. */
  readonly speed?: number | ((ctx: AnimContext) => number);
  /** Additive clips layered while this state is active. */
  readonly layers?: readonly AnimLayerDef[];
  /** Slot overrides while active (e.g. `hand` -> `spatula`). */
  readonly slots?: Readonly<Record<string, string>>;
}

export interface AnimLayerDef {
  readonly clip: string;
  /** 0..1 static weight, or computed from context each step. */
  readonly weight?: number | ((ctx: AnimContext) => number);
}

export interface AnimTransitionDef {
  /** Source state id, or `'*'` for an any-state transition. */
  readonly from: string | '*';
  readonly to: string;
  /** Crossfade duration in seconds. */
  readonly duration: number;
  /** Guard. Evaluated in declaration order; the first match wins. */
  readonly when: (ctx: AnimContext) => boolean;
  /**
   * Minimum normalised progress through the current clip before this may fire.
   * Keeps one-shots (throw, hit) from being cut off mid-swing.
   */
  readonly exitTime?: number;
  /** Higher priority is evaluated first regardless of declaration order. */
  readonly priority?: number;
}

export interface AnimGraphDef {
  readonly id: string;
  readonly initial: string;
  readonly states: readonly AnimStateDef[];
  readonly transitions: readonly AnimTransitionDef[];
}

// ---------------------------------------------------------------------------
// Solved output
// ---------------------------------------------------------------------------

export interface SolvedPart {
  readonly partId: string;
  /** Texture key after slot resolution. */
  texture: string;
  visible: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  z: number;
  accent: boolean;
}
