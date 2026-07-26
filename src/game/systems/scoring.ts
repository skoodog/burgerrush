/**
 * Scoring.
 *
 * Every award is a structured event so the same stream feeds the HUD, the
 * results tally, the replay record, analytics and leaderboard verification -
 * MASTER_PROMPT section 14.
 */

import { SCORE } from '../config/gameplay';
import type { PlayerSlot } from '../config/identity';

export type ScoreReason =
  | 'tread'
  | 'layerComplete'
  | 'dropLanding'
  | 'enemyCarried'
  | 'enemyFlattened'
  | 'burger'
  | 'secretRequired'
  | 'secretOptional'
  | 'fieldSpatula'
  | 'remainingTime'
  | 'bossArmourMinor'
  | 'bossArmourMajor'
  | 'pickleDisc'
  | 'bossDefeat'
  | 'bossQuickClear'
  | 'noHitStack'
  | 'noHitBoss'
  | 'siblingSync'
  | 'noWastedPortal'
  | 'unusedFieldSpatulas';

export interface ScoreEvent {
  readonly reason: ScoreReason;
  readonly points: number;
  readonly multiplier: number;
  readonly total: number;
  /** Which local player earned it; null for run-wide bonuses. */
  readonly slot: PlayerSlot | null;
  readonly at: number;
  readonly detail?: string;
}

export interface ScoreBreakdown {
  tread: number;
  layers: number;
  drops: number;
  enemies: number;
  burgers: number;
  secret: number;
  fieldSpatulas: number;
  timeBonus: number;
  bossDamage: number;
  bossClear: number;
  bonuses: number;
}

function emptyBreakdown(): ScoreBreakdown {
  return {
    tread: 0,
    layers: 0,
    drops: 0,
    enemies: 0,
    burgers: 0,
    secret: 0,
    fieldSpatulas: 0,
    timeBonus: 0,
    bossDamage: 0,
    bossClear: 0,
    bonuses: 0,
  };
}

const BUCKET: Readonly<Record<ScoreReason, keyof ScoreBreakdown>> = Object.freeze({
  tread: 'tread',
  layerComplete: 'layers',
  dropLanding: 'drops',
  enemyCarried: 'enemies',
  enemyFlattened: 'enemies',
  burger: 'burgers',
  secretRequired: 'secret',
  secretOptional: 'secret',
  fieldSpatula: 'fieldSpatulas',
  remainingTime: 'timeBonus',
  bossArmourMinor: 'bossDamage',
  bossArmourMajor: 'bossDamage',
  pickleDisc: 'bossDamage',
  bossDefeat: 'bossClear',
  bossQuickClear: 'bossClear',
  noHitStack: 'bonuses',
  noHitBoss: 'bonuses',
  siblingSync: 'bonuses',
  noWastedPortal: 'bonuses',
  unusedFieldSpatulas: 'bonuses',
});

/** Reasons that are flat bonuses and must never be multiplied by the combo. */
const UNMULTIPLIED: ReadonlySet<ScoreReason> = new Set<ScoreReason>([
  'remainingTime',
  'noHitStack',
  'noHitBoss',
  'siblingSync',
  'noWastedPortal',
  'unusedFieldSpatulas',
  'bossQuickClear',
]);

export class ScoreKeeper {
  score = 0;
  highScore = 0;
  combo = 1;
  readonly breakdown: ScoreBreakdown = emptyBreakdown();
  readonly events: ScoreEvent[] = [];

  private comboTimer = 0;
  private pickleDiscPoints = 0;
  private clock = 0;

  constructor(highScore = 0) {
    this.highScore = highScore;
  }

  reset(highScore = this.highScore): void {
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.pickleDiscPoints = 0;
    this.clock = 0;
    this.highScore = highScore;
    this.events.length = 0;
    Object.assign(this.breakdown, emptyBreakdown());
  }

  update(dt: number): void {
    this.clock += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }
  }

  /** Extends the combo window. Called by combo-worthy events. */
  bumpCombo(seconds = 2.5): void {
    this.combo = Math.min(SCORE.comboCap, this.combo + 1);
    this.comboTimer = seconds;
  }

  award(reason: ScoreReason, points: number, slot: PlayerSlot | null = null, detail?: string): ScoreEvent {
    // Destructible pickle discs are capped per encounter to prevent farming.
    let value = points;
    if (reason === 'pickleDisc') {
      const remaining = Math.max(0, SCORE.pickleDiscCap * SCORE.pickleDiscDestroyed - this.pickleDiscPoints);
      value = Math.min(points, remaining);
      this.pickleDiscPoints += value;
    }
    const multiplier = UNMULTIPLIED.has(reason) ? 1 : this.combo;
    const total = Math.round(value * multiplier);
    this.score += total;
    this.breakdown[BUCKET[reason]] += total;
    if (this.score > this.highScore) this.highScore = this.score;
    const event: ScoreEvent = {
      reason,
      points: value,
      multiplier,
      total,
      slot,
      at: this.clock,
      ...(detail !== undefined ? { detail } : {}),
    };
    this.events.push(event);
    return event;
  }

  /** Escalating award for multiple enemies caught in one ingredient drop. */
  awardEnemyDrop(count: number, slot: PlayerSlot | null = null): number {
    let total = 0;
    for (let i = 0; i < count; i += 1) {
      const points =
        i === 0
          ? SCORE.enemyFlattened
          : i === 1
            ? SCORE.enemyFlattenedSecond
            : SCORE.enemyFlattenedThird;
      total += this.award('enemyFlattened', points, slot, `drop-${i + 1}`).total;
    }
    if (count > 0) this.bumpCombo(3);
    return total;
  }

  /** Escalating award for a field spatula that lines up several foes. */
  awardFieldLineup(count: number, slot: PlayerSlot | null = null): number {
    let total = 0;
    for (let i = 0; i < count; i += 1) {
      const tier = Math.min(i, SCORE.fieldSpatulaLineup.length - 1);
      total += this.award(
        'fieldSpatula',
        SCORE.fieldSpatulaLineup[tier] as number,
        slot,
        `lineup-${i + 1}`,
      ).total;
    }
    if (count > 1) this.bumpCombo(3);
    return total;
  }

  drainEvents(): ScoreEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }
}

/** Remaining-time bonus: 100 per whole second. */
export function remainingTimeBonus(secondsRemaining: number): number {
  return Math.max(0, Math.floor(secondsRemaining)) * SCORE.remainingSecond;
}

/** Boss quick-clear bonus: 250 per whole second left on the 30-second clock. */
export function quickClearBonus(secondsRemaining: number): number {
  return Math.max(0, Math.floor(secondsRemaining)) * SCORE.bossQuickClearPerSecond;
}

/** Boss defeat award scales with the round's health multiplier. */
export function bossDefeatScore(round: number): number {
  return SCORE.bossDefeatBase + Math.max(0, round - 1) * 500;
}
