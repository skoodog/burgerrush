/**
 * Threat Director.
 *
 * Scores pressure around the chef and intervenes before the AI can create a
 * hit the player could not have avoided. It delays enemies rather than
 * teleporting or despawning them, and it is fully deterministic: identical
 * inputs produce identical decisions, so replays stay exact.
 *
 * Pillar: "panic with fairness" - pressure rises, but at least one plausible
 * escape route survives wherever the topology allows one.
 */

import { THREAT_DIRECTOR } from '../config/gameplay';
import { clamp01 } from '../core/math';
import type { Enemy } from '../entities/Enemy';
import type { NavGraph } from './navGraph';

export interface ThreatReading {
  /** 0..1 aggregate pressure near the chef. */
  pressure: number;
  /** 0..1 estimate of remaining escape freedom. */
  escape: number;
  /** Distinct approach directions currently converging. */
  approachAngles: number;
  /** Enemy ids the director held back this step. */
  held: readonly number[];
}

interface ChefLike {
  x: number;
  y: number;
  onLadder: boolean;
}

export class ThreatDirector {
  private readonly heldIds: number[] = [];
  private lastReading: ThreatReading = {
    pressure: 0,
    escape: 1,
    approachAngles: 0,
    held: [],
  };

  get reading(): ThreatReading {
    return this.lastReading;
  }

  /**
   * Runs once per fixed step.
   *
   * Order of operations matters for determinism: enemies are always evaluated
   * in ascending id order, never in whatever order a Set happened to iterate.
   */
  update(chef: ChefLike, enemies: readonly Enemy[], graph: NavGraph): ThreatReading {
    this.heldIds.length = 0;

    const sorted = [...enemies].filter((e) => e.active).sort((a, b) => a.id - b.id);
    const node = graph.nearestNode(chef.x, chef.y);
    const escapeDegree = graph.escapeDegree(node);

    let pressure = 0;
    const directions = new Set<string>();
    const approaching: { enemy: Enemy; dist: number; dir: string }[] = [];

    for (const enemy of sorted) {
      const dx = enemy.x - chef.x;
      const dy = enemy.y - chef.y;
      const dist = Math.hypot(dx, dy);
      if (dist > THREAT_DIRECTOR.pressureRadius) continue;

      const closeness = 1 - dist / THREAT_DIRECTOR.pressureRadius;
      pressure += closeness * closeness;

      // Direction buckets: left/right on the same deck, above/below otherwise.
      const dir =
        Math.abs(dy) < 24 ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'above' : 'below';
      directions.add(dir);
      approaching.push({ enemy, dist, dir });
    }

    pressure = clamp01(pressure);
    // Escape freedom falls as approach directions eat into the available exits.
    const escape = clamp01(escapeDegree === 0 ? 0 : 1 - directions.size / (escapeDegree + 1));

    if (directions.size > THREAT_DIRECTOR.maxApproachAngles || escape < THREAT_DIRECTOR.escapeFloor) {
      // Hold the *furthest* attacker so the near threat stays readable and the
      // player keeps a lane. Deterministic tie-break on id.
      const ordered = approaching
        .slice()
        .sort((a, b) => b.dist - a.dist || a.enemy.id - b.enemy.id);
      const excess = Math.max(
        directions.size - THREAT_DIRECTOR.maxApproachAngles,
        escape < THREAT_DIRECTOR.escapeFloor ? 1 : 0,
      );
      for (let i = 0; i < Math.min(excess, ordered.length); i += 1) {
        const entry = ordered[i];
        if (!entry) continue;
        entry.enemy.hold(THREAT_DIRECTOR.holdSeconds);
        this.heldIds.push(entry.enemy.id);
      }
    }

    this.lastReading = {
      pressure,
      escape,
      approachAngles: directions.size,
      held: this.heldIds.slice(),
    };
    return this.lastReading;
  }

  /**
   * Validates a re-entry or portal-exit position.
   * Returns true when the spawn is far enough from the chef to be fair.
   */
  canEnterAt(x: number, y: number, chef: ChefLike): boolean {
    return Math.hypot(x - chef.x, y - chef.y) >= THREAT_DIRECTOR.reentryDistance;
  }
}
