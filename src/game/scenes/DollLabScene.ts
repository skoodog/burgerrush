/**
 * Doll Lab.
 *
 * A production tool that ships with the game: browse every rig, every clip in
 * the library, all four chef variants and both player-slot accents, with bone
 * overlays and live event readout. It is how the animation set is reviewed
 * without hunting for the gameplay state that triggers each clip - and it is the
 * fastest proof that the eight visual combinations really are one rig.
 */

import Phaser from 'phaser';
import { UI } from '../art/palette';
import { VIEW } from '../config/gameplay';
import {
  CHEF_IDENTITIES,
  PRESENTATIONS,
  accentForSlot,
  chefSkin,
  FACE_EXPRESSIONS,
  IDENTITY_META,
  type ChefIdentity,
  type GenderPresentation,
  type PlayerSlot,
} from '../config/identity';
import { DollRig } from '../anim/dollRig';
import { bindClips } from '../anim/clip';
import { Skeleton } from '../anim/skeleton';
import { CHEF_CLIPS } from '../rigs/chefClips';
import { CHEF_DOLL } from '../rigs/chefDoll';
import { CHEF_GAMEPLAY_GRAPH, CHEF_SELECT_GRAPH } from '../rigs/chefGraph';
import { ENEMY_CLIPS, ENEMY_DOLL, ENEMY_GRAPH, enemySkin } from '../rigs/enemyDoll';
import { ENEMY_SPECIES, ENEMY_DISPLAY_NAMES, type EnemySpecies } from '../art/enemyArt';
import type { Session} from '../state/Session';
import { SESSION_KEY } from '../state/Session';
import { DollView } from '../view/DollView';
import { backdrop, FONT_STACK, heading, hintChip, label, panel } from '../ui/theme';

type Subject = 'chef' | 'enemy';

export class DollLabScene extends Phaser.Scene {
  private session!: Session;
  private subject: Subject = 'chef';
  private identityIndex = 0;
  private presentationIndex = 0;
  private slot: PlayerSlot = 1;
  private speciesIndex = 0;
  private clipIndex = 0;
  private expressionIndex = 0;
  private showBones = false;
  private paused = false;
  private speed = 1;

  private view: DollView | null = null;
  private infoText!: Phaser.GameObjects.Text;
  private clipText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private recentEvents: string[] = [];

  private chefClipIds: string[] = [];
  private enemyClipIds: string[] = [];

  constructor() {
    super('DollLab');
  }

  create(): void {
    this.session = this.registry.get(SESSION_KEY) as Session;
    // Phaser does not auto-invoke `shutdown`; wire it so doll views are
    // released before the display list is torn down.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    backdrop(this, VIEW.width, VIEW.height);
    heading(this, VIEW.width / 2, 44, 'DOLL LAB', 30);
    label(
      this,
      VIEW.width / 2,
      74,
      'ONE SKELETON · ONE CLIP LIBRARY · FOUR CHEF VARIANTS · TWO SLOT ACCENTS',
      12,
      UI.textDim,
    );

    this.chefClipIds = CHEF_CLIPS.map((c) => c.id);
    this.enemyClipIds = ENEMY_CLIPS.map((c) => c.id);

    panel(this, 30, 96, 300, 380);
    this.infoText = this.add
      .text(48, 116, '', { fontFamily: FONT_STACK, fontSize: '13px', color: UI.text, lineSpacing: 7 })
      .setOrigin(0, 0);
    this.clipText = this.add
      .text(48, 330, '', { fontFamily: FONT_STACK, fontSize: '12px', color: UI.goldHi, lineSpacing: 5 })
      .setOrigin(0, 0);
    this.eventText = this.add
      .text(48, 404, '', { fontFamily: FONT_STACK, fontSize: '11px', color: UI.textDim, lineSpacing: 4 })
      .setOrigin(0, 0);

    const hints: [number, number, string, string][] = [
      [420, 486, 'TAB', 'CHEF / FOE'],
      [560, 486, '←→', 'CLIP'],
      [670, 486, '↑↓', 'VARIANT'],
      [790, 486, 'C', 'P1 / P2'],
      [880, 486, 'B', 'BONES'],
    ];
    for (const [x, y, glyph, text] of hints) hintChip(this, x, y, glyph, text);
    hintChip(this, 420, 512, 'F', 'FACE');
    hintChip(this, 520, 512, 'SPACE', 'PAUSE');
    hintChip(this, 660, 512, '[ ]', 'SPEED');
    hintChip(this, 780, 512, 'ESC', 'TITLE');

    this.rebuild();

    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault();
      this.subject = this.subject === 'chef' ? 'enemy' : 'chef';
      this.clipIndex = 0;
      this.rebuild();
    });
    kb.on('keydown-LEFT', () => this.cycleClip(-1));
    kb.on('keydown-RIGHT', () => this.cycleClip(1));
    kb.on('keydown-UP', () => this.cycleVariant(-1));
    kb.on('keydown-DOWN', () => this.cycleVariant(1));
    kb.on('keydown-C', () => {
      this.slot = this.slot === 1 ? 2 : 1;
      this.rebuild();
    });
    kb.on('keydown-B', () => {
      this.showBones = !this.showBones;
      this.rebuild();
    });
    kb.on('keydown-F', () => {
      this.expressionIndex = (this.expressionIndex + 1) % FACE_EXPRESSIONS.length;
      this.applyExpression();
      this.refreshInfo();
    });
    kb.on('keydown-SPACE', () => {
      this.paused = !this.paused;
      this.refreshInfo();
    });
    kb.on('keydown-OPEN_BRACKET', () => {
      this.speed = Math.max(0.1, this.speed - 0.15);
      this.refreshInfo();
    });
    kb.on('keydown-CLOSED_BRACKET', () => {
      this.speed = Math.min(2.5, this.speed + 0.15);
      this.refreshInfo();
    });
    kb.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private cycleClip(delta: number): void {
    const ids = this.subject === 'chef' ? this.chefClipIds : this.enemyClipIds;
    this.clipIndex = (this.clipIndex + delta + ids.length) % ids.length;
    this.playCurrentClip();
    this.refreshInfo();
    this.session.audio.play('uiMove');
  }

  private cycleVariant(delta: number): void {
    if (this.subject === 'chef') {
      const total = CHEF_IDENTITIES.length * PRESENTATIONS.length;
      let index = this.identityIndex * PRESENTATIONS.length + this.presentationIndex;
      index = (index + delta + total) % total;
      this.identityIndex = Math.floor(index / PRESENTATIONS.length);
      this.presentationIndex = index % PRESENTATIONS.length;
    } else {
      this.speciesIndex = (this.speciesIndex + delta + ENEMY_SPECIES.length) % ENEMY_SPECIES.length;
    }
    this.rebuild();
    this.session.audio.play('uiMove');
  }

  private currentIdentity(): ChefIdentity {
    return CHEF_IDENTITIES[this.identityIndex] ?? 'sal';
  }

  private currentPresentation(): GenderPresentation {
    return PRESENTATIONS[this.presentationIndex] ?? 'boy';
  }

  private currentSpecies(): EnemySpecies {
    return ENEMY_SPECIES[this.speciesIndex] ?? 'stalker';
  }

  private rebuild(): void {
    this.view?.destroy();
    this.recentEvents = [];

    let rig: DollRig;
    if (this.subject === 'chef') {
      const identity = this.currentIdentity();
      const presentation = this.currentPresentation();
      const clips = bindClips(CHEF_CLIPS, new Skeleton(CHEF_DOLL.skeleton));
      const clipId = this.chefClipIds[this.clipIndex] ?? 'idle';
      // Pick whichever graph actually contains this clip so every authored clip
      // in the library is reachable from the lab.
      const graph = CHEF_SELECT_GRAPH.states.some((s) => s.clip === clipId)
        ? CHEF_SELECT_GRAPH
        : CHEF_GAMEPLAY_GRAPH;
      rig = new DollRig({
        def: CHEF_DOLL,
        graph,
        clips,
        skin: chefSkin(identity, presentation, accentForSlot(this.slot)),
        scale: 3.4,
      });
    } else {
      const clips = bindClips(ENEMY_CLIPS, new Skeleton(ENEMY_DOLL.skeleton));
      rig = new DollRig({
        def: ENEMY_DOLL,
        graph: ENEMY_GRAPH,
        clips,
        skin: enemySkin(this.currentSpecies()),
        scale: 3.4,
      });
    }

    rig.teleport(640, 400);
    rig.animator.onEvent((event) => {
      this.recentEvents.unshift(`${event.t.toFixed(2)}s  ${event.name}${event.value !== undefined ? ` (${event.value})` : ''}`);
      this.recentEvents = this.recentEvents.slice(0, 6);
    });

    this.view = new DollView(this, rig, { shadow: true, debug: this.showBones });
    this.view.setDepth(10);
    this.applyExpression();
    this.playCurrentClip();
    this.refreshInfo();
  }

  private applyExpression(): void {
    if (this.subject !== 'chef') return;
    const expression = FACE_EXPRESSIONS[this.expressionIndex] ?? 'neutral';
    this.view?.rig.animator.setSlot('slot.face', `face.${expression}`);
  }

  private playCurrentClip(): void {
    const rig = this.view?.rig;
    if (!rig) return;
    const ids = this.subject === 'chef' ? this.chefClipIds : this.enemyClipIds;
    const clipId = ids[this.clipIndex];
    if (!clipId) return;
    const state = rig.animator.graph.states.find((s) => s.clip === clipId);
    if (state) rig.animator.play(state.id, 0);
  }

  private refreshInfo(): void {
    const ids = this.subject === 'chef' ? this.chefClipIds : this.enemyClipIds;
    const clipId = ids[this.clipIndex] ?? '-';
    const clip = (this.subject === 'chef' ? CHEF_CLIPS : ENEMY_CLIPS).find((c) => c.id === clipId);
    const rig = this.view?.rig;

    const lines: string[] = [];
    if (this.subject === 'chef') {
      const meta = IDENTITY_META[this.currentIdentity()];
      lines.push(`SUBJECT   CHEF`);
      lines.push(`IDENTITY  ${meta.name} (${meta.letter})`);
      lines.push(`PRESENT.  ${this.currentPresentation().toUpperCase()}`);
      lines.push(`SLOT      P${this.slot} ${accentForSlot(this.slot).toUpperCase()}`);
      lines.push(`FACE      ${(FACE_EXPRESSIONS[this.expressionIndex] ?? 'neutral').toUpperCase()}`);
    } else {
      lines.push(`SUBJECT   FOOD FOE`);
      lines.push(`SPECIES   ${ENEMY_DISPLAY_NAMES[this.currentSpecies()]}`);
    }
    lines.push(`BONES     ${rig?.skeleton.boneCount ?? 0}`);
    lines.push(`PARTS     ${rig?.solvedParts.length ?? 0}`);
    lines.push(`CLOTH     ${(this.subject === 'chef' ? CHEF_DOLL.cloth : ENEMY_DOLL.cloth)?.length ?? 0} chains`);
    lines.push(`SPEED     ${this.speed.toFixed(2)}x ${this.paused ? '(PAUSED)' : ''}`);
    this.infoText.setText(lines.join('\n'));

    this.clipText.setText(
      [
        `CLIP ${this.clipIndex + 1}/${ids.length}   ${clipId}`,
        clip ? `${clip.duration.toFixed(2)}s · ${clip.loop} · ${clip.tracks.length} tracks` : '',
        clip?.additive ? 'ADDITIVE LAYER' : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  override update(_time: number, delta: number): void {
    const view = this.view;
    if (!view) return;
    const dt = this.paused ? 0 : Math.min(delta / 1000, 0.05) * this.speed;
    view.rig.update(dt);
    view.sync();
    this.eventText.setText(
      this.recentEvents.length > 0 ? ['EVENTS', ...this.recentEvents].join('\n') : 'EVENTS\n(none yet)',
    );
  }

  shutdown(): void {
    this.view?.destroy();
    this.view = null;
  }
}
