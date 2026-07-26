/**
 * Title / mode select.
 *
 * Shows the working-title logo, an animated sibling pair, and the mode menu from
 * the design sheet (Arcade, Daily, Practice, Leaderboard, How To Play, Doll Lab).
 */

import Phaser from 'phaser';
import { VIEW } from '../config/gameplay';
import { UI } from '../art/palette';
import { DollView } from '../view/DollView';
import { createChefPreviewRig } from '../view/chefDollFactory';
import { CHEF_FLAGS } from '../rigs/chefGraph';
import type { Session} from '../state/Session';
import { SESSION_KEY } from '../state/Session';
import { backdrop, heading, hintChip, label, panel } from '../ui/theme';

interface MenuItem {
  readonly id: string;
  readonly text: string;
  readonly detail: string;
}

const MENU: readonly MenuItem[] = [
  { id: 'arcade', text: 'ARCADE RUN', detail: 'Ranked. Deterministic seed. 60-second rush + boss flight.' },
  { id: 'coop', text: 'LOCAL SIBLING CO-OP', detail: 'Two devices, shared screen. P1 red, P2 blue.' },
  { id: 'practice', text: 'PRACTICE KITCHEN', detail: 'Unranked. Level and boss-pattern practice.' },
  { id: 'dolls', text: 'DOLL LAB', detail: 'Inspect every rig, clip and accent variant.' },
  { id: 'howto', text: 'HOW TO PLAY', detail: 'Controls, ingredients, food foes, the Dread Stack.' },
];

export class TitleScene extends Phaser.Scene {
  private index = 0;
  private items: Phaser.GameObjects.Text[] = [];
  private detail!: Phaser.GameObjects.Text;
  private views: DollView[] = [];
  private cursorGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Title');
  }

  create(): void {
    const session = this.registry.get(SESSION_KEY) as Session;
    backdrop(this, VIEW.width, VIEW.height);

    heading(this, VIEW.width / 2, 74, 'BURGER RUSH', 62);
    label(this, VIEW.width / 2, 116, 'WORKING TITLE  ·  ORIGINAL ARCADE PLATFORMER', 13, UI.textDim);

    // Sibling pair, one red and one blue, both animated by the shared rig.
    const pairs: { identity: 'sal' | 'pep'; presentation: 'boy' | 'girl'; slot: 1 | 2; x: number }[] = [
      { identity: 'pep', presentation: 'boy', slot: 1, x: 214 },
      { identity: 'sal', presentation: 'girl', slot: 2, x: 322 },
    ];
    for (const p of pairs) {
      const rig = createChefPreviewRig({
        identity: p.identity,
        presentation: p.presentation,
        slot: p.slot,
        scale: 2.5,
      });
      rig.teleport(p.x, 402);
      rig.facing = p.slot === 1 ? 1 : -1;
      const view = new DollView(this, rig, { shadow: true });
      view.setDepth(5);
      this.views.push(view);
    }

    panel(this, 470, 168, 430, 250);
    this.items = MENU.map((item, i) =>
      label(this, 690, 206 + i * 42, item.text, 22, i === 0 ? UI.goldHi : UI.textDim),
    );
    this.detail = label(this, 690, 392, MENU[0]?.detail ?? '', 13, UI.text);
    this.cursorGfx = this.add.graphics();

    hintChip(this, 520, 460, '↑↓', 'SELECT');
    hintChip(this, 660, 460, '⏎', 'START');
    hintChip(this, 790, 460, 'X', 'SPATULA');

    label(
      this,
      VIEW.width / 2,
      512,
      'ORIGINAL WORK · NO BURGERTIME ASSETS OR GEOMETRY · TITLE PENDING CLEARANCE',
      11,
      UI.textDim,
    );

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-UP', () => this.move(-1, session));
      keyboard.on('keydown-DOWN', () => this.move(1, session));
      keyboard.on('keydown-W', () => this.move(-1, session));
      keyboard.on('keydown-S', () => this.move(1, session));
      keyboard.on('keydown-ENTER', () => this.choose(session));
      keyboard.on('keydown-SPACE', () => this.choose(session));
    }
    this.input.on('pointerdown', () => this.choose(session));

    this.refresh();
  }

  private move(delta: number, session: Session): void {
    session.audio.unlock();
    session.audio.play('uiMove');
    this.index = (this.index + delta + MENU.length) % MENU.length;
    this.refresh();
  }

  private refresh(): void {
    this.items.forEach((text, i) => {
      text.setColor(i === this.index ? UI.goldHi : UI.textDim);
      text.setScale(i === this.index ? 1.06 : 1);
    });
    this.detail.setText(MENU[this.index]?.detail ?? '');
    this.cursorGfx.clear();
    this.cursorGfx.fillStyle(0xf5b731, 1);
    const y = 206 + this.index * 42;
    this.cursorGfx.fillTriangle(500, y - 8, 512, y, 500, y + 8);
  }

  private choose(session: Session): void {
    session.audio.unlock();
    session.audio.play('uiConfirm');
    const item = MENU[this.index];
    if (!item) return;
    switch (item.id) {
      case 'arcade':
        session.coop = false;
        session.newRun(session.seedInput, 'arcade');
        this.scene.start('CharacterSelect');
        break;
      case 'coop':
        session.coop = true;
        session.newRun(session.seedInput, 'arcade');
        this.scene.start('CharacterSelect');
        break;
      case 'practice':
        session.coop = false;
        session.newRun(session.seedInput, 'practice');
        this.scene.start('CharacterSelect');
        break;
      case 'dolls':
        this.scene.start('DollLab');
        break;
      case 'howto':
        this.scene.start('HowToPlay');
        break;
      default:
        break;
    }
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    for (const view of this.views) {
      // Idle showcase: the pair slowly turntables between beats.
      view.rig.context.flags.add(CHEF_FLAGS.showcase);
      view.rig.update(dt);
      view.sync();
    }
  }

  shutdown(): void {
    for (const view of this.views) view.destroy();
    this.views = [];
  }
}
