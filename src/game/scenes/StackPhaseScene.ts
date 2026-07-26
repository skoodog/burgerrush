/**
 * Stack Phase - the 60-second burger assembly act.
 *
 * Fixed-step simulation, event-driven presentation. The doll rigs are advanced
 * by the same fixed step as the physics, then synced to sprites once per render
 * frame, so animation, audio cues and gameplay never drift apart.
 */

import Phaser from 'phaser';
import { ART_RES } from '../art/atlas';
import { TREAD_SEGMENT_W } from '../art/worldArt';
import { UI, WORLD } from '../art/palette';
import {
  BOSS_WARNING,
  BOSS_WARNING_TEXT,
  FIXED_STEP,
  MAX_STEPS_PER_FRAME,
  SCORE,
  STACK_PHASE,
  VIEW,
} from '../config/gameplay';
import { accentForSlot, ACCENT_COLORS, markerForSlot, type PlayerSlot } from '../config/identity';
import { clamp, clamp01 } from '../core/math';
import { Chef, emptyChefInput } from '../entities/Chef';
import { Enemy } from '../entities/Enemy';
import { ControlMap } from '../input/ControlMap';
import { TUTORIAL_MAP_A, TUTORIAL_MAP_A_ROUND_2 } from '../levels/tutorialMapA';
import type { LevelDef } from '../levels/types';
import { CHEF_EVENTS } from '../rigs/chefClips';
import { BurgerStack, collectSurfaces, type LayerRuntime, type SurfaceQuery } from '../systems/burgerStack';
import { buildNavGraph, type NavGraph } from '../systems/navGraph';
import { remainingTimeBonus } from '../systems/scoring';
import { ThreatDirector } from '../systems/threatDirector';
import { substrateForLayer } from '../audio/AudioDirector';
import type { Session} from '../state/Session';
import { SESSION_KEY } from '../state/Session';
import { DollView } from '../view/DollView';
import { backdrop, FONT_STACK, label, slotBadge } from '../ui/theme';

type Phase = 'ready' | 'playing' | 'warning' | 'launching' | 'failed';

declare global {
  interface Window {
    __BURGER_RUSH_DEBUG__?: {
      completeStack: () => void;
      setTimeRemaining: (seconds: number) => void;
      state: () => Record<string, unknown>;
    };
  }
}

interface PlayerRuntime {
  readonly slot: PlayerSlot;
  readonly chef: Chef;
  readonly view: DollView;
  hitThisRound: boolean;
}

export class StackPhaseScene extends Phaser.Scene {
  private session!: Session;
  private level!: LevelDef;
  private stack!: BurgerStack;
  private graph!: NavGraph;
  private controls!: ControlMap;
  private threat = new ThreatDirector();

  private players: PlayerRuntime[] = [];
  private enemies: Enemy[] = [];
  private enemyViews = new Map<number, DollView>();

  private phase: Phase = 'ready';
  private timeRemaining: number = STACK_PHASE.durationSeconds;
  private timerStarted = false;
  private graceTimer: number = STACK_PHASE.startGraceSeconds;
  private phaseTimer = 0;
  private accumulator = 0;
  private lastTickSecond = -1;
  private surfaces: SurfaceQuery[] = [];

  private stageGfx!: Phaser.GameObjects.Graphics;
  private layerSprites = new Map<string, Phaser.GameObjects.Image[]>();
  private hudTimer!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudHigh!: Phaser.GameObjects.Text;
  private hudBurgers!: Phaser.GameObjects.Text;
  private hudProgress!: Phaser.GameObjects.Text;
  private hudCombo!: Phaser.GameObjects.Text;
  private apronGfx!: Phaser.GameObjects.Graphics;
  private readyText!: Phaser.GameObjects.Text;
  private warningLayer!: Phaser.GameObjects.Container;

  constructor() {
    super('StackPhase');
  }

  create(): void {
    this.session = this.registry.get(SESSION_KEY) as Session;
    this.level = this.session.round >= 2 ? TUTORIAL_MAP_A_ROUND_2 : TUTORIAL_MAP_A;
    this.stack = new BurgerStack(this.level);
    this.graph = buildNavGraph(this.level);
    this.controls = new ControlMap(this, this.session.devices);
    this.threat = new ThreatDirector();
    this.phase = 'ready';
    this.timeRemaining = STACK_PHASE.durationSeconds;
    this.timerStarted = false;
    this.graceTimer = STACK_PHASE.startGraceSeconds;
    this.session.noHitStack = true;

    backdrop(this, VIEW.width, VIEW.height);
    this.stageGfx = this.add.graphics().setDepth(1);
    this.buildLayerSprites();
    this.spawnPlayers();
    this.spawnEnemies();
    this.buildHud();
    this.buildWarningOverlay();

    this.readyText = label(this, VIEW.width / 2, 250, 'READY!', 46, UI.goldHi).setDepth(60);
    this.tweens.add({
      targets: this.readyText,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.35 },
      duration: 900,
      delay: 500,
      onComplete: () => this.readyText.setVisible(false),
    });

    this.session.audio.unlock();
    this.session.audio.startStackMusic();

    this.exposeDebugHooks();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  /**
   * Automation hooks for the E2E suite and the attract-mode bot.
   *
   * Scripted-cheat completion is explicitly sanctioned by the testing brief so
   * the boss transition can be exercised without a 60-second play-through. It is
   * never reachable from gameplay input.
   */
  private exposeDebugHooks(): void {
    window.__BURGER_RUSH_DEBUG__ = {
      completeStack: () => this.stack.forceCompleteAll(),
      setTimeRemaining: (seconds: number) => {
        this.timeRemaining = Math.max(0, seconds);
        this.timerStarted = true;
      },
      state: () => ({
        phase: this.phase,
        timeRemaining: this.timeRemaining,
        burgers: this.stack.completedBurgerCount,
        segments: this.stack.segmentProgress(),
        score: this.session.score.score,
        aprons: this.session.aprons,
        fieldSpatulas: this.players[0]?.chef.fieldSpatulas ?? 0,
      }),
    };
  }

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  private buildLayerSprites(): void {
    for (const layer of this.stack.layers.values()) {
      const sprites: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < layer.def.segments; i += 1) {
        const image = this.add
          .image(
            layer.def.x + i * TREAD_SEGMENT_W + TREAD_SEGMENT_W / 2,
            layer.y,
            `ingredient.${layer.def.kind}.raw`,
          )
          .setOrigin(0.5, 1)
          .setDepth(6);
        image.setDisplaySize(TREAD_SEGMENT_W + 1, 16);
        sprites.push(image);
      }
      this.layerSprites.set(layer.def.id, sprites);
    }
  }

  private spawnPlayers(): void {
    const slots = this.session.activeSlots();
    slots.forEach((slot, i) => {
      const selection = this.session.selection(slot);
      const chef = new Chef({
        slot,
        identity: selection.identity,
        presentation: selection.presentation,
        scale: 1.05,
      });
      const spawn = this.level.playerSpawns[i] ?? this.level.playerSpawns[0];
      chef.teleport(spawn?.x ?? 160, spawn?.y ?? 470);
      chef.fieldSpatulas = this.session.fieldSpatulasForRound();
      chef.setFaceExpression('determined');

      chef.onAnimEvent((event) => this.onChefAnimEvent(chef, event.name, event.value));

      const view = new DollView(this, chef.rig, { shadow: true });
      view.setDepth(20);
      this.players.push({ slot, chef, view, hitThisRound: false });
    });
  }

  private spawnEnemies(): void {
    this.level.enemySpawns.forEach((spawn, i) => {
      const enemy = new Enemy({
        id: i + 1,
        species: spawn.species,
        x: spawn.x,
        y: spawn.y,
        delay: spawn.delay,
      });
      const view = new DollView(this, enemy.rig, { shadow: true });
      view.setDepth(18);
      view.setVisible(false);
      this.enemies.push(enemy);
      this.enemyViews.set(enemy.id, view);
    });
  }

  private buildHud(): void {
    const bar = this.add.graphics().setDepth(50);
    bar.fillStyle(0x070c1c, 0.86);
    bar.fillRect(0, 0, VIEW.width, 46);
    bar.lineStyle(2, 0x2b3a63, 1);
    bar.lineBetween(0, 46, VIEW.width, 46);

    const mk = (x: number, y: number, size: number, color: string): Phaser.GameObjects.Text =>
      this.add
        .text(x, y, '', { fontFamily: FONT_STACK, fontSize: `${size}px`, color, fontStyle: 'bold' })
        .setOrigin(0, 0.5)
        .setDepth(51);

    this.hudScore = mk(18, 16, 18, UI.text);
    this.hudHigh = mk(18, 34, 12, UI.textDim);
    this.hudBurgers = mk(210, 16, 15, UI.text);
    this.hudProgress = mk(210, 34, 12, UI.textDim);
    this.hudCombo = mk(360, 24, 15, UI.goldHi);

    this.hudTimer = this.add
      .text(VIEW.width / 2, 22, '60.0', {
        fontFamily: FONT_STACK,
        fontSize: `${30 * this.session.accessibility.readableTimerScale}px`,
        color: UI.goldHi,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.apronGfx = this.add.graphics().setDepth(51);

    // Persistent P1/P2 markers: number, letter, shape and colour.
    this.players.forEach((player, i) => {
      const accent = accentForSlot(player.slot);
      slotBadge(this, VIEW.width - 150 + i * 70, 23, player.slot, accent, 12).setDepth(52);
      this.add
        .text(VIEW.width - 132 + i * 70, 23, markerForSlot(player.slot) === 'diamond' ? '◆' : '●', {
          fontFamily: FONT_STACK,
          fontSize: '13px',
          color: `#${ACCENT_COLORS[accent].toString(16).padStart(6, '0')}`,
        })
        .setOrigin(0, 0.5)
        .setDepth(52);
    });
  }

  private buildWarningOverlay(): void {
    this.warningLayer = this.add.container(0, 0).setDepth(90).setVisible(false);
    const dim = this.add.graphics();
    dim.fillStyle(0x0a0410, 0.72);
    dim.fillRect(0, 0, VIEW.width, VIEW.height);
    this.warningLayer.add(dim);

    // Exact strings, rendered from localisation text with local fonts - never
    // baked into generated image lettering.
    const en = this.add
      .text(VIEW.width / 2, 218, BOSS_WARNING_TEXT.en, {
        fontFamily: FONT_STACK,
        fontSize: '76px',
        fontStyle: 'bold italic',
        color: '#ffd54f',
        stroke: '#2a1060',
        strokeThickness: 12,
      })
      .setOrigin(0.5);
    en.setShadow(0, 8, '#ff3d9a', 0, true, true);

    const ja = this.add
      .text(VIEW.width / 2, 292, BOSS_WARNING_TEXT.ja, {
        fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#7ce7ff',
        stroke: '#0b2740',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.warningLayer.add(en);
    this.warningLayer.add(ja);
    this.warningLayer.setData('en', en);
    this.warningLayer.setData('ja', ja);

    // Warning chevrons - shape-coded, not colour-only.
    const chevrons = this.add.graphics();
    chevrons.lineStyle(4, 0xffd54f, 0.9);
    for (let i = 0; i < 5; i += 1) {
      const x = 120 + i * 46;
      chevrons.strokeTriangle(x, 350, x + 26, 366, x, 382);
      chevrons.strokeTriangle(VIEW.width - x, 350, VIEW.width - x - 26, 366, VIEW.width - x, 382);
    }
    this.warningLayer.add(chevrons);
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------

  override update(_time: number, delta: number): void {
    const frame = Math.min(delta / 1000, 0.25);
    this.controls.update();
    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      this.step(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }
    this.render();
  }

  private step(dt: number): void {
    this.session.score.update(dt);
    this.surfaces = collectSurfaces(this.level, this.stack);

    switch (this.phase) {
      case 'ready':
      case 'playing':
        this.stepPlay(dt);
        break;
      case 'warning':
        this.stepWarning(dt);
        break;
      case 'launching':
        this.stepLaunch(dt);
        break;
      case 'failed':
        this.phaseTimer += dt;
        for (const player of this.players) player.chef.update(dt, this.level, this.surfaces);
        if (this.phaseTimer > 1.8) this.finishRun(false);
        break;
    }
  }

  private stepPlay(dt: number): void {
    // --- input ------------------------------------------------------------
    for (const player of this.players) {
      const state = this.controls.state(player.slot);
      const input = emptyChefInput();
      input.moveX = state.moveX;
      input.moveY = state.moveY;
      input.fire = state.fire;
      input.firePressed = state.firePressed;
      input.actionPressed = state.actionPressed;
      player.chef.setInput(input);
      if (!this.timerStarted && (state.moveX !== 0 || state.moveY !== 0)) this.timerStarted = true;
    }

    // --- timer ------------------------------------------------------------
    if (!this.timerStarted) {
      this.graceTimer -= dt;
      if (this.graceTimer <= 0) this.timerStarted = true;
    } else {
      this.phase = 'playing';
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
      this.updateMusicLayer();
      const second = Math.ceil(this.timeRemaining);
      if (second !== this.lastTickSecond && this.timeRemaining <= STACK_PHASE.rageAt) {
        this.lastTickSecond = second;
        if (second === STACK_PHASE.finalCountAt) this.session.audio.play('finalWarning');
        else this.session.audio.play('tick');
      }
      if (this.timeRemaining <= 0) {
        this.failRound();
        return;
      }
    }

    // --- chefs -------------------------------------------------------------
    for (const player of this.players) {
      player.chef.update(dt, this.level, this.surfaces);
      this.applyTread(player);
    }

    // --- ingredients -------------------------------------------------------
    this.stack.update(dt);
    this.consumeStackEvents();

    // --- enemies -----------------------------------------------------------
    const lead = this.players[0];
    if (lead) {
      const rage = clamp01((STACK_PHASE.rageAt - this.timeRemaining) / STACK_PHASE.rageAt);
      const aiRng = this.session.rng.stream('ai');
      for (const enemy of this.enemies) {
        enemy.setRage(this.timeRemaining <= STACK_PHASE.rageAt ? rage : 0);
        const target = this.nearestPlayer(enemy.x, enemy.y);
        enemy.update(dt, this.graph, target, aiRng);
        this.rideLayers(enemy);
      }
      this.threat.update(lead.chef, this.enemies, this.graph);
      this.resolveEnemyContacts();
    }

    if (this.stack.allComplete) this.beginWarning();
  }

  /** Presses the tread segment under each grounded chef. */
  private applyTread(player: PlayerRuntime): void {
    const chef = player.chef;
    if (!chef.grounded || !chef.standingLayerId) return;
    const layer = this.stack.layers.get(chef.standingLayerId);
    if (!layer) return;
    const index = this.stack.tread(layer, chef.x);
    if (index >= 0) {
      this.session.score.award('tread', SCORE.treadSegment, player.slot);
      this.session.audio.play('tread');
      this.refreshLayerSprites(layer);
    }
  }

  /** Enemies standing on a layer ride it down and are defeated on landing. */
  private rideLayers(enemy: Enemy): void {
    if (!enemy.active && enemy.state !== 'carried') return;
    for (const layer of this.stack.layers.values()) {
      const w = layer.def.segments * TREAD_SEGMENT_W;
      const onIt =
        enemy.x >= layer.def.x - 6 &&
        enemy.x <= layer.def.x + w + 6 &&
        Math.abs(enemy.y - layer.y) < 8;
      if (onIt && layer.state !== 'landed') {
        layer.riders.add(enemy.id);
        if (layer.state === 'falling') {
          enemy.carry();
          enemy.y = layer.y;
        }
      } else {
        layer.riders.delete(enemy.id);
      }
    }
  }

  private consumeStackEvents(): void {
    for (const event of this.stack.drainEvents()) {
      switch (event.type) {
        case 'layerComplete': {
          this.session.score.award('layerComplete', SCORE.ingredientLayerComplete);
          this.session.score.bumpCombo();
          break;
        }
        case 'layerArmed':
          this.session.audio.play('layerArmed');
          break;
        case 'layerDrop':
          this.session.audio.play('layerDrop');
          break;
        case 'riderCarried':
          this.session.audio.play('enemyCarried');
          this.session.score.award(
            'enemyCarried',
            SCORE.enemyCarriedOneLevel * (event.riders ?? 1),
          );
          break;
        case 'layerLand': {
          this.session.audio.play('layerLand');
          this.session.score.award('dropLanding', SCORE.ingredientDropLanding);
          const carried = event.riders ?? 0;
          if (carried > 0) {
            this.session.score.awardEnemyDrop(carried);
            for (const enemy of this.enemies) {
              if (enemy.state === 'carried') {
                enemy.defeat();
                this.time.delayedCall(700, () => this.respawnEnemy(enemy));
              }
            }
          }
          break;
        }
        case 'burgerComplete':
          this.session.audio.play('burgerComplete');
          this.session.audio.duck(0.6);
          this.session.score.award('burger', SCORE.burgerComplete);
          this.session.score.bumpCombo(4);
          break;
        default:
          break;
      }
    }
  }

  /** Re-entry respects the Threat Director's minimum distance. */
  private respawnEnemy(enemy: Enemy): void {
    const lead = this.players[0];
    if (!lead) return;
    const spawn = this.level.enemySpawns.find((s) => s.species === enemy.species);
    const x = spawn?.x ?? 792;
    const y = spawn?.y ?? 470;
    if (!this.threat.canEnterAt(x, y, lead.chef)) {
      this.time.delayedCall(600, () => this.respawnEnemy(enemy));
      return;
    }
    enemy.x = x;
    enemy.y = y;
    enemy.rig.teleport(x, y);
    enemy.state = 'entering';
    (enemy as unknown as { enterTimer: number }).enterTimer = 1.2;
  }

  private resolveEnemyContacts(): void {
    for (const player of this.players) {
      const chef = player.chef;
      if (chef.invulnTimer > 0) continue;
      const cb = chef.bounds;
      for (const enemy of this.enemies) {
        if (!enemy.dangerous) continue;
        const eb = enemy.bounds;
        const overlap =
          cb.x < eb.x + eb.width &&
          cb.x + cb.width > eb.x &&
          cb.y < eb.y + eb.height &&
          cb.y + cb.height > eb.y;
        if (!overlap) continue;
        if (chef.hit()) this.onChefHit(player);
        break;
      }
    }
  }

  private onChefHit(player: PlayerRuntime): void {
    player.hitThisRound = true;
    this.session.noHitStack = false;
    this.session.audio.play('lifeLost');
    this.timeRemaining = Math.max(0, this.timeRemaining - STACK_PHASE.hitTimePenalty);
    const remaining = this.session.loseApron();
    this.cameras.main.shake(180 * this.session.accessibility.screenShake, 0.006);

    if (remaining <= 0) {
      this.failRound();
      return;
    }
    // Respawn at the nearest validated safe checkpoint.
    const chef = player.chef;
    let best = this.level.checkpoints[0] ?? { x: 168, y: 470 };
    let bestScore = Number.POSITIVE_INFINITY;
    for (const cp of this.level.checkpoints) {
      const distToChef = Math.hypot(cp.x - chef.x, cp.y - chef.y);
      const distToThreat = Math.min(
        ...this.enemies.filter((e) => e.active).map((e) => Math.hypot(cp.x - e.x, cp.y - e.y)),
        999,
      );
      // Prefer close checkpoints that are not adjacent to a foe: no spawn hits.
      const score = distToChef - distToThreat * 1.4;
      if (score < bestScore) {
        bestScore = score;
        best = cp;
      }
    }
    this.time.delayedCall(220, () => chef.respawn(best.x, best.y));
  }

  private nearestPlayer(x: number, y: number): { x: number; y: number; vx: number; vy: number } {
    let best = this.players[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const player of this.players) {
      const d = Math.hypot(player.chef.x - x, player.chef.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = player;
      }
    }
    const chef = best?.chef;
    return chef ? { x: chef.x, y: chef.y, vx: chef.vx, vy: chef.vy } : { x, y, vx: 0, vy: 0 };
  }

  private updateMusicLayer(): void {
    const t = this.timeRemaining;
    const layer = t <= STACK_PHASE.finalCountAt ? 3 : t <= STACK_PHASE.rageAt ? 2 : t <= STACK_PHASE.pressureAt ? 1 : 0;
    this.session.audio.setMusicLayer(layer);
  }

  // -------------------------------------------------------------------------
  // Boss warning and launch
  // -------------------------------------------------------------------------

  private beginWarning(): void {
    if (this.phase !== 'playing' && this.phase !== 'ready') return;
    this.phase = 'warning';
    this.phaseTimer = 0;
    this.session.audio.stopMusic();
    this.session.audio.play('klaxon');
    this.warningLayer.setVisible(true);

    const reduced = this.session.accessibility.reducedMotion;
    const en = this.warningLayer.getData('en') as Phaser.GameObjects.Text;
    const ja = this.warningLayer.getData('ja') as Phaser.GameObjects.Text;
    en.setScale(reduced ? 1 : 0.6).setAlpha(0);
    ja.setAlpha(0);
    this.tweens.add({ targets: en, alpha: 1, scale: 1, duration: reduced ? 220 : 320, ease: 'Back.Out' });
    this.tweens.add({ targets: ja, alpha: 1, duration: 260, delay: 200 });
    if (!reduced) this.cameras.main.shake(300 * this.session.accessibility.screenShake, 0.004);

    for (const player of this.players) {
      player.chef.mode = 'warning';
      player.chef.setFaceExpression('lookUp');
      player.chef.setInput(emptyChefInput());
    }
  }

  private stepWarning(dt: number): void {
    this.phaseTimer += dt;
    for (const player of this.players) player.chef.update(dt, this.level, this.surfaces);
    if (this.phaseTimer >= BOSS_WARNING.klaxonSeconds + BOSS_WARNING.lookUpSeconds) {
      this.phase = 'launching';
      this.phaseTimer = 0;
      this.session.audio.play('launch');
      for (const player of this.players) {
        player.chef.mode = 'launch';
        player.chef.setFaceExpression('determined');
      }
    }
  }

  /** Both chefs must cross the top boundary before Boss Flight begins. */
  private stepLaunch(dt: number): void {
    this.phaseTimer += dt;
    const t = clamp01(this.phaseTimer / BOSS_WARNING.launchSeconds);
    for (const player of this.players) {
      const chef = player.chef;
      // Crouch, then accelerate up through the top of the stage.
      if (t > 0.42) {
        const lift = (t - 0.42) / 0.58;
        chef.y -= (240 + lift * 900) * dt;
      }
      chef.update(dt, this.level, this.surfaces);
    }
    if (this.phaseTimer >= BOSS_WARNING.launchSeconds + 0.25) {
      const allAbove = this.players.every((p) => p.chef.y < -20);
      if (allAbove || this.phaseTimer > BOSS_WARNING.launchSeconds + 1.2) this.toBossFlight();
    }
  }

  private toBossFlight(): void {
    const bonus = remainingTimeBonus(this.timeRemaining);
    this.session.score.award('remainingTime', bonus);
    if (this.session.noHitStack) this.session.score.award('noHitStack', SCORE.noHitStackPhase);
    this.session.maybeAwardExtraApron();
    this.scene.start('BossFlight', { secondsRemaining: this.timeRemaining });
  }

  private failRound(): void {
    if (this.phase === 'failed') return;
    this.phase = 'failed';
    this.phaseTimer = 0;
    this.session.audio.stopMusic();
    this.session.audio.play('lifeLost');
    for (const player of this.players) {
      player.chef.rig.context.flags.add('gameOver');
      player.chef.setFaceExpression('hurt');
    }
  }

  private finishRun(_cleared: boolean): void {
    this.session.persist();
    this.scene.start('Results', { cleared: false, secondsRemaining: 0 });
  }

  // -------------------------------------------------------------------------
  // Presentation
  // -------------------------------------------------------------------------

  private onChefAnimEvent(chef: Chef, name: string, value?: string | number): void {
    switch (name) {
      case CHEF_EVENTS.footstep: {
        const kind = chef.standingLayerId
          ? this.stack.layers.get(chef.standingLayerId)?.def.kind ?? null
          : null;
        this.session.audio.footstep(substrateForLayer(kind), value === 'far' ? 'far' : 'near');
        break;
      }
      case CHEF_EVENTS.ladderRung:
        this.session.audio.footstep('ladder', value === 'far' ? 'far' : 'near');
        break;
      case CHEF_EVENTS.landSquash:
        this.spawnPuff(chef.x, chef.y);
        break;
      case CHEF_EVENTS.fieldSpatulaRelease:
        this.session.audio.play('spatulaThrow');
        break;
      default:
        break;
    }
  }

  private spawnPuff(x: number, y: number): void {
    const puff = this.add.image(x, y, 'fx.puff').setDepth(19).setAlpha(0.7);
    puff.setScale((1 / ART_RES) * 1.1);
    this.tweens.add({
      targets: puff,
      alpha: 0,
      scaleX: 1.1,
      scaleY: 0.6,
      y: y - 6,
      duration: 320,
      onComplete: () => puff.destroy(),
    });
  }

  private refreshLayerSprites(layer: LayerRuntime): void {
    const sprites = this.layerSprites.get(layer.def.id);
    if (!sprites) return;
    sprites.forEach((sprite, i) => {
      const key = layer.pressed[i] ? `ingredient.${layer.def.kind}.pressed` : `ingredient.${layer.def.kind}.raw`;
      if (sprite.texture.key !== key) {
        sprite.setTexture(key);
        sprite.setDisplaySize(TREAD_SEGMENT_W + 1, 16);
      }
    });
  }

  private render(): void {
    this.drawStage();

    for (const layer of this.stack.layers.values()) {
      const sprites = this.layerSprites.get(layer.def.id);
      if (!sprites) continue;
      for (const sprite of sprites) sprite.y = layer.y;
    }

    for (const player of this.players) {
      const chef = player.chef;
      // Invulnerability blink: never a colour-only cue, the doll also flickers.
      const blink = chef.invulnTimer > 0 && Math.floor(chef.invulnTimer * 14) % 2 === 0;
      player.view.setAlpha(blink ? 0.4 : 1);
      player.view.sync();
    }

    for (const enemy of this.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (!view) continue;
      view.setVisible(enemy.state !== 'entering');
      view.sync();
    }

    this.drawHud();
  }

  private drawStage(): void {
    const g = this.stageGfx;
    g.clear();

    // Decks
    for (const platform of this.level.platforms) {
      g.fillStyle(0x4a5570, 1);
      g.fillRoundedRect(platform.x1, platform.y, platform.x2 - platform.x1, 9, 3);
      g.fillStyle(0xc6d1e4, 1);
      g.fillRoundedRect(platform.x1, platform.y, platform.x2 - platform.x1, 3.5, 2);
      g.fillStyle(0x0a1024, 0.5);
      g.fillRect(platform.x1, platform.y + 8, platform.x2 - platform.x1, 3);
    }

    // Ladders
    for (const ladder of this.level.ladders) {
      const h = ladder.yBottom - ladder.yTop;
      g.fillStyle(0x7c4f16, 1);
      g.fillRect(ladder.x - 9, ladder.yTop, 4, h);
      g.fillRect(ladder.x + 5, ladder.yTop, 4, h);
      g.fillStyle(0xf0b95c, 1);
      g.fillRect(ladder.x - 9, ladder.yTop, 2, h);
      g.fillRect(ladder.x + 5, ladder.yTop, 2, h);
      for (let y = ladder.yTop + 8; y < ladder.yBottom - 2; y += 13) {
        g.fillStyle(0xc7862f, 1);
        g.fillRect(ladder.x - 9, y, 18, 3.2);
        g.fillStyle(0xf0b95c, 0.8);
        g.fillRect(ladder.x - 9, y, 18, 1.2);
      }
    }

    // Plates
    for (const plate of this.level.plates) {
      g.fillStyle(0xa7b3c9, 1);
      g.fillRoundedRect(plate.x - 8, plate.y + 2, plate.width + 16, 10, 5);
      g.fillStyle(0xe9eef7, 1);
      g.fillRoundedRect(plate.x - 8, plate.y, plate.width + 16, 8, 4);
    }

    // Hint captions on round 1 only.
    if (this.session.round === 1 && this.phase === 'ready') {
      for (const hint of this.level.hints ?? []) {
        g.fillStyle(0x111a35, 0.85);
        const w = hint.text.length * 6.2 + 16;
        g.fillRoundedRect(hint.x - w / 2, hint.y - 10, w, 20, 6);
      }
    }
  }

  private drawHud(): void {
    const score = this.session.score;
    this.hudScore.setText(`SCORE ${score.score.toLocaleString('en-US')}`);
    this.hudHigh.setText(`HIGH ${Math.max(score.highScore, score.score).toLocaleString('en-US')}`);
    this.hudBurgers.setText(
      `BURGERS ${this.stack.completedBurgerCount}/${this.stack.requiredBurgerCount}`,
    );
    const progress = this.stack.segmentProgress();
    this.hudProgress.setText(`SEGMENTS ${progress.pressed}/${progress.total}`);
    this.hudCombo.setText(score.combo > 1 ? `COMBO x${score.combo}` : '');

    // Exact tenths inside the final 10 seconds, per the HUD brief.
    const t = this.timeRemaining;
    this.hudTimer.setText(t <= 10 ? t.toFixed(1) : String(Math.ceil(t)));
    this.hudTimer.setColor(t <= STACK_PHASE.rageAt ? UI.danger : t <= STACK_PHASE.pressureAt ? '#ffb347' : UI.goldHi);
    this.hudTimer.setScale(t <= STACK_PHASE.finalCountAt ? 1 + Math.sin(t * 18) * 0.06 : 1);

    // Aprons drawn as shapes, never colour alone.
    const g = this.apronGfx;
    g.clear();
    for (let i = 0; i < 3; i += 1) {
      const x = 614 + i * 22;
      const filled = i < this.session.aprons;
      g.lineStyle(2, 0xf4f1e8, filled ? 1 : 0.35);
      g.fillStyle(0xf4f1e8, filled ? 0.9 : 0.12);
      g.beginPath();
      g.moveTo(x, 34);
      g.lineTo(x + 12, 34);
      g.lineTo(x + 10, 44);
      g.lineTo(x + 2, 44);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
    void clamp;
    void WORLD;
  }

  private cleanup(): void {
    // Kill pending tweens and delayed callbacks (enemy re-entry, score popups)
    // before tearing down the display list they reference.
    this.tweens.killAll();
    this.time.removeAllEvents();
    delete window.__BURGER_RUSH_DEBUG__;
    for (const player of this.players) player.view.destroy();
    for (const view of this.enemyViews.values()) view.destroy();
    this.players = [];
    this.enemies = [];
    this.enemyViews.clear();
    this.layerSprites.clear();
  }
}
