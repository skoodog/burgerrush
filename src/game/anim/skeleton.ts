/**
 * Skeleton: bone hierarchy + world-transform solve.
 *
 * Bones are stored flat and topologically ordered at construction so the solve
 * is a single forward pass with no recursion and no allocation.
 */

import {
  mat2dCompose,
  mat2dCopy,
  mat2dIdentity,
  mat2dMultiply,
  mat2dTransformPoint,
  type Mat2D,
} from '../core/math';
import { CHANNEL_DEFAULTS, type BoneDef, type Pose, type SkeletonDef } from './types';

export function createPose(boneCount: number): Pose {
  return {
    boneCount,
    x: new Float64Array(boneCount),
    y: new Float64Array(boneCount),
    rot: new Float64Array(boneCount),
    sx: new Float64Array(boneCount).fill(1),
    sy: new Float64Array(boneCount).fill(1),
    a: new Float64Array(boneCount).fill(1),
  };
}

export function resetPose(pose: Pose): Pose {
  pose.x.fill(CHANNEL_DEFAULTS.x);
  pose.y.fill(CHANNEL_DEFAULTS.y);
  pose.rot.fill(CHANNEL_DEFAULTS.rot);
  pose.sx.fill(CHANNEL_DEFAULTS.sx);
  pose.sy.fill(CHANNEL_DEFAULTS.sy);
  pose.a.fill(CHANNEL_DEFAULTS.a);
  return pose;
}

export function copyPose(src: Pose, dst: Pose): Pose {
  dst.x.set(src.x);
  dst.y.set(src.y);
  dst.rot.set(src.rot);
  dst.sx.set(src.sx);
  dst.sy.set(src.sy);
  dst.a.set(src.a);
  return dst;
}

export class Skeleton {
  readonly def: SkeletonDef;
  readonly bones: readonly BoneDef[];
  readonly boneIndex: ReadonlyMap<string, number>;
  readonly parentIndex: Int32Array;

  /** World matrices, one per bone, refreshed by `solve()`. */
  readonly world: Mat2D[];
  /** Accumulated alpha per bone (bone alpha multiplied down the chain). */
  readonly worldAlpha: Float64Array;

  private readonly local: Mat2D[];

  constructor(def: SkeletonDef) {
    this.def = def;
    const ordered = topologicalOrder(def.bones);
    this.bones = ordered;

    const index = new Map<string, number>();
    ordered.forEach((bone, i) => index.set(bone.name, i));
    this.boneIndex = index;

    this.parentIndex = new Int32Array(ordered.length);
    ordered.forEach((bone, i) => {
      this.parentIndex[i] = bone.parent === null ? -1 : (index.get(bone.parent) ?? -1);
    });

    this.world = ordered.map(() => mat2dIdentity());
    this.local = ordered.map(() => mat2dIdentity());
    this.worldAlpha = new Float64Array(ordered.length).fill(1);
  }

  get boneCount(): number {
    return this.bones.length;
  }

  indexOf(bone: string): number {
    const i = this.boneIndex.get(bone);
    if (i === undefined) {
      throw new Error(`Skeleton "${this.def.id}" has no bone named "${bone}"`);
    }
    return i;
  }

  hasBone(bone: string): boolean {
    return this.boneIndex.has(bone);
  }

  createPose(): Pose {
    return createPose(this.boneCount);
  }

  /**
   * Resolves every bone's world transform from `pose`.
   *
   * `root` is the doll's placement in world space. Passing a mirrored matrix
   * (negative x scale) is how facing is implemented: the whole puppet flips and
   * parts flagged `counterFlip` un-mirror themselves at draw time.
   */
  solve(pose: Pose, root: Mat2D): void {
    const { bones, parentIndex, world, local, worldAlpha } = this;
    for (let i = 0; i < bones.length; i += 1) {
      const bone = bones[i] as BoneDef;
      const l = local[i] as Mat2D;
      mat2dCompose(
        bone.x + (pose.x[i] as number),
        bone.y + (pose.y[i] as number),
        bone.rotation + (pose.rot[i] as number),
        pose.sx[i] as number,
        pose.sy[i] as number,
        l,
      );
      const p = parentIndex[i] as number;
      const w = world[i] as Mat2D;
      if (p < 0) {
        mat2dMultiply(root, l, w);
        worldAlpha[i] = pose.a[i] as number;
      } else {
        mat2dMultiply(world[p] as Mat2D, l, w);
        worldAlpha[i] = (worldAlpha[p] as number) * (pose.a[i] as number);
      }
    }
  }

  /** World matrix of a named bone. Only valid after `solve()`. */
  worldOf(bone: string, out?: Mat2D): Mat2D {
    return mat2dCopy(this.world[this.indexOf(bone)] as Mat2D, out);
  }

  /** World position of a point in a bone's local space - VFX attachment points. */
  worldPoint(bone: string, x = 0, y = 0, out?: { x: number; y: number }): { x: number; y: number } {
    return mat2dTransformPoint(this.world[this.indexOf(bone)] as Mat2D, x, y, out);
  }
}

/**
 * Orders bones parents-first and rejects cycles / missing parents. Authors get
 * to declare bones in whatever order reads best in the rig file.
 */
export function topologicalOrder(bones: readonly BoneDef[]): BoneDef[] {
  const byName = new Map<string, BoneDef>();
  for (const bone of bones) {
    if (byName.has(bone.name)) throw new Error(`Duplicate bone name "${bone.name}"`);
    byName.set(bone.name, bone);
  }

  const ordered: BoneDef[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (bone: BoneDef, trail: string[]): void => {
    const s = state.get(bone.name);
    if (s === 'done') return;
    if (s === 'visiting') {
      throw new Error(`Bone cycle detected: ${[...trail, bone.name].join(' -> ')}`);
    }
    state.set(bone.name, 'visiting');
    if (bone.parent !== null) {
      const parent = byName.get(bone.parent);
      if (!parent) {
        throw new Error(`Bone "${bone.name}" references unknown parent "${bone.parent}"`);
      }
      visit(parent, [...trail, bone.name]);
    }
    state.set(bone.name, 'done');
    ordered.push(bone);
  };

  for (const bone of bones) visit(bone, []);
  return ordered;
}
