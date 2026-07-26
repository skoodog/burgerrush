/**
 * Food foe entity: nav-graph movement plus a data-driven brain.
 *
 * Three visibly distinct intelligences ship in the vertical slice:
 *  - Sunny-Side Stalker: slow refresh, deliberate wrong turns, easy to bait;
 *  - Brat Beast: committed horizontal hunter that overshoots its turns;
 *  - Pickle Phantom: extrapolates the chef 1.35s ahead and telegraphs before a
 *    high-confidence intercept.
 *
 * No enemy may teleport, read future input beyond the published lookahead,
 * ignore geometry or spawn unfairly - the Threat Director enforces the rest.
 */

import { bindClips, type BoundClip } from '../anim/clip';
import { DollRig } from '../anim/dollRig';
import { Skeleton } from '../anim/skeleton';
import { ENEMY_CLIPS, ENEMY_DOLL, ENEMY_GRAPH, enemyCollision, enemySkin } from '../rigs/enemyDoll';
import { ENEMY_BRAINS } from '../config/gameplay';
import { approach, clamp01 } from '../core/math';
import type { Rng } from '../core/rng';
import type { EnemySpecies } from '../art/enemyArt';
import type { NavGraph, NavNode } from '../systems/navGraph';

export type EnemyState = 'entering' | 'hunting' | 'telegraph' | 'held' | 'stunned' | 'carried' | 'defeated';

let clipCache: Map<string, BoundClip> | null = null;
function sharedClips(): Map<string, BoundClip> {
  if (!clipCache) clipCache = bindClips(ENEMY_CLIPS, new Skeleton(ENEMY_DOLL.skeleton));
  return clipCache;
}

export interface EnemyOptions {
  readonly id: number;
  readonly species: EnemySpecies;
  readonly x: number;
  readonly y: number;
  readonly delay: number;
}

export interface ChefSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class Enemy {
  readonly id: number;
  readonly species: EnemySpecies;
  readonly rig: DollRig;

  x: number;
  y: number;
  vx = 0;
  facing: 1 | -1 = -1;
  state: EnemyState = 'entering';
  /** Layer id the foe is standing on, so ingredient drops can carry it. */
  standingLayerId: string | null = null;
  onLadder = false;

  private readonly brain: (typeof ENEMY_BRAINS)[EnemySpecies];
  private path: number[] = [];
  private pathCursor = 0;
  private refreshTimer = 0;
  private telegraphTimer = 0;
  private holdTimer = 0;
  private stunTimer = 0;
  private enterTimer: number;
  private committedDirection = 0;
  private committedDistance = 0;
  private rage = 0;

  constructor(options: EnemyOptions) {
    this.id = options.id;
    this.species = options.species;
    this.x = options.x;
    this.y = options.y;
    this.enterTimer = options.delay;
    this.brain = ENEMY_BRAINS[options.species];
    this.rig = new DollRig({
      def: ENEMY_DOLL,
      graph: ENEMY_GRAPH,
      clips: sharedClips(),
      skin: enemySkin(options.species),
    });
    this.rig.teleport(this.x, this.y);
  }

  get collision(): { width: number; height: number } {
    return enemyCollision(this.species);
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    const c = this.collision;
    return { x: this.x - c.width / 2, y: this.y - c.height, width: c.width, height: c.height };
  }

  get active(): boolean {
    return this.state === 'hunting' || this.state === 'telegraph' || this.state === 'held';
  }

  get dangerous(): boolean {
    return this.active;
  }

  /** Rage escalation in the final 15 seconds: cadence and speed, never teleports. */
  setRage(amount: number): void {
    this.rage = clamp01(amount);
  }

  stun(seconds: number): void {
    if (this.state === 'defeated') return;
    this.state = 'stunned';
    this.stunTimer = seconds;
    this.vx = 0;
  }

  /** Held back by the Threat Director rather than allowed to close a trap. */
  hold(seconds: number): void {
    if (this.state !== 'hunting') return;
    this.state = 'held';
    this.holdTimer = seconds;
  }

  carry(): void {
    if (this.state === 'defeated') return;
    this.state = 'carried';
    this.vx = 0;
  }

  defeat(): void {
    this.state = 'defeated';
    this.vx = 0;
  }

  update(dt: number, graph: NavGraph, chef: ChefSnapshot, rng: Rng): void {
    switch (this.state) {
      case 'entering':
        this.enterTimer -= dt;
        if (this.enterTimer <= 0) {
          this.state = 'hunting';
          this.refreshTimer = 0;
        }
        break;
      case 'held':
        this.holdTimer -= dt;
        this.vx = approach(this.vx, 0, 400 * dt);
        if (this.holdTimer <= 0) this.state = 'hunting';
        break;
      case 'stunned':
        this.stunTimer -= dt;
        if (this.stunTimer <= 0) this.state = 'hunting';
        break;
      case 'telegraph':
        this.telegraphTimer -= dt;
        this.vx = approach(this.vx, 0, 600 * dt);
        if (this.telegraphTimer <= 0) this.state = 'hunting';
        break;
      case 'hunting':
        this.hunt(dt, graph, chef, rng);
        break;
      case 'carried':
      case 'defeated':
      default:
        break;
    }

    if (this.state !== 'carried') this.x += this.vx * dt;

    this.rig.x = this.x;
    this.rig.y = this.y;
    this.rig.facing = this.facing;
    this.writeAnimContext();
    this.rig.update(dt);
  }

  private hunt(dt: number, graph: NavGraph, chef: ChefSnapshot, rng: Rng): void {
    this.refreshTimer -= dt;
    if (this.refreshTimer <= 0) {
      this.refreshTimer = this.brain.pathRefresh * (1 - this.rage * 0.35);
      this.replan(graph, chef, rng);
    }

    const node = this.currentTarget(graph);
    if (!node) {
      this.vx = approach(this.vx, 0, 400 * dt);
      return;
    }

    const speed = this.brain.speed + (this.brain.rageSpeed - this.brain.speed) * this.rage;
    const dx = node.x - this.x;

    if (Math.abs(dx) < 4) {
      // Brat Beast overcommits: it slides past the node before turning.
      const overshoot = 'overshoot' in this.brain ? (this.brain.overshoot as number) : 0;
      if (overshoot > 0 && this.committedDistance < overshoot && this.committedDirection !== 0) {
        this.committedDistance += Math.abs(this.vx) * dt;
        this.vx = approach(this.vx, this.committedDirection * speed, 900 * dt);
        return;
      }
      this.advancePath(graph);
      this.committedDistance = 0;
      return;
    }

    const dir = dx > 0 ? 1 : -1;
    this.committedDirection = dir;
    this.facing = dir;

    // Long-platform acceleration for the Brat Beast.
    const longBonus =
      'longPlatformBonus' in this.brain && Math.abs(dx) > 120
        ? (this.brain.longPlatformBonus as number)
        : 0;
    this.vx = approach(this.vx, dir * (speed + longBonus), 700 * dt);

    // Vertical movement is snapped: ladders move the foe deck to deck.
    if (Math.abs(node.y - this.y) > 2) {
      this.onLadder = true;
      const vy = node.y > this.y ? speed : -speed;
      this.y += vy * dt;
      if (Math.abs(node.y - this.y) <= 2) {
        this.y = node.y;
        this.onLadder = false;
      }
      this.vx = 0;
    } else {
      this.onLadder = false;
    }
  }

  private replan(graph: NavGraph, chef: ChefSnapshot, rng: Rng): void {
    // Predictive brains aim where the chef will be, not where they are.
    const lookahead = this.brain.lookahead;
    const targetX = chef.x + chef.vx * lookahead;
    const targetY = chef.y + chef.vy * lookahead * 0.35;

    const start = graph.nearestNode(this.x, this.y);
    let goal = graph.nearestNode(targetX, targetY);

    // Deliberate "dumb" choices keep the Stalker baitable and readable.
    if (rng.next() < this.brain.mistakeRate) {
      const neighbours = graph.adjacency[start] ?? [];
      if (neighbours.length > 0) {
        const edge = graph.edges[rng.pick(neighbours as readonly number[])];
        if (edge) goal = edge.to;
      }
    }

    const path = graph.findPath(start, goal, this.brain.ladderPreference);
    if (path.length > 0) {
      this.path = path;
      this.pathCursor = path.length > 1 ? 1 : 0;

      // High-confidence intercept: pause visibly so the player can read it.
      if (this.brain.telegraphSeconds > 0) {
        const dist = Math.hypot(targetX - this.x, targetY - this.y);
        if (dist < 150 && rng.next() < 0.5) {
          this.state = 'telegraph';
          this.telegraphTimer = this.brain.telegraphSeconds;
          this.rig.context.triggers.add('telegraph');
        }
      }
    }
  }

  private currentTarget(graph: NavGraph): NavNode | null {
    if (this.pathCursor >= this.path.length) return null;
    const id = this.path[this.pathCursor];
    return id === undefined ? null : (graph.nodes[id] ?? null);
  }

  private advancePath(graph: NavGraph): void {
    if (this.pathCursor + 1 < this.path.length) {
      this.pathCursor += 1;
      const node = this.currentTarget(graph);
      if (node) this.y = Math.abs(node.y - this.y) < 2 ? node.y : this.y;
    } else {
      this.vx = 0;
      // Persistence decides whether it keeps pressing or re-plans immediately.
      this.refreshTimer = Math.min(this.refreshTimer, 1 - this.brain.persistence);
    }
  }

  private writeAnimContext(): void {
    const ctx = this.rig.context;
    ctx.velocityX = this.vx;
    ctx.runBlend = clamp01(Math.abs(this.vx) / 70);
    ctx.onLadder = this.onLadder;
    ctx.facing = this.facing;
    ctx.flags.clear();
    if (this.state === 'stunned') ctx.flags.add('stunned');
    if (this.state === 'carried') ctx.flags.add('carried');
    if (this.state === 'defeated') ctx.flags.add('flatten');
    // Telegraph triggers are set by `replan` and consumed by the animator here.
    if (this.state !== 'telegraph') ctx.triggers.delete('telegraph');
  }
}
