/**
 * Boot: bakes the procedural atlas, then hands off to the title.
 *
 * The loading rail is drawn rather than loaded so there is no chicken-and-egg
 * asset dependency - the game is genuinely complete offline on first paint.
 */

import Phaser from 'phaser';
import { buildProceduralAtlas, type AtlasReport } from '../art/atlas';
import { VIEW } from '../config/gameplay';
import { Session, SESSION_KEY } from '../state/Session';
import { backdrop, heading, label } from '../ui/theme';
import { UI } from '../art/palette';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    backdrop(this, VIEW.width, VIEW.height);
    heading(this, VIEW.width / 2, VIEW.height / 2 - 60, 'BURGER RUSH', 54);
    const status = label(this, VIEW.width / 2, VIEW.height / 2 + 10, 'PREHEATING THE LINE…', 16, UI.textDim);

    // Ticket rail: a minimal animated loading motif.
    const rail = this.add.graphics();
    let t = 0;
    const drawRail = (progress: number): void => {
      rail.clear();
      const w = 340;
      const x = (VIEW.width - w) / 2;
      const y = VIEW.height / 2 + 46;
      rail.fillStyle(0x111a35, 1);
      rail.fillRoundedRect(x, y, w, 14, 7);
      rail.lineStyle(1.5, 0x2b3a63, 1);
      rail.strokeRoundedRect(x, y, w, 14, 7);
      rail.fillStyle(0xf5b731, 1);
      rail.fillRoundedRect(x + 2, y + 2, Math.max(6, (w - 4) * progress), 10, 5);
      for (let i = 0; i < 6; i += 1) {
        const tx = x + 18 + ((t * 60 + i * 58) % (w - 30));
        rail.fillStyle(0xffffff, 0.22);
        rail.fillRect(tx, y + 3, 8, 8);
      }
    };
    drawRail(0.05);

    const session = new Session();
    this.registry.set(SESSION_KEY, session);

    // Bake on the next tick so the first frame paints immediately.
    this.time.delayedCall(60, () => {
      let report: AtlasReport | null = null;
      try {
        report = buildProceduralAtlas(this);
      } catch (error) {
        console.error('[Boot] atlas bake failed', error);
        status.setText('ART BAKE FAILED - SEE CONSOLE');
        return;
      }
      this.registry.set('atlasReport', report);
      status.setText(`${report.textureCount} TEXTURES BAKED IN ${report.elapsedMs.toFixed(0)}MS`);
      drawRail(1);
      this.time.delayedCall(320, () => this.scene.start('Title'));
    });

    this.events.on('update', (_time: number, delta: number) => {
      t += delta / 1000;
      if (this.scene.isActive()) drawRail(Math.min(1, 0.05 + t * 0.6));
    });
  }
}
