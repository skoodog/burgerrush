/**
 * Boss Flight - the mandatory second act.
 *
 * Both siblings are on screen and both visibly fire spinning spatulas. There is
 * no ammo value anywhere in this scene: `Chef.tryFire()` gates on a cadence
 * timer only, projectiles come from a fixed pool, and the pool cap degrades
 * particles rather than interrupting fire.
 */

import Phaser from 'phaser';
import { ART_RES } from '../art/atlas';
import { UI } from '../art/palette';
import {
  BOSS,
  FIXED_STEP,
  FLIGHT,
  MAX_STEPS_PER_FRAME,
  SCORE,
  VIEW,
} from '../config/gameplay';
import { accentForIdentity, ACCENT_COLORS, type PlayerSlot } from '../config/identity';
import { clamp, clamp01 } from '../core/math';
import { Chef, emptyChefInput } from '../entities/Chef';
import { ControlMap } from '../input/ControlMap';
import { CHEF_EVENTS } from '../rigs/chefClips';
import {
  buildPatternDeck,
  type CondimentFamily,
  type PatternStep,
} from '../systems/bossPatterns';
import { bossDefeatScore, quickClearBonus } from '../systems/scoring';
import type { Session} from '../state/Session';
import { SESSION_KEY } from '../state/Session';
import { DollView } from '../view/DollView';
import { backdrop, FONT_STACK, label, slotBadge } from '../ui/theme';

interface FlightPlayer {
  readonly slot: PlayerSlot;
  readonly chef: Chef;
  readonly view: DollView;
  /** True for the deterministic solo wing partner. */
  readonly wing: boolean;
  recoverTimer: number;
}

interface Projectile {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  slot: PlayerSlot;
}

interface Hazard {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  family: CondimentFamily;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  destructible: boolean;
  phase: number;
  amplitude: number;
  baseY: number;
  splits: number;
}

type FlightPhase = 'entering' | 'fighting' | 'defeated';

/**
 * Textures are painted at ART_RES pixels per world unit, so every non-doll
 * sprite renders at 1/ART_RES. (DollView applies the same factor internally.)
 */
const PX = 1 / ART_RES;
/** The Dread Stack is a *giant* burger: its parts are authored small and blown up. */
const BOSS_SCALE = 1.9;

export class BossFlightScene extends Phaser.Scene {
  private session!: Session;
  private controls!: ControlMap;
  private players: FlightPlayer[] = [];

  private projectiles: Projectile[] = [];
  private hazards: Hazard[] = [];

  private bossX = 760;
  private bossY = 260;
  private bossVy = 26;
  private bossHealth = 0;
  private bossMaxHealth = 0;
  private armourBroken = 0;
  private enraged = false;

  private deck: PatternStep[] = [];
  private deckIndex = 0;
  private stepTimer = 0;
  private stepShotsFired = 0;
  private telegraphing = false;
  private quickClear: number = FLIGHT.quickClearSeconds;

  private phase: FlightPhase = 'entering';
  private phaseTimer = 0;
  private accumulator = 0;
  private stackSeconds = 0;

  private bossContainer!: Phaser.GameObjects.Container;
  private bossFace!: Phaser.GameObjects.Image;
  private armourSprites: Phaser.GameObjects.Image[] = [];
  private healthGfx!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private warnIcon!: Phaser.GameObjects.Image;
  private warnCaption!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudQuick!: Phaser.GameObjects.Text;
  private hudAmmo!: Phaser.GameObjects.Text;

  constructor() {
    super('BossFlight');
  }

  init(data: { secondsRemaining?: number }): void {
    this.stackSeconds = data.secondsRemaining ?? 0;
  }

  create(): void {
    this.session = this.registry.get(SESSION_KEY) as Session;
    this.controls = new ControlMap(this, this.session.devices);
    this.session.noHitBoss = true;

    backdrop(this, VIEW.width, VIEW.height);
    this.drawArena();

    this.bossMaxHealth = BOSS.baseHealth + (this.session.round - 1) * BOSS.healthPerRound;
    this.bossHealth = this.bossMaxHealth;
    this.deck = buildPatternDeck(this.session.round, this.session.rng.stream('boss'), 24);
    this.quickClear = FLIGHT.quickClearSeconds;

    this.buildBoss();
    this.buildChefs();
    this.buildPools();
    this.buildHud();

    this.session.audio.unlock();
    this.session.audio.startStackMusic();
    this.session.audio.setMusicLayer(1);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  private drawArena(): void {
    const g = this.add.graphics().setDepth(0);
    for (let i = 0; i < 60; i += 1) {
      const x = (i * 137) % VIEW.width;
      const y = (i * 89) % VIEW.height;
      g.fillStyle(0xffffff, 0.06 + ((i % 5) / 5) * 0.12);
      g.fillCircle(x, y, 1 + (i % 3) * 0.6);
    }
    g.fillStyle(0x1d2a52, 0.55);
    for (let i = 0; i < 6; i += 1) {
      g.fillRoundedRect(-40 + i * 190, 430 + (i % 2) * 30, 150, 140, 10);
    }
  }

  private buildBoss(): void {
    this.bossContainer = this.add.container(this.bossX, this.bossY).setDepth(15);
    const bunTop = this.add.image(0, -48, 'boss.bunTop').setOrigin(0.5, 0.5).setScale(PX);
    const bunBottom = this.add.image(0, 52, 'boss.bunBottom').setOrigin(0.5, 0.5).setScale(PX);
    this.bossContainer.add(bunBottom);

    this.armourSprites = BOSS.armourLayers.map((kind, i) => {
      const img = this.add.image(0, 30 - i * 16, `boss.armour.${kind}`).setOrigin(0.5, 0.5).setScale(PX);
      this.bossContainer.add(img);
      return img;
    });

    this.bossContainer.add(bunTop);
    this.bossFace = this.add.image(0, -44, 'boss.face').setOrigin(0.5, 0.5).setScale(PX);
    this.bossContainer.add(this.bossFace);

    // Four clearly separated condiment ports.
    const ports: CondimentFamily[] = ['pickle', 'ketchup', 'mustard', 'mayo'];
    ports.forEach((family, i) => {
      const port = this.add.image(-44, -30 + i * 26, `boss.port.${family}`).setOrigin(0.5, 0.5);
      port.setScale(PX * 0.9);
      port.setFlipX(true);
      this.bossContainer.add(port);
      this.bossContainer.setData(`port.${family}`, port);
    });

    this.bossContainer.setScale(BOSS_SCALE);
  }

  private buildChefs(): void {
    const slots = this.session.activeSlots();
    slots.forEach((slot, i) => {
      const selection = this.session.selection(slot);
      const chef = new Chef({
        slot,
        identity: selection.identity,
        presentation: selection.presentation,
        scale: 1.05,
      });
      chef.mode = 'flight';
      chef.teleport(150 + i * 40, 260 + i * 40);
      chef.setFaceExpression('determined');
      chef.onAnimEvent((event) => {
        if (event.name === CHEF_EVENTS.flightSpatulaFire) this.session.audio.play('flightFire');
      });
      const view = new DollView(this, chef.rig, {});
      view.setDepth(22);
      this.players.push({ slot, chef, view, wing: false, recoverTimer: 0 });
    });

    // Solo: the unselected sibling flies as a deterministic wing partner and
    // fires whenever the lead fires. Neither sibling is ever visually omitted.
    if (!this.session.coop) {
      const lead = this.session.selection(1);
      const wingIdentity = lead.identity === 'sal' ? 'pep' : 'sal';
      const wingPresentation = this.session.selection(2).presentation;
      const wing = new Chef({
        slot: 2,
        identity: wingIdentity,
        presentation: wingPresentation,
        wingPartner: true,
        scale: 1.0,
      });
      wing.mode = 'flight';
      wing.teleport(150 + FLIGHT.wingOffset.x, 260 + FLIGHT.wingOffset.y);
      const view = new DollView(this, wing.rig, {});
      view.setDepth(21);
      this.players.push({ slot: 2, chef: wing, view, wing: true, recoverTimer: 0 });
    }
  }

  private buildPools(): void {
    for (let i = 0; i < FLIGHT.projectilePool; i += 1) {
      const sprite = this.add
        .image(-999, -999, 'shot.spatula')
        .setDepth(20)
        .setScale(PX)
        .setVisible(false);
      this.projectiles.push({
        sprite,
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        slot: 1,
      });
    }
    for (let i = 0; i < 90; i += 1) {
      const sprite = this.add
        .image(-999, -999, 'shot.pickle')
        .setDepth(19)
        .setScale(PX)
        .setVisible(false);
      this.hazards.push({
        sprite,
        active: false,
        family: 'pickle',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        destructible: true,
        phase: 0,
        amplitude: 0,
        baseY: 0,
        splits: 0,
      });
    }
  }

  private buildHud(): void {
    const bar = this.add.graphics().setDepth(50);
    bar.fillStyle(0x070c1c, 0.86);
    bar.fillRect(0, 0, VIEW.width, 46);
    bar.lineStyle(2, 0x2b3a63, 1);
    bar.lineBetween(0, 46, VIEW.width, 46);

    this.hudScore = this.add
      .text(18, 23, '', { fontFamily: FONT_STACK, fontSize: '18px', color: UI.text, fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(51);
    this.hudQuick = this.add
      .text(250, 23, '', { fontFamily: FONT_STACK, fontSize: '15px', color: UI.goldHi })
      .setOrigin(0, 0.5)
      .setDepth(51);
    // Infinity marker: there is no depleting ammo readout by design.
    this.hudAmmo = this.add
      .text(430, 23, 'SPATULAS ∞', { fontFamily: FONT_STACK, fontSize: '15px', color: UI.good })
      .setOrigin(0, 0.5)
      .setDepth(51);

    this.healthGfx = this.add.graphics().setDepth(51);
    this.healthText = this.add
      .text(VIEW.width - 18, 23, '', { fontFamily: FONT_STACK, fontSize: '13px', color: UI.textDim })
      .setOrigin(1, 0.5)
      .setDepth(52);

    this.warnIcon = this.add.image(VIEW.width / 2, 74, 'ui.warn.pickle').setDepth(52).setVisible(false);
    this.warnIcon.setScale(PX * 1.9);
    this.warnCaption = label(this, VIEW.width / 2, 100, '', 13, UI.goldHi).setDepth(52);

    this.players.forEach((player, i) => {
      if (player.wing && !this.session.coop) return;
      slotBadge(this, VIEW.width - 200 + i * 40, 23, player.slot, accentForIdentity(player.chef.identity), 11).setDepth(52);
    });
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
    this.phaseTimer += dt;

    if (this.phase === 'entering') {
      // Both chefs must be established in formation before control begins.
      for (const player of this.players) {
        player.chef.setInput(emptyChefInput());
        player.chef.update(dt, null);
      }
      if (this.phaseTimer > 0.7) {
        this.phase = 'fighting';
        this.phaseTimer = 0;
      }
      return;
    }

    if (this.phase === 'defeated') {
      for (const player of this.players) player.chef.update(dt, null);
      this.updateProjectiles(dt);
      if (this.phaseTimer > 2.6) this.finish();
      return;
    }

    this.quickClear = Math.max(0, this.quickClear - dt);
    if (this.quickClear === 0 && !this.enraged) this.enrage();

    this.updateChefs(dt);
    this.updateBoss(dt);
    this.updatePattern(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.resolveHits();
  }

  private updateChefs(dt: number): void {
    const lead = this.players.find((p) => !p.wing);
    for (const player of this.players) {
      const chef = player.chef;
      if (player.wing && lead) {
        // Deterministic offset formation that never covers the lead.
        const targetX = clamp(
          lead.chef.x + FLIGHT.wingOffset.x,
          FLIGHT.bounds.minX,
          FLIGHT.bounds.maxX,
        );
        const targetY = clamp(
          lead.chef.y + FLIGHT.wingOffset.y,
          FLIGHT.bounds.minY,
          FLIGHT.bounds.maxY,
        );
        if (player.recoverTimer > 0) {
          player.recoverTimer -= dt;
        } else {
          chef.x += (targetX - chef.x) * Math.min(1, dt * 6);
          chef.y += (targetY - chef.y) * Math.min(1, dt * 6);
        }
        // The wing sibling auto-fires whenever the lead fires. It must go
        // through the input, not `chef.firing`, or updateFlight would clear it.
        const wingInput = emptyChefInput();
        wingInput.fire = lead.chef.firing && player.recoverTimer <= 0;
        chef.setInput(wingInput);
        chef.update(dt, null);
      } else {
        const state = this.controls.state(player.slot);
        const input = emptyChefInput();
        input.moveX = state.moveX;
        input.moveY = state.moveY;
        input.fire = state.fire || this.session.accessibility.autoFire;
        input.firePressed = state.firePressed;
        chef.setInput(input);
        chef.update(dt, null);
      }

      if (chef.tryFire()) this.spawnSpatula(player);
    }
  }

  private updateBoss(dt: number): void {
    // Level 4+ adds active vertical movement; earlier rounds hover gently.
    const range = this.session.round >= 4 ? 130 : 60;
    const speed = this.bossVy * (this.enraged ? BOSS.enrageSpeedMultiplier : 1);
    this.bossY += speed * dt;
    if (this.bossY < 260 - range) {
      this.bossY = 260 - range;
      this.bossVy = Math.abs(this.bossVy);
    } else if (this.bossY > 260 + range) {
      this.bossY = 260 + range;
      this.bossVy = -Math.abs(this.bossVy);
    }
    this.bossX = 760 + Math.sin(this.phaseTimer * 0.7) * 14;
  }

  private updatePattern(dt: number): void {
    const step = this.deck[this.deckIndex % this.deck.length];
    if (!step) return;
    this.stepTimer += dt;

    if (this.telegraphing) {
      if (this.stepTimer >= step.telegraph) {
        this.telegraphing = false;
        this.stepTimer = 0;
        this.stepShotsFired = 0;
        this.session.audio.play(`${step.family}Shot` as 'pickleShot');
      }
      return;
    }

    if (this.stepShotsFired === 0 && this.stepTimer === dt) {
      this.showTelegraph(step);
    }

    const interval = step.duration / Math.max(1, step.shots);
    while (this.stepShotsFired < step.shots && this.stepTimer >= this.stepShotsFired * interval) {
      this.emit(step, this.stepShotsFired);
      this.stepShotsFired += 1;
    }

    if (this.stepTimer >= step.duration + 0.45) {
      this.deckIndex += 1;
      this.stepTimer = 0;
      this.stepShotsFired = 0;
      this.telegraphing = true;
      this.warnIcon.setVisible(false);
      this.warnCaption.setText('');
      const next = this.deck[this.deckIndex % this.deck.length];
      if (next) this.showTelegraph(next);
    }
  }

  private showTelegraph(step: PatternStep): void {
    // Shape glyph + caption + audio: never colour alone.
    this.warnIcon.setTexture(`ui.warn.${step.family}`);
    this.warnIcon.setVisible(true);
    this.warnCaption.setText(
      this.session.accessibility.captions ? `${step.family.toUpperCase()} INCOMING` : '',
    );
    const port = this.bossContainer.getData(`port.${step.family}`) as Phaser.GameObjects.Image | undefined;
    if (port) {
      this.tweens.add({
        targets: port,
        scaleX: { from: PX * 0.9, to: PX * 1.2 },
        yoyo: true,
        duration: 140,
        repeat: 2,
      });
    }
  }

  private emit(step: PatternStep, shotIndex: number): void {
    const arenaTop = FLIGHT.bounds.minY - 20;
    const arenaHeight = FLIGHT.bounds.maxY - arenaTop + 40;
    const originX = this.bossX - 70;

    switch (step.family) {
      case 'pickle': {
        const lane = step.lanes[shotIndex % step.lanes.length] ?? 0.5;
        this.spawnHazard('pickle', originX, arenaTop + lane * arenaHeight, -240, 0, true);
        break;
      }
      case 'ketchup': {
        const lane = step.lanes[shotIndex % step.lanes.length] ?? 0.4;
        // Thick lane jet, cannot be erased by normal spatulas.
        this.spawnHazard('ketchup', originX, arenaTop + lane * arenaHeight, -330, 0, false);
        break;
      }
      case 'mustard': {
        // Three-way fan with a predictable gap.
        for (const spread of [-0.13, 0, 0.13]) {
          const lane = clamp01((step.lanes[0] ?? 0.5) + spread);
          const h = this.spawnHazard('mustard', originX, arenaTop + lane * arenaHeight, -270, 0, false);
          if (h) {
            h.amplitude = 26;
            h.baseY = h.y;
            h.phase = shotIndex * 0.6;
          }
        }
        break;
      }
      case 'mayo': {
        const lane = step.lanes[shotIndex % step.lanes.length] ?? 0.5;
        const h = this.spawnHazard('mayo', originX, arenaTop + lane * arenaHeight, -150, 0, false);
        if (h) h.splits = 1;
        break;
      }
    }
  }

  private spawnHazard(
    family: CondimentFamily,
    x: number,
    y: number,
    vx: number,
    vy: number,
    destructible: boolean,
  ): Hazard | null {
    const hazard = this.hazards.find((h) => !h.active);
    if (!hazard) return null;
    hazard.active = true;
    hazard.family = family;
    hazard.x = x;
    hazard.y = y;
    hazard.vx = vx;
    hazard.vy = vy;
    hazard.life = 6;
    hazard.destructible = destructible;
    hazard.amplitude = 0;
    hazard.baseY = y;
    hazard.phase = 0;
    hazard.splits = 0;
    hazard.sprite.setTexture(`shot.${family}`);
    hazard.sprite.setVisible(true);
    hazard.sprite.setAlpha(0.5 + 0.5 * this.session.accessibility.projectileContrast);
    hazard.sprite.setScale(PX * (family === 'ketchup' ? 1.5 : 1.15));
    return hazard;
  }

  /**
   * Spawns one spatula.
   *
   * Deliberately reads no ammunition, magazine, reserve or field inventory. If
   * the pool is exhausted the oldest projectile is recycled - fire is never
   * interrupted, which is the unlimited-ammo invariant.
   */
  private spawnSpatula(player: FlightPlayer): void {
    let projectile = this.projectiles.find((p) => !p.active);
    if (!projectile) {
      projectile = this.projectiles.reduce((oldest, p) => (p.life < oldest.life ? p : oldest));
    }
    const chef = player.chef;
    const origin = chef.rig.socket('handNear', 6, 0);
    projectile.active = true;
    projectile.x = origin.x;
    projectile.y = origin.y;
    projectile.vx = FLIGHT.projectileSpeed;
    projectile.vy = 0;
    projectile.life = 2.2;
    projectile.slot = player.slot;
    projectile.sprite.setVisible(true);
    // Restrained slot accent - cosmetic only, never a gameplay difference.
    projectile.sprite.setTint(ACCENT_COLORS[accentForIdentity(chef.identity)]);
    projectile.sprite.setAlpha(0.95);
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.x > VIEW.width + 40) {
        p.active = false;
        p.sprite.setVisible(false);
      }
    }
  }

  private updateHazards(dt: number): void {
    for (const h of this.hazards) {
      if (!h.active) continue;
      h.x += h.vx * dt;
      h.life -= dt;
      if (h.amplitude > 0) {
        h.phase += dt * 4.2;
        h.y = h.baseY + Math.sin(h.phase) * h.amplitude;
      } else {
        h.y += h.vy * dt;
      }
      if (h.family === 'mayo' && h.splits > 0 && h.x < 340) {
        h.splits = 0;
        for (const dir of [-1, 1]) {
          const child = this.spawnHazard('mayo', h.x, h.y, h.vx * 0.8, dir * 70, false);
          if (child) child.sprite.setScale(PX * 0.7);
        }
        this.session.audio.play('mayoShot');
      }
      if (h.life <= 0 || h.x < -60) {
        h.active = false;
        h.sprite.setVisible(false);
      }
    }
  }

  private resolveHits(): void {
    // Spatulas vs boss.
    for (const p of this.projectiles) {
      if (!p.active) continue;
      if (p.x > this.bossX - 52 * BOSS_SCALE && Math.abs(p.y - this.bossY) < 66 * BOSS_SCALE) {
        p.active = false;
        p.sprite.setVisible(false);
        this.damageBoss(p.slot);
        continue;
      }
      // Basic pickle discs can be destroyed for a small capped score.
      for (const h of this.hazards) {
        if (!h.active || !h.destructible) continue;
        if (Math.abs(h.x - p.x) < 10 && Math.abs(h.y - p.y) < 10) {
          h.active = false;
          h.sprite.setVisible(false);
          p.active = false;
          p.sprite.setVisible(false);
          this.session.score.award('pickleDisc', SCORE.pickleDiscDestroyed, p.slot);
          this.session.audio.play('spatulaHit');
          break;
        }
      }
    }

    // Hazards vs chefs.
    for (const player of this.players) {
      const chef = player.chef;
      if (chef.invulnTimer > 0) continue;
      for (const h of this.hazards) {
        if (!h.active) continue;
        if (Math.abs(h.x - chef.x) > 18 || Math.abs(h.y - (chef.y - 20)) > 22) continue;
        h.active = false;
        h.sprite.setVisible(false);
        if (player.wing) {
          // The wing sibling is knocked out of formation but costs no apron.
          player.recoverTimer = FLIGHT.wingRecoverSeconds;
          chef.trigger('hit');
          chef.x -= 40;
        } else if (chef.hit()) {
          this.session.noHitBoss = false;
          this.session.audio.play('lifeLost');
          this.cameras.main.shake(160 * this.session.accessibility.screenShake, 0.007);
          if (this.session.loseApron() <= 0) {
            this.session.persist();
            this.scene.start('Results', { cleared: false, secondsRemaining: 0 });
            return;
          }
        }
        break;
      }
    }
  }

  private damageBoss(slot: PlayerSlot): void {
    this.bossHealth = Math.max(0, this.bossHealth - FLIGHT.projectileDamage);
    this.session.audio.play('spatulaHit');

    const perLayer = this.bossMaxHealth / BOSS.armourLayers.length;
    const shouldBreak = BOSS.armourLayers.length - Math.ceil(this.bossHealth / perLayer);
    if (shouldBreak > this.armourBroken) {
      this.armourBroken = shouldBreak;
      const sprite = this.armourSprites[BOSS.armourLayers.length - this.armourBroken];
      const kind = BOSS.armourLayers[BOSS.armourLayers.length - this.armourBroken];
      if (sprite && kind) {
        sprite.setTexture(`boss.armour.${kind}.cracked`);
        this.tweens.add({
          targets: sprite,
          y: sprite.y + 90,
          alpha: 0,
          angle: 22,
          duration: 620,
          ease: 'Quad.In',
        });
      }
      this.session.score.award('bossArmourMajor', SCORE.bossArmourMajor, slot);
      this.session.audio.play('armourBreak');
      this.session.audio.play('vulnerableCore');
    }

    if (this.bossHealth <= 0) this.defeatBoss(slot);
  }

  private enrage(): void {
    this.enraged = true;
    this.bossFace.setTexture('boss.faceEnraged');
    this.session.audio.play('enrage');
    this.session.audio.setMusicLayer(2);
  }

  private defeatBoss(slot: PlayerSlot): void {
    this.phase = 'defeated';
    this.phaseTimer = 0;
    this.session.audio.stopMusic();
    this.session.audio.play('bossDefeat');
    this.cameras.main.shake(420 * this.session.accessibility.screenShake, 0.01);

    // Synchronised final sibling volley.
    for (const player of this.players) {
      player.chef.trigger('finalVolley');
      player.chef.setFaceExpression('happy');
    }

    this.session.score.award('bossDefeat', bossDefeatScore(this.session.round), slot);
    this.session.score.award('bossQuickClear', quickClearBonus(this.quickClear));
    if (this.session.noHitBoss) this.session.score.award('noHitBoss', SCORE.noHitBossFlight);
    const wing = this.players.find((p) => p.wing);
    if (!wing || wing.recoverTimer <= 0) {
      this.session.score.award('siblingSync', SCORE.siblingSync);
    }

    // Break the boss into harmless ingredient pieces.
    for (let i = 0; i < 22; i += 1) {
      const piece = this.add.image(this.bossX, this.bossY, 'fx.crumb').setDepth(30).setScale(PX);
      this.tweens.add({
        targets: piece,
        x: this.bossX - 120 + Math.random() * 240,
        y: VIEW.height + 40,
        angle: Math.random() * 720 - 360,
        duration: 900 + Math.random() * 600,
        ease: 'Quad.In',
        onComplete: () => piece.destroy(),
      });
    }
    this.tweens.add({ targets: this.bossContainer, alpha: 0, scale: 0.7, duration: 900 });
  }

  private finish(): void {
    this.session.recordRound({
      round: this.session.round,
      stackScore: this.session.score.breakdown.tread + this.session.score.breakdown.layers,
      bossScore: this.session.score.breakdown.bossClear,
      secondsRemaining: this.stackSeconds,
      bossClearSeconds: FLIGHT.quickClearSeconds - this.quickClear,
      noHitStack: this.session.noHitStack,
      noHitBoss: this.session.noHitBoss,
      siblingSync: true,
    });
    this.session.persist();
    this.scene.start('Results', { cleared: true, secondsRemaining: this.stackSeconds });
  }

  // -------------------------------------------------------------------------
  // Presentation
  // -------------------------------------------------------------------------

  private render(): void {
    this.bossContainer.setPosition(this.bossX, this.bossY);
    for (const player of this.players) {
      const blink = player.chef.invulnTimer > 0 && Math.floor(player.chef.invulnTimer * 14) % 2 === 0;
      player.view.setAlpha(blink ? 0.45 : 1);
      player.view.sync();
    }
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.sprite.setPosition(p.x, p.y);
      p.sprite.rotation += 0.55;
    }
    for (const h of this.hazards) {
      if (!h.active) continue;
      h.sprite.setPosition(h.x, h.y);
      if (h.family === 'pickle') h.sprite.rotation += 0.22;
    }
    this.drawHud();
  }

  private drawHud(): void {
    this.hudScore.setText(`SCORE ${this.session.score.score.toLocaleString('en-US')}`);
    this.hudQuick.setText(`QUICK CLEAR ${this.quickClear.toFixed(1)}`);
    this.hudQuick.setColor(this.quickClear > 0 ? UI.goldHi : UI.textDim);

    const g = this.healthGfx;
    g.clear();
    // Boss health shown as ingredient armour layers, with an optional numeric
    // readout for accessibility.
    const total = BOSS.armourLayers.length;
    const remaining = total - this.armourBroken;
    for (let i = 0; i < total; i += 1) {
      const x = VIEW.width - 210 + i * 34;
      const lit = i < remaining;
      g.lineStyle(2, 0xf4f1e8, lit ? 1 : 0.3);
      g.fillStyle(0xf5b731, lit ? 0.85 : 0.1);
      g.fillRoundedRect(x, 30, 28, 8, 3);
      g.strokeRoundedRect(x, 30, 28, 8, 3);
    }
    this.healthText.setText(
      this.session.accessibility.numericBossHealth
        ? `${this.bossHealth}/${this.bossMaxHealth}`
        : 'DREAD STACK',
    );
    void this.hudAmmo;
  }

  private cleanup(): void {
    // Explicit scene-lifecycle teardown. The defeat sequence spawns tweened
    // ingredient debris and port telegraphs that outlive the scene transition
    // if they are not killed first, and their onComplete handlers then touch a
    // destroyed display list.
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const player of this.players) player.view.destroy();
    this.players = [];
    this.projectiles = [];
    this.hazards = [];
  }
}
