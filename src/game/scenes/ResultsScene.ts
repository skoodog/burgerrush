/**
 * Results: Stack Phase and Boss Flight tallied separately and together, plus the
 * arcade initials entry. Instant retry after a failure, next round after a clear.
 */

import Phaser from 'phaser';
import { UI } from '../art/palette';
import { VIEW } from '../config/gameplay';
import { formatSeed, parseSeed } from '../core/rng';
import { CHEF_FLAGS } from '../rigs/chefGraph';
import { sanitizeInitials, submitLocalScore, type LeaderboardEntry } from '../state/persistence';
import type { Session} from '../state/Session';
import { SESSION_KEY } from '../state/Session';
import { DollView } from '../view/DollView';
import { createChefPreviewRig } from '../view/chefDollFactory';
import { backdrop, FONT_STACK, heading, hintChip, label, panel } from '../ui/theme';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export class ResultsScene extends Phaser.Scene {
  private session!: Session;
  private cleared = false;
  private views: DollView[] = [];
  private initials = [0, 0, 0];
  private cursor = 0;
  private initialsText!: Phaser.GameObjects.Text;
  private submitted = false;

  constructor() {
    super('Results');
  }

  init(data: { cleared?: boolean }): void {
    this.cleared = data.cleared ?? false;
  }

  create(): void {
    this.session = this.registry.get(SESSION_KEY) as Session;
    backdrop(this, VIEW.width, VIEW.height);

    heading(this, VIEW.width / 2, 58, this.cleared ? 'ROUND CLEAR' : 'GAME OVER', 44);
    label(
      this,
      VIEW.width / 2,
      92,
      `ROUND ${this.session.round} · SEED ${formatSeed(parseSeed(this.session.seedInput))}`,
      13,
      UI.textDim,
    );

    panel(this, 90, 118, 480, 300);
    const b = this.session.score.breakdown;
    const rows: [string, number][] = [
      ['TREAD SEGMENTS', b.tread],
      ['INGREDIENT LAYERS', b.layers],
      ['INGREDIENT DROPS', b.drops],
      ['FOOD FOES', b.enemies],
      ['BURGERS', b.burgers],
      ['SECRET BURGERS', b.secret],
      ['FIELD SPATULAS', b.fieldSpatulas],
      ['STACK TIME BONUS', b.timeBonus],
      ['BOSS DAMAGE', b.bossDamage],
      ['BOSS CLEAR', b.bossClear],
      ['BONUSES', b.bonuses],
    ];
    rows.forEach(([name, value], i) => {
      const y = 146 + i * 24;
      this.add
        .text(112, y, name, { fontFamily: FONT_STACK, fontSize: '14px', color: UI.textDim })
        .setOrigin(0, 0.5);
      this.add
        .text(548, y, value.toLocaleString('en-US'), {
          fontFamily: FONT_STACK,
          fontSize: '14px',
          color: UI.text,
        })
        .setOrigin(1, 0.5);
    });

    const stackTotal = b.tread + b.layers + b.drops + b.enemies + b.burgers + b.secret + b.timeBonus + b.fieldSpatulas;
    const bossTotal = b.bossDamage + b.bossClear;
    label(this, 330, 424, `STACK ${stackTotal.toLocaleString('en-US')}   ·   FLIGHT ${bossTotal.toLocaleString('en-US')}`, 15, UI.goldHi);
    heading(this, 330, 456, `TOTAL ${this.session.score.score.toLocaleString('en-US')}`, 26);

    // Victory / game-over sibling poses using the shared rig.
    const selection = this.session.selection(1);
    const rig = createChefPreviewRig({
      identity: selection.identity,
      presentation: selection.presentation,
      slot: 1,
      scale: 2.6,
    });
    rig.teleport(700, 330);
    rig.context.flags.add(this.cleared ? CHEF_FLAGS.victory : CHEF_FLAGS.gameOver);
    rig.animator.play(this.cleared ? 'victory' : 'selectIdle', 0);
    const view = new DollView(this, rig, { shadow: true });
    view.setDepth(6);
    this.views.push(view);

    panel(this, 596, 118, 280, 170);
    label(this, 736, 142, 'ARCADE INITIALS', 14, UI.textDim);
    this.initialsText = this.add
      .text(736, 186, 'AAA', {
        fontFamily: FONT_STACK,
        fontSize: '44px',
        fontStyle: 'bold',
        color: UI.goldHi,
      })
      .setOrigin(0.5);
    label(this, 736, 232, '↑↓ LETTER   ←→ SLOT   ⏎ SUBMIT', 11, UI.textDim);

    const saved = sanitizeInitials(this.session.profile.initials);
    this.initials = [0, 1, 2].map((i) => Math.max(0, ALPHABET.indexOf(saved[i] ?? 'A')));
    this.refreshInitials();

    hintChip(this, 620, 486, 'R', this.cleared ? 'NEXT ROUND' : 'RETRY');
    hintChip(this, 780, 486, 'ESC', 'TITLE');

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-UP', () => this.cycle(1));
      keyboard.on('keydown-DOWN', () => this.cycle(-1));
      keyboard.on('keydown-LEFT', () => this.moveCursor(-1));
      keyboard.on('keydown-RIGHT', () => this.moveCursor(1));
      keyboard.on('keydown-ENTER', () => this.submit());
      keyboard.on('keydown-R', () => this.advance());
      keyboard.on('keydown-ESC', () => this.scene.start('Title'));
    }

    this.session.audio.play(this.cleared ? 'roundClear' : 'lifeLost');
  }

  private cycle(delta: number): void {
    const index = this.cursor;
    const value = this.initials[index] ?? 0;
    this.initials[index] = (value + delta + ALPHABET.length) % ALPHABET.length;
    this.refreshInitials();
    this.session.audio.play('uiMove');
  }

  private moveCursor(delta: number): void {
    this.cursor = (this.cursor + delta + 3) % 3;
    this.refreshInitials();
    this.session.audio.play('uiMove');
  }

  private refreshInitials(): void {
    const text = this.initials.map((i) => ALPHABET[i] ?? 'A').join('');
    this.initialsText.setText(text);
  }

  private submit(): void {
    if (this.submitted) return;
    this.submitted = true;
    const initials = sanitizeInitials(this.initials.map((i) => ALPHABET[i] ?? 'A').join(''));
    const selection = this.session.selection(1);
    const entry: LeaderboardEntry = {
      initials,
      score: this.session.score.score,
      round: this.session.round,
      durationSeconds: Math.round(this.time.now / 1000),
      mode: this.session.mode,
      seed: formatSeed(parseSeed(this.session.seedInput)),
      bossSeed: formatSeed(this.session.rng.stream('boss').getState()),
      bossClearSeconds: this.session.roundResults.at(-1)?.bossClearSeconds ?? 0,
      leadIdentity: selection.identity,
      leadPresentation: selection.presentation,
      coop: this.session.coop,
      version: '0.3.0',
      replayHash: `${formatSeed(parseSeed(this.session.seedInput))}-${this.session.score.score}`,
      timestamp: Date.now(),
      ranked: this.session.mode === 'arcade',
      practiceFlags: this.session.mode === 'practice' ? ['practice'] : [],
    };
    this.session.profile = submitLocalScore({ ...this.session.profile, initials }, entry);
    this.session.persist();
    this.session.audio.play('uiConfirm');
    label(this, 736, 258, 'SUBMITTED TO LOCAL LEADERBOARD', 11, UI.good);
  }

  private advance(): void {
    if (this.cleared) {
      this.session.round += 1;
      this.scene.start('StackPhase');
    } else {
      this.session.newRun(this.session.seedInput, this.session.mode);
      this.scene.start('StackPhase');
    }
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    for (const view of this.views) {
      view.rig.update(dt);
      view.sync();
    }
  }

  shutdown(): void {
    for (const view of this.views) view.destroy();
    this.views = [];
  }
}
