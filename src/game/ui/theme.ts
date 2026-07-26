/**
 * Shared UI furniture: arcade panels, gradient headings, slot badges.
 *
 * Resolution-independent vector drawing rather than baked bitmaps, so the HUD
 * stays crisp at any letterbox scale.
 */

import type Phaser from 'phaser';
import { UI } from '../art/palette';
import { ACCENT_COLORS, markerForSlot, type PlayerAccent, type PlayerSlot } from '../config/identity';

export const FONT_STACK =
  '"Segoe UI", "Helvetica Neue", "Noto Sans JP", "Hiragino Kaku Gothic ProN", system-ui, sans-serif';

export function heading(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 42,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_STACK,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: UI.goldHi,
      stroke: '#3a1d05',
      strokeThickness: Math.max(3, size * 0.12),
      align: 'center',
    })
    .setOrigin(0.5)
    .setShadow(0, size * 0.09, '#000000', 0, true, true);
}

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 16,
  color: string = UI.text,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT_STACK,
      fontSize: `${size}px`,
      color,
      align: 'center',
    })
    .setOrigin(0.5);
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string = UI.frame,
  alpha = 0.9,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const color = Number.parseInt(accent.replace('#', ''), 16);
  g.fillStyle(0x0a1024, alpha);
  g.fillRoundedRect(x, y, w, h, 12);
  g.lineStyle(2, color, 0.95);
  g.strokeRoundedRect(x, y, w, h, 12);
  g.lineStyle(1, color, 0.35);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 9);
  return g;
}

/**
 * Player-slot badge.
 *
 * Colour is never the only cue: the badge always carries the slot number and a
 * distinct shape (P1 diamond, P2 circle), per the accessibility contract.
 */
export function slotBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  slot: PlayerSlot,
  accent: PlayerAccent,
  radius = 14,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  const color = ACCENT_COLORS[accent];
  g.fillStyle(color, 1);
  g.lineStyle(2, 0xffffff, 0.9);
  if (markerForSlot(slot) === 'diamond') {
    g.beginPath();
    g.moveTo(0, -radius);
    g.lineTo(radius, 0);
    g.lineTo(0, radius);
    g.lineTo(-radius, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else {
    g.fillCircle(0, 0, radius);
    g.strokeCircle(0, 0, radius);
  }
  container.add(g);
  container.add(
    scene.add
      .text(0, 0, String(slot), {
        fontFamily: FONT_STACK,
        fontSize: `${radius * 1.2}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5),
  );
  return container;
}

/** Deep-navy gradient backdrop with a subtle scanline shimmer. */
export function backdrop(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x0a1024, 0x0a1024, 0x151c3a, 0x1d1030, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(0xffffff, 0.018);
  for (let y = 0; y < height; y += 4) g.fillRect(0, y, width, 1);
  return g;
}

/** Small key/button hint chip. */
export function hintChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  glyph: string,
  text: string,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x1a2444, 0.92);
  g.lineStyle(1.5, 0x4a5a90, 1);
  g.fillRoundedRect(-14, -12, 28, 24, 6);
  g.strokeRoundedRect(-14, -12, 28, 24, 6);
  container.add(g);
  container.add(label(scene, 0, 0, glyph, 13, UI.goldHi));
  const caption = label(scene, 22, 0, text, 13, UI.textDim);
  caption.setOrigin(0, 0.5);
  container.add(caption);
  return container;
}
