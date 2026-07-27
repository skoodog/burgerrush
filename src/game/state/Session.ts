/**
 * Run session: the single source of truth carried between scenes.
 *
 * Holds the run seed, mode, player selections, aprons, score and per-round
 * results. Scenes read and write it; nothing else is global.
 */

import { DEFAULT_ACCESSIBILITY, RUN, type AccessibilitySettings } from '../config/gameplay';
import {
  accentForIdentity,
  createSelection,
  type PlayerSelection,
  type PlayerSlot,
} from '../config/identity';
import { RngStreams, parseSeed } from '../core/rng';
import { InputDeviceRegistry } from '../input/InputDeviceRegistry';
import { ScoreKeeper } from '../systems/scoring';
import { AudioDirector } from '../audio/AudioDirector';
import { loadProfile, saveProfile, type Profile } from './persistence';

export type GameMode = 'arcade' | 'daily' | 'practice' | 'endless' | 'attract';

export interface RoundResult {
  readonly round: number;
  readonly stackScore: number;
  readonly bossScore: number;
  readonly secondsRemaining: number;
  readonly bossClearSeconds: number;
  readonly noHitStack: boolean;
  readonly noHitBoss: boolean;
  readonly siblingSync: boolean;
}

export class Session {
  mode: GameMode = 'arcade';
  coop = false;
  round = 1;
  aprons: number = RUN.startingAprons;
  extraApronAwarded = false;

  readonly selections: PlayerSelection[] = [createSelection(1), createSelection(2)];
  readonly score = new ScoreKeeper();
  readonly devices = new InputDeviceRegistry();
  readonly audio = new AudioDirector();
  readonly roundResults: RoundResult[] = [];

  accessibility: AccessibilitySettings = { ...DEFAULT_ACCESSIBILITY };
  profile: Profile;
  rng: RngStreams;
  seedInput = 'MIDNIGHT';

  /** Set when the current Stack Phase finished with no hits taken. */
  noHitStack = true;
  noHitBoss = true;

  constructor() {
    this.profile = loadProfile();
    this.accessibility = { ...DEFAULT_ACCESSIBILITY, ...this.profile.accessibility };
    this.score.highScore = this.profile.highScore;
    this.rng = new RngStreams(parseSeed(this.seedInput));
    // Restore last-used identity/presentation; accent is always derived.
    const p1 = this.profile.lastSelection?.[0];
    const p2 = this.profile.lastSelection?.[1];
    if (p1) {
      const s = this.selections[0] as PlayerSelection;
      s.identity = p1.identity;
      s.presentation = p1.presentation;
    }
    if (p2) {
      const s = this.selections[1] as PlayerSelection;
      s.identity = p2.identity;
      s.presentation = p2.presentation;
    }
  }

  selection(slot: PlayerSlot): PlayerSelection {
    const found = this.selections.find((s) => s.slot === slot);
    if (!found) throw new Error(`No selection for slot ${slot}`);
    // Accent is always re-derived so it can never drift from the identity.
    found.accent = accentForIdentity(found.identity);
    return found;
  }

  /** Slots that are actually playing this run. */
  activeSlots(): PlayerSlot[] {
    return this.coop ? [1, 2] : [1];
  }

  newRun(seedInput = this.seedInput, mode: GameMode = this.mode): void {
    this.seedInput = seedInput;
    this.mode = mode;
    this.round = 1;
    this.aprons = RUN.startingAprons;
    this.extraApronAwarded = false;
    this.rng = new RngStreams(parseSeed(seedInput));
    this.score.reset(this.profile.highScore);
    this.roundResults.length = 0;
    this.noHitStack = true;
    this.noHitBoss = true;
  }

  loseApron(): number {
    this.aprons = Math.max(0, this.aprons - 1);
    return this.aprons;
  }

  maybeAwardExtraApron(): boolean {
    if (this.extraApronAwarded) return false;
    if (this.score.score < RUN.extraApronScore) return false;
    this.extraApronAwarded = true;
    this.aprons += 1;
    return true;
  }

  recordRound(result: RoundResult): void {
    this.roundResults.push(result);
  }

  /** Field spatulas only exist from round 10, exactly three per Stack Phase. */
  fieldSpatulasForRound(round = this.round): number {
    return round >= RUN.fieldSpatulaRound ? RUN.fieldSpatulaCount : 0;
  }

  persist(): void {
    this.profile = {
      ...this.profile,
      highScore: Math.max(this.profile.highScore, this.score.score),
      accessibility: this.accessibility,
      lastSelection: this.selections.map((s) => ({
        identity: s.identity,
        presentation: s.presentation,
      })) as Profile['lastSelection'],
    };
    saveProfile(this.profile);
  }
}

/** One session per page load; scenes reach it through the Phaser registry. */
export const SESSION_KEY = 'burger-rush.session';
