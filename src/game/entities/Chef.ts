/**
 * Chef entity - the wiring between gameplay and the doll rig.
 *
 * The entity owns physics and rules; the rig owns pose. They meet in exactly one
 * place: `writeAnimContext()`, which translates simulation state into the
 * blackboard the animation state machine reads. Nothing in the rig knows about
 * ladders, ingredients or aprons, and nothing in the physics knows about clips.
 *
 * Identity, presentation and player slot are pure skin data, so every visual
 * combination runs this exact code path with identical constants.
 */

import { bindClips } from '../anim/clip';
import { DollRig } from '../anim/dollRig';
import type { BoundClip } from '../anim/clip';
import { Skeleton } from '../anim/skeleton';
import { CHEF_COLLISION, CHEF_DOLL } from '../rigs/chefDoll';
import { CHEF_CLIPS, CHEF_EVENTS } from '../rigs/chefClips';
import { CHEF_FLAGS, CHEF_GAMEPLAY_GRAPH, CHEF_TRIGGERS } from '../rigs/chefGraph';
import { CHEF_MOVE, FLIGHT, STACK_PHASE } from '../config/gameplay';
import {
  chefSkin,
  type ChefIdentity,
  type GenderPresentation,
  type PlayerSlot,
} from '../config/identity';
import { approach, clamp, clamp01, sign } from '../core/math';
import type { LevelDef } from '../levels/types';
import { ladderAt } from '../systems/navGraph';
import type { SurfaceQuery } from '../systems/burgerStack';
import type { ClipEvent } from '../anim/types';

/** Per-step control input. Produced by the input layer, never read from devices here. */
export interface ChefInput {
  moveX: number;
  moveY: number;
  /** Held fire - unlimited during Boss Flight, one-shot for a field spatula. */
  fire: boolean;
  firePressed: boolean;
  actionPressed: boolean;
}

export function emptyChefInput(): ChefInput {
  return { moveX: 0, moveY: 0, fire: false, firePressed: false, actionPressed: false };
}

export type ChefMode = 'stack' | 'warning' | 'launch' | 'flight' | 'results';

let clipCache: Map<string, BoundClip> | null = null;

/** Clips are compiled once against the shared skeleton and reused by every chef. */
function sharedClips(): Map<string, BoundClip> {
  if (!clipCache) {
    clipCache = bindClips(CHEF_CLIPS, new Skeleton(CHEF_DOLL.skeleton));
  }
  return clipCache;
}

export interface ChefOptions {
  readonly slot: PlayerSlot;
  readonly identity: ChefIdentity;
  readonly presentation: GenderPresentation;
  /** Solo wing partners are AI-driven and never consume an apron. */
  readonly wingPartner?: boolean;
  readonly scale?: number;
}

export class Chef {
  readonly rig: DollRig;
  readonly slot: PlayerSlot;
  readonly wingPartner: boolean;

  identity: ChefIdentity;
  presentation: GenderPresentation;

  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  grounded = true;
  onLadder = false;
  ladderId: string | null = null;
  mode: ChefMode = 'stack';

  /** Frames of visible invulnerability after a hit. */
  invulnTimer = 0;
  hitStopTimer = 0;
  alive = true;

  /** Finite Stack Phase inventory. Boss Flight never touches this. */
  fieldSpatulas = 0;
  /** Continuous Boss Flight fire timer. There is no ammo counter by design. */
  private fireCooldown = 0;
  firing = false;

  /** Surface the chef is standing on, for substrate footstep audio. */
  standingLayerId: string | null = null;

  private readonly input: ChefInput = emptyChefInput();
  private ladderIntentTimer = 0;
  private coyoteTimer = 0;
  private lastFacing: 1 | -1 = 1;
  private readonly triggers = new Set<string>();
  private readonly listeners: ((event: ClipEvent) => void)[] = [];

  constructor(options: ChefOptions) {
    this.slot = options.slot;
    this.identity = options.identity;
    this.presentation = options.presentation;
    this.wingPartner = options.wingPartner ?? false;

    this.rig = new DollRig({
      def: CHEF_DOLL,
      graph: CHEF_GAMEPLAY_GRAPH,
      clips: sharedClips(),
      skin: chefSkin(options.identity, options.presentation),
      ...(options.scale !== undefined ? { scale: options.scale } : {}),
    });

    this.rig.animator.onEvent((event) => {
      for (const listener of this.listeners) listener(event);
    });
  }

  /** Collision bounds - identical for every identity/presentation/slot. */
  get bounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - CHEF_COLLISION.width / 2,
      y: this.y + CHEF_COLLISION.offsetY - CHEF_COLLISION.height / 2,
      width: CHEF_COLLISION.width,
      height: CHEF_COLLISION.height,
    };
  }

  onAnimEvent(listener: (event: ClipEvent) => void): void {
    this.listeners.push(listener);
  }

  /** Applies a new identity/presentation without touching physics or the graph. */
  setAppearance(identity: ChefIdentity, presentation: GenderPresentation): void {
    this.identity = identity;
    this.presentation = presentation;
    this.rig.setSkin(chefSkin(identity, presentation));
  }

  setFaceExpression(expression: string): void {
    this.rig.animator.setSlot('slot.face', `face.${expression}`);
  }

  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rig.teleport(x, y);
  }

  trigger(name: string): void {
    this.triggers.add(name);
  }

  setInput(input: Readonly<ChefInput>): void {
    this.input.moveX = input.moveX;
    this.input.moveY = input.moveY;
    this.input.fire = input.fire;
    this.input.firePressed = input.firePressed;
    this.input.actionPressed = input.actionPressed;
  }

  hit(): boolean {
    if (this.invulnTimer > 0 || !this.alive) return false;
    this.invulnTimer = STACK_PHASE.hitInvulnSeconds;
    this.hitStopTimer = STACK_PHASE.hitStopSeconds;
    this.trigger(CHEF_TRIGGERS.hit);
    this.setFaceExpression('hurt');
    return true;
  }

  respawn(x: number, y: number): void {
    this.teleport(x, y);
    this.invulnTimer = STACK_PHASE.hitInvulnSeconds;
    this.trigger(CHEF_TRIGGERS.respawn);
    this.setFaceExpression('determined');
  }

  // -------------------------------------------------------------------------
  // Fixed-step update
  // -------------------------------------------------------------------------

  update(dt: number, level: LevelDef | null, surfaces: readonly SurfaceQuery[] = []): void {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      this.writeAnimContext(dt);
      this.rig.update(dt);
      return;
    }

    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    switch (this.mode) {
      case 'flight':
        this.updateFlight(dt);
        break;
      case 'warning':
      case 'launch':
      case 'results':
        // Scripted beats drive position; the rig still ticks so cloth settles.
        break;
      case 'stack':
      default:
        if (level) this.updateStack(dt, level, surfaces);
        break;
    }

    this.rig.x = this.x;
    this.rig.y = this.y;
    this.rig.facing = this.facing;
    this.writeAnimContext(dt);
    this.rig.update(dt);
    this.triggers.clear();
  }

  private updateStack(dt: number, level: LevelDef, surfaces: readonly SurfaceQuery[]): void {
    const input = this.input;

    // --- ladder acquisition ------------------------------------------------
    const wantsVertical = Math.abs(input.moveY) > 0.4;
    const ladder = ladderAt(level, this.x, this.y, CHEF_MOVE.ladderSnapRadius);
    if (Math.abs(input.moveX) > 0.4) {
      this.ladderIntentTimer = CHEF_MOVE.ladderIntentWindow;
    } else if (this.ladderIntentTimer > 0) {
      this.ladderIntentTimer -= dt;
    }

    if (this.onLadder) {
      if (!ladder) {
        this.onLadder = false;
        this.ladderId = null;
      }
    } else if (ladder && wantsVertical && this.ladderIntentTimer <= 0) {
      // No accidental grabs while holding a direction, per the movement brief.
      const goingUp = input.moveY < 0;
      const canGoUp = this.y > ladder.yTop + 2;
      const canGoDown = this.y < ladder.yBottom - 2;
      if ((goingUp && canGoUp) || (!goingUp && canGoDown)) {
        this.onLadder = true;
        this.ladderId = ladder.id;
        this.x = ladder.x;
        this.vx = 0;
      }
    }

    if (this.onLadder && ladder) {
      this.x = ladder.x;
      this.vy = input.moveY * CHEF_MOVE.climbSpeed;
      this.y = clamp(this.y + this.vy * dt, ladder.yTop, ladder.yBottom);
      this.grounded = false;
      // Stepping off the top or bottom returns to normal ground movement.
      if (this.y <= ladder.yTop + 0.5 && input.moveY < 0) {
        this.onLadder = false;
        this.ladderId = null;
        this.y = ladder.yTop;
        this.grounded = true;
      } else if (this.y >= ladder.yBottom - 0.5 && input.moveY > 0) {
        this.onLadder = false;
        this.ladderId = null;
        this.y = ladder.yBottom;
        this.grounded = true;
      }
      if (Math.abs(input.moveX) > 0.6 && Math.abs(input.moveY) < 0.2) {
        this.onLadder = false;
        this.ladderId = null;
      }
      return;
    }

    // --- horizontal ---------------------------------------------------------
    const target = input.moveX * CHEF_MOVE.maxRunSpeed;
    const reversing = target !== 0 && sign(target) !== sign(this.vx) && this.vx !== 0;
    const rate = target === 0 ? CHEF_MOVE.decel : reversing ? CHEF_MOVE.turnAccel : CHEF_MOVE.accel;
    this.vx = approach(this.vx, target, rate * dt);

    if (Math.abs(input.moveX) > 0.3) {
      const want: 1 | -1 = input.moveX > 0 ? 1 : -1;
      if (want !== this.facing) {
        this.facing = want;
        if (Math.abs(this.vx) > CHEF_MOVE.maxRunSpeed * 0.35) this.trigger(CHEF_TRIGGERS.pivot);
      }
    }

    this.x += this.vx * dt;

    // --- vertical / surfaces -------------------------------------------------
    const prevY = this.y;
    this.vy = Math.min(CHEF_MOVE.maxFallSpeed, this.vy + CHEF_MOVE.gravity * dt);
    const nextY = this.y + this.vy * dt;

    let landed: SurfaceQuery | null = null;
    for (const surface of surfaces) {
      if (this.x < surface.x1 - 2 || this.x > surface.x2 + 2) continue;
      if (prevY <= surface.y + 1 && nextY >= surface.y) {
        if (!landed || surface.y < landed.y) landed = surface;
      }
    }

    if (landed) {
      this.y = landed.y;
      this.vy = 0;
      if (!this.grounded) this.trigger(CHEF_TRIGGERS.compress);
      this.grounded = true;
      this.coyoteTimer = CHEF_MOVE.edgeForgiveness;
      this.standingLayerId = landed.layerId;
    } else {
      this.y = nextY;
      if (this.grounded) {
        this.coyoteTimer = CHEF_MOVE.edgeForgiveness;
        this.grounded = false;
      } else if (this.coyoteTimer > 0) {
        this.coyoteTimer -= dt;
      }
      this.standingLayerId = null;
    }

    // Keep the chef inside the play field.
    this.x = clamp(this.x, 80, 880);

    // --- field spatula -------------------------------------------------------
    if (input.firePressed && this.fieldSpatulas > 0) {
      this.fieldSpatulas -= 1;
      this.trigger(CHEF_TRIGGERS.throwField);
    }
  }

  private updateFlight(dt: number): void {
    const input = this.input;
    const tx = input.moveX * FLIGHT.moveSpeed;
    const ty = input.moveY * FLIGHT.moveSpeed;
    this.vx = approach(this.vx, tx, (tx === 0 ? FLIGHT.decel : FLIGHT.accel) * dt);
    this.vy = approach(this.vy, ty, (ty === 0 ? FLIGHT.decel : FLIGHT.accel) * dt);
    this.x = clamp(this.x + this.vx * dt, FLIGHT.bounds.minX, FLIGHT.bounds.maxX);
    this.y = clamp(this.y + this.vy * dt, FLIGHT.bounds.minY, FLIGHT.bounds.maxY);
    this.facing = 1;

    // Unlimited fire: a cadence timer, never an ammunition value.
    this.firing = input.fire;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
  }

  /**
   * Boss Flight fire gate.
   *
   * Returns true when a spatula should spawn this step. There is deliberately no
   * ammo, reserve, magazine, heat or field-inventory coupling anywhere in this
   * method - the unlimited-ammunition invariant lives here and is asserted by
   * tests/unit/flightAmmo.test.ts.
   */
  tryFire(): boolean {
    if (!this.firing) return false;
    if (this.fireCooldown > 0) return false;
    this.fireCooldown = 1 / FLIGHT.fireRate;
    return true;
  }

  /**
   * Translates simulation state into the animation blackboard.
   *
   * This is the entire gameplay -> animation contract. Adding a gameplay state
   * means adding a flag here and a transition in the graph; it never means
   * touching the rig, the clips or the renderer.
   */
  private writeAnimContext(dt: number): void {
    const ctx = this.rig.context;
    ctx.velocityX = this.vx;
    ctx.velocityY = this.vy;
    ctx.runBlend = clamp01(Math.abs(this.vx) / CHEF_MOVE.maxRunSpeed);
    ctx.grounded = this.grounded;
    ctx.onLadder = this.onLadder;
    ctx.climbing = this.onLadder && Math.abs(this.input.moveY) > 0.2;
    ctx.inputX = this.input.moveX;
    ctx.inputY = this.input.moveY;
    ctx.facing = this.facing;
    ctx.stateTime += dt;

    ctx.triggers.clear();
    for (const trigger of this.triggers) ctx.triggers.add(trigger);

    ctx.flags.clear();
    if (this.mode === 'warning') ctx.flags.add(CHEF_FLAGS.bossWarning);
    if (this.mode === 'launch') {
      ctx.flags.add(CHEF_FLAGS.bossWarning);
      ctx.flags.add(CHEF_FLAGS.launching);
    }
    if (this.mode === 'flight') ctx.flags.add(CHEF_FLAGS.flying);
    if (this.firing) ctx.flags.add(CHEF_FLAGS.firing);

    if (this.lastFacing !== this.facing) this.lastFacing = this.facing;
  }
}

export const CHEF_ANIM_EVENTS = CHEF_EVENTS;
