/**
 * DollRig - the runtime puppet.
 *
 * Owns a skeleton, an animator, secondary-motion springs and the solved part
 * list. One rig instance drives exactly one on-screen doll. Everything is
 * renderer-agnostic: `solvedParts` is a plain array a view layer copies onto
 * sprites.
 */

import {
  clamp,
  mat2dCompose,
  mat2dDeterminant,
  mat2dDecompose,
  mat2dIdentity,
  mat2dMultiply,
  springStep,
  type DecomposedTransform,
  type Mat2D,
  type SpringState,
} from '../core/math';
import { Animator, createAnimContext } from './animator';
import type { BoundClip } from './clip';
import { Skeleton } from './skeleton';
import type {
  AnimContext,
  AnimGraphDef,
  ClothChainDef,
  DollDef,
  PartDef,
  SolvedPart,
} from './types';

export interface DollSkin {
  readonly id: string;
  /**
   * Texture key resolution. A part's `texture` field is looked up here first,
   * which is how one shared skeleton renders Sal Boy, Sal Girl, Pep Boy and
   * Pep Girl from the same clip library.
   */
  readonly textures: Readonly<Record<string, string>>;
  /** Default slot contents (face expression, held prop). */
  readonly slots?: Readonly<Record<string, string>>;
  /** Player-slot accent applied to parts flagged `accent`. */
  readonly accent?: 'red' | 'blue' | 'neutral';
}

export interface DollRigOptions {
  readonly def: DollDef;
  readonly graph: AnimGraphDef;
  readonly clips: ReadonlyMap<string, BoundClip>;
  readonly skin: DollSkin;
  /** Uniform scale applied to the whole puppet. */
  readonly scale?: number;
}

interface ClothState {
  readonly def: ClothChainDef;
  readonly boneIndex: number;
  readonly spring: SpringState;
}

export class DollRig {
  readonly def: DollDef;
  readonly skeleton: Skeleton;
  readonly animator: Animator;
  readonly context: AnimContext = createAnimContext();
  readonly solvedParts: SolvedPart[];

  /** World placement, written by the owning entity each step. */
  x = 0;
  y = 0;
  scale: number;
  facing: 1 | -1 = 1;

  private skin: DollSkin;
  private readonly parts: readonly PartDef[];
  private readonly partBoneIndex: Int32Array;
  private readonly partMatrix: Mat2D[];
  private readonly localMatrix: Mat2D[];
  private readonly decomposed: DecomposedTransform[];
  private readonly rootMatrix: Mat2D = mat2dIdentity();
  private readonly cloth: ClothState[];
  private prevX = 0;
  private prevY = 0;
  private smoothedVelX = 0;
  private smoothedVelY = 0;

  constructor(options: DollRigOptions) {
    this.def = options.def;
    this.skin = options.skin;
    this.scale = options.scale ?? 1;
    this.skeleton = new Skeleton(options.def.skeleton);
    this.animator = new Animator(this.skeleton, options.graph, options.clips);

    this.parts = [...options.def.parts].sort((a, b) => a.z - b.z);
    this.partBoneIndex = new Int32Array(this.parts.length);
    this.partMatrix = this.parts.map(() => mat2dIdentity());
    this.localMatrix = this.parts.map(() => mat2dIdentity());
    this.decomposed = this.parts.map(() => ({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }));

    this.parts.forEach((part, i) => {
      this.partBoneIndex[i] = this.skeleton.indexOf(part.bone);
      mat2dCompose(part.x, part.y, part.rotation, 1, 1, this.localMatrix[i] as Mat2D);
    });

    this.solvedParts = this.parts.map((part) => ({
      partId: part.id,
      texture: part.texture,
      visible: !part.hiddenByDefault,
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: part.alpha ?? 1,
      z: part.z,
      accent: part.accent ?? false,
    }));

    this.cloth = (options.def.cloth ?? [])
      .filter((c) => this.skeleton.hasBone(c.bone))
      .map((c) => ({
        def: c,
        boneIndex: this.skeleton.indexOf(c.bone),
        spring: { value: c.gravity, velocity: 0 },
      }));

    if (options.skin.slots) {
      for (const [slot, texture] of Object.entries(options.skin.slots)) {
        this.animator.setSlot(slot, texture);
      }
    }
  }

  get accent(): 'red' | 'blue' | 'neutral' {
    return this.skin.accent ?? 'neutral';
  }

  /**
   * Swaps the visual skin without touching the skeleton, clip library, state
   * machine or physics. This is the Boy/Girl selector and the identity swap:
   * both are pure skin changes by contract.
   */
  setSkin(skin: DollSkin): void {
    this.skin = skin;
    if (skin.slots) {
      for (const [slot, texture] of Object.entries(skin.slots)) this.animator.setSlot(slot, texture);
    }
  }

  getSkin(): DollSkin {
    return this.skin;
  }

  /** Seeds the smoothing filters so a freshly placed doll does not lurch. */
  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.smoothedVelX = 0;
    this.smoothedVelY = 0;
    for (const c of this.cloth) {
      c.spring.value = c.def.gravity;
      c.spring.velocity = 0;
    }
  }

  /**
   * Fixed-step update. Advances the animator, integrates cloth springs and
   * re-solves every part transform.
   */
  update(dt: number): void {
    if (dt > 0) {
      const invDt = 1 / dt;
      const rawVelX = (this.x - this.prevX) * invDt;
      const rawVelY = (this.y - this.prevY) * invDt;
      // Light smoothing keeps cloth from snapping on teleports/respawns.
      const k = clamp(dt * 14, 0, 1);
      this.smoothedVelX += (rawVelX - this.smoothedVelX) * k;
      this.smoothedVelY += (rawVelY - this.smoothedVelY) * k;
      this.prevX = this.x;
      this.prevY = this.y;
    }

    this.context.facing = this.facing;
    this.animator.update(dt, this.context);
    this.updateCloth(dt);
    this.solve();
  }

  /** World position of a bone-local point, for muzzle flashes and dust puffs. */
  socket(bone: string, x = 0, y = 0): { x: number; y: number } {
    return this.skeleton.worldPoint(bone, x, y);
  }

  private updateCloth(dt: number): void {
    if (this.cloth.length === 0 || dt <= 0) return;
    const pose = this.animator.pose;
    // Cloth trails opposite to travel; facing is folded in so a left-facing doll
    // trails to the right in doll space.
    const velX = this.smoothedVelX * this.facing;
    const velY = this.smoothedVelY;
    for (const c of this.cloth) {
      const { def, spring } = c;
      const target = clamp(
        def.gravity + velX * def.drag + velY * def.lift,
        -def.maxAngle,
        def.maxAngle,
      );
      springStep(spring, target, def.stiffness, def.damping, dt);
      spring.value = clamp(spring.value, -def.maxAngle * 1.35, def.maxAngle * 1.35);
      pose.rot[c.boneIndex] = (pose.rot[c.boneIndex] as number) + spring.value;
    }
  }

  private solve(): void {
    const sx = this.scale * this.facing;
    mat2dCompose(this.x, this.y, 0, sx, this.scale, this.rootMatrix);
    this.skeleton.solve(this.animator.pose, this.rootMatrix);

    const slots = this.animator.slots;
    for (let i = 0; i < this.parts.length; i += 1) {
      const part = this.parts[i] as PartDef;
      const out = this.solvedParts[i] as SolvedPart;

      const resolved = resolveTexture(part.texture, slots, this.skin);
      out.texture = resolved ?? part.texture;
      out.visible = resolved !== null && resolved !== HIDDEN_TEXTURE;

      const boneIndex = this.partBoneIndex[i] as number;
      const world = this.skeleton.world[boneIndex] as Mat2D;
      const m = mat2dMultiply(world, this.localMatrix[i] as Mat2D, this.partMatrix[i] as Mat2D);

      if (part.counterFlip && mat2dDeterminant(m) < 0) {
        // Un-mirror lettering: negate the x basis in place.
        m.a = -m.a;
        m.b = -m.b;
      }

      const d = mat2dDecompose(m, this.decomposed[i] as DecomposedTransform);
      out.x = d.x;
      out.y = d.y;
      out.rotation = d.rotation;
      out.scaleX = d.scaleX;
      out.scaleY = d.scaleY;
      out.alpha = (part.alpha ?? 1) * (this.skeleton.worldAlpha[boneIndex] as number);
      if (out.alpha <= 0.001) out.visible = false;
    }
  }
}

/** Sentinel a slot can hold to hide its part entirely. */
export const HIDDEN_TEXTURE = '__none__';

/**
 * Resolution order for a part's texture:
 * 1. runtime slot override (face expression, held prop),
 * 2. skin texture map (variant-specific hair, face, emblem),
 * 3. the literal key authored on the part.
 *
 * Returns `null` when the part should be hidden.
 */
function resolveTexture(
  key: string,
  slots: ReadonlyMap<string, string>,
  skin: DollSkin,
): string | null {
  const fromSlot = slots.get(key);
  if (fromSlot !== undefined) {
    if (fromSlot === HIDDEN_TEXTURE) return null;
    return skin.textures[fromSlot] ?? fromSlot;
  }
  const fromSkin = skin.textures[key];
  if (fromSkin !== undefined) return fromSkin === HIDDEN_TEXTURE ? null : fromSkin;
  return key;
}
