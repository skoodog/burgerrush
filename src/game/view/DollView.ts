/**
 * Phaser binding for a DollRig.
 *
 * This is the only file that knows both about the rig and about Phaser. It
 * creates one Image per part, keeps them in the rig's draw order, and copies the
 * solved transforms across each render frame. The rig itself never touches the
 * renderer, which is what keeps it unit-testable in Node and reusable for the
 * headless replay verifier.
 */

import type Phaser from 'phaser';
import { ART_RES, logicalSize, paddedOrigin } from '../art/atlas';
import type { DollRig } from '../anim/dollRig';
import type { PartDef, SolvedPart } from '../anim/types';

export interface DollViewOptions {
  /** Draws bone axes and part boxes over the doll. */
  debug?: boolean;
  /** Optional soft contact shadow parented beneath the doll. */
  shadow?: boolean;
}

export class DollView {
  readonly container: Phaser.GameObjects.Container;
  readonly rig: DollRig;

  private readonly scene: Phaser.Scene;
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly partDefs: PartDef[] = [];
  private readonly appliedTexture: string[] = [];
  private shadowImage: Phaser.GameObjects.Image | null = null;
  private debugGfx: Phaser.GameObjects.Graphics | null = null;
  private missingTextures = new Set<string>();

  constructor(scene: Phaser.Scene, rig: DollRig, options: DollViewOptions = {}) {
    this.scene = scene;
    this.rig = rig;
    this.container = scene.add.container(0, 0);

    if (options.shadow) {
      this.shadowImage = scene.add.image(0, 0, 'chef.shadow');
      this.shadowImage.setOrigin(0.5, 0.5);
      this.container.add(this.shadowImage);
    }

    // Parts are already draw-order sorted inside the rig.
    const byId = new Map(rig.def.parts.map((p) => [p.id, p]));
    for (const solved of rig.solvedParts) {
      const def = byId.get(solved.partId);
      if (!def) continue;
      const image = scene.add.image(0, 0, this.resolveKey(solved));
      image.setVisible(false);
      this.container.add(image);
      this.images.push(image);
      this.partDefs.push(def);
      this.appliedTexture.push('');
    }

    if (options.debug) {
      this.debugGfx = scene.add.graphics();
      this.container.add(this.debugGfx);
    }
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  setAlpha(alpha: number): this {
    this.container.setAlpha(alpha);
    return this;
  }

  /** Tints every part - used for hit flashes and the invulnerability blink. */
  setTint(color: number | null): this {
    for (const image of this.images) {
      if (color === null) image.clearTint();
      else image.setTint(color);
    }
    return this;
  }

  /**
   * Pushes the rig's solved transforms onto the sprites.
   *
   * Called from `render`, not from the fixed step, so interpolated camera work
   * and the simulation stay decoupled.
   */
  sync(): void {
    const rig = this.rig;
    for (let i = 0; i < this.images.length; i += 1) {
      const image = this.images[i] as Phaser.GameObjects.Image;
      const solved = rig.solvedParts[i] as SolvedPart;
      if (!solved.visible) {
        image.setVisible(false);
        continue;
      }
      const key = this.resolveKey(solved);
      if (this.appliedTexture[i] !== key) {
        if (this.scene.textures.exists(key)) {
          image.setTexture(key);
          this.appliedTexture[i] = key;
          this.applyOrigin(i, key);
        } else if (!this.missingTextures.has(key)) {
          this.missingTextures.add(key);
          console.warn(`[DollView] missing texture "${key}" for part "${solved.partId}"`);
        }
      }
      image.setVisible(true);
      image.setPosition(solved.x, solved.y);
      image.setRotation(solved.rotation);
      image.setScale(solved.scaleX / ART_RES, solved.scaleY / ART_RES);
      image.setAlpha(solved.alpha);
    }

    if (this.shadowImage) {
      // Shadow stays flat on the ground and shrinks with altitude.
      this.shadowImage.setPosition(rig.x, rig.y);
      const lift = Math.min(1, Math.abs(rig.animator.pose.y[0] ?? 0) / 40);
      this.shadowImage.setScale((rig.scale / ART_RES) * (1 - lift * 0.35));
      this.shadowImage.setAlpha(0.5 * (1 - lift * 0.5));
    }

    if (this.debugGfx) this.drawDebug();
  }

  destroy(): void {
    for (const image of this.images) image.destroy();
    this.images.length = 0;
    this.shadowImage?.destroy();
    this.debugGfx?.destroy();
    this.container.destroy();
  }

  private resolveKey(solved: SolvedPart): string {
    return solved.texture;
  }

  private applyOrigin(index: number, key: string): void {
    const def = this.partDefs[index] as PartDef;
    const image = this.images[index] as Phaser.GameObjects.Image;
    const size = logicalSize(key);
    if (!size) {
      image.setOrigin(def.originX, def.originY);
      return;
    }
    const o = paddedOrigin(def.originX, def.originY, size.w, size.h);
    image.setOrigin(o.x, o.y);
  }

  private drawDebug(): void {
    const g = this.debugGfx;
    if (!g) return;
    g.clear();
    const rig = this.rig;
    g.lineStyle(1, 0x38d8ff, 0.8);
    for (let i = 0; i < rig.skeleton.boneCount; i += 1) {
      const bone = rig.skeleton.bones[i];
      if (!bone) continue;
      const m = rig.skeleton.world[i];
      if (!m) continue;
      const len = bone.length ?? 4;
      g.beginPath();
      g.moveTo(m.tx, m.ty);
      g.lineTo(m.tx + m.a * len, m.ty + m.b * len);
      g.strokePath();
      g.fillStyle(0xff8a3d, 0.9);
      g.fillCircle(m.tx, m.ty, 1.2);
    }
  }
}
