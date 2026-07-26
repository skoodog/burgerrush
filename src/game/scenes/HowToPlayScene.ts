/**
 * How to play. Text-first, controller-navigable, no mouse required.
 */

import Phaser from 'phaser';
import { UI } from '../art/palette';
import { BOSS_WARNING_TEXT, VIEW } from '../config/gameplay';
import { backdrop, FONT_STACK, heading, hintChip, label, panel } from '../ui/theme';

const SECTIONS: readonly { title: string; lines: readonly string[] }[] = [
  {
    title: 'ACT ONE — 60 SECOND RUSH',
    lines: [
      'Walk across every tread segment of an ingredient layer to arm it.',
      'An armed layer drops, cascades into the layers below, and lands on the plate.',
      'Food foes riding a falling layer are carried down and flattened.',
      'A hit costs one apron, three seconds, and returns you to a safe checkpoint.',
    ],
  },
  {
    title: 'ACT TWO — BOSS FLIGHT',
    lines: [
      `Finish the burger and the klaxon sounds: ${BOSS_WARNING_TEXT.en} / ${BOSS_WARNING_TEXT.ja}`,
      'Both siblings launch through the top of the stage into a side-scrolling arena.',
      'Hold fire for unlimited spinning spatulas. There is no ammo, reload or heat.',
      'Read the shape glyph before each condiment volley: disc, lane, fork, blob.',
    ],
  },
  {
    title: 'CONTROLS',
    lines: [
      'Arrows / WASD — move and climb          X or K — spatula (hold in flight)',
      'Space or Z — context action             Enter — confirm      Esc — pause',
      'Gamepad: stick or d-pad, west face button to fire, start to pause.',
      'Local co-op: two pads, or keyboard plus a pad, joining in either order.',
    ],
  },
];

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super('HowToPlay');
  }

  create(): void {
    backdrop(this, VIEW.width, VIEW.height);
    heading(this, VIEW.width / 2, 50, 'HOW TO PLAY', 32);

    SECTIONS.forEach((section, i) => {
      const y = 92 + i * 138;
      panel(this, 70, y, VIEW.width - 140, 122);
      label(this, VIEW.width / 2, y + 22, section.title, 16, UI.goldHi);
      section.lines.forEach((line, j) => {
        this.add
          .text(100, y + 48 + j * 20, line, {
            fontFamily: FONT_STACK,
            fontSize: '13px',
            color: UI.text,
          })
          .setOrigin(0, 0.5);
      });
    });

    hintChip(this, VIEW.width / 2 - 40, 512, 'ESC', 'BACK');
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-ESC', () => this.scene.start('Title'));
      kb.on('keydown-ENTER', () => this.scene.start('Title'));
    }
    this.input.on('pointerdown', () => this.scene.start('Title'));
  }
}
