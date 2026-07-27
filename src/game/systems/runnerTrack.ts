/**
 * "Rush Trip" - procedural track generator for the surreal runner interlude.
 *
 * Mid-round the kitchen buckles and the game becomes an endless runner for a
 * fixed stretch, then snaps back to the Stack Phase with the timer exactly where
 * it was left. This module owns the *track*: a deterministic, seeded stream of
 * obstacles and collectibles that is guaranteed survivable.
 *
 * Design constraints, in priority order:
 *  1. never generate an unavoidable hit - validated, not hoped for;
 *  2. deterministic for a seed, so a replay reproduces the trip exactly;
 *  3. difficulty ramps across the trip rather than being flat;
 *  4. pure data, so it validates headlessly like every other system here.
 */

import { Rng } from '../core/rng';

/** Three lanes, read as floor / mid / high once the world goes sideways. */
export const RUNNER_LANES = 3;
export const LANE_HEIGHT = 92;
export const LANE_TOP = 168;

/** World units the track scrolls per second, before ramp. */
export const RUNNER_BASE_SPEED = 300;
export const RUNNER_MAX_SPEED = 520;

export type RunnerPieceKind =
  | 'obstacle'
  | 'collectible'
  | 'hazardLow'
  | 'hazardHigh'
  | 'portal';

export interface RunnerPiece {
  readonly kind: RunnerPieceKind;
  /** Distance along the track in world units. */
  readonly x: number;
  /** Lane index, 0 = top. */
  readonly lane: number;
  /** Visual variant index, for art variety. */
  readonly variant: number;
}

export interface RunnerTrack {
  readonly seed: number;
  readonly length: number;
  readonly pieces: readonly RunnerPiece[];
  /** Seconds the interlude is expected to last at the ramped speed. */
  readonly durationSeconds: number;
}

/** Minimum gap between successive obstacle groups, in world units. */
const MIN_GROUP_GAP = 210;
const MAX_GROUP_GAP = 340;

/**
 * Seconds the chef needs to shift one lane. The generator and the validator both
 * read this constant so a tuning change can never make them disagree about what
 * is reachable.
 */
export const RUNNER_LANE_CHANGE_SECONDS = 0.16;

/** Generator safety margin over the bare reachability threshold. */
const REACH_SAFETY = 1.35;

/** Speed at a given normalised progress through the trip. */
export function runnerSpeedAt(progress: number): number {
  const t = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  // Ease-in ramp: the trip accelerates as the visuals get louder.
  return RUNNER_BASE_SPEED + (RUNNER_MAX_SPEED - RUNNER_BASE_SPEED) * (t * t);
}

/**
 * Builds a track.
 *
 * Obstacle groups never occupy every lane: `blockedLanes` is capped at
 * `RUNNER_LANES - 1`, so at least one lane is always open. Successive groups are
 * spaced far enough apart that the player can always reach the open lane at the
 * current speed, which `validateRunnerTrack` re-checks independently.
 */
export function buildRunnerTrack(seed: number, lengthUnits = 6200): RunnerTrack {
  const rng = new Rng(seed);
  const pieces: RunnerPiece[] = [];

  let x = 620; // Lead-in, so the morph has room to read before the first threat.
  let previousOpenLane = 1;
  let previousX = 0;

  while (x < lengthUnits) {
    const progress = x / lengthUnits;

    // How many lanes this group blocks. Never all of them.
    const maxBlocked = Math.min(RUNNER_LANES - 1, 1 + Math.floor(progress * 2));
    const blockedCount = 1 + rng.int(0, maxBlocked - 1);

    // Choose which lane stays open. Only lanes the chef can physically reach
    // from the previous open lane in the gap available are eligible - at the
    // speed *this* group will be moving, with a safety margin. Without this the
    // late-trip gap tightening can hand out a two-lane change in one-lane time.
    const speedHere = runnerSpeedAt(progress);
    const travelSeconds = (x - previousX) / speedHere;
    const maxLaneShift = Math.floor(
      travelSeconds / (RUNNER_LANE_CHANGE_SECONDS * REACH_SAFETY),
    );

    const openCandidates: number[] = [];
    for (let lane = 0; lane < RUNNER_LANES; lane += 1) {
      const reach = Math.abs(lane - previousOpenLane);
      if (reach > maxLaneShift) continue;
      // Weight nearer lanes more heavily by pushing them in multiple times.
      const weight = reach === 0 ? 3 : reach === 1 ? 2 : 1;
      for (let w = 0; w < weight; w += 1) openCandidates.push(lane);
    }
    // Holding the current lane is always reachable, so this can never be empty.
    if (openCandidates.length === 0) openCandidates.push(previousOpenLane);
    const openLane = rng.pick(openCandidates);

    const blocked: number[] = [];
    for (let lane = 0; lane < RUNNER_LANES; lane += 1) {
      if (lane !== openLane) blocked.push(lane);
    }
    rng.shuffle(blocked);
    const used = blocked.slice(0, blockedCount);

    for (const lane of used) {
      const roll = rng.next();
      const kind: RunnerPieceKind =
        roll < 0.6 ? 'obstacle' : roll < 0.82 ? 'hazardLow' : 'hazardHigh';
      pieces.push({ kind, x, lane, variant: rng.int(0, 3) });
    }

    // Reward taking the open lane: a collectible sits in it.
    pieces.push({ kind: 'collectible', x, lane: openLane, variant: rng.int(0, 2) });

    // A short trailing ribbon of collectibles rewards holding the line.
    const ribbon = rng.int(0, 3);
    for (let i = 1; i <= ribbon; i += 1) {
      pieces.push({
        kind: 'collectible',
        x: x + i * 54,
        lane: openLane,
        variant: rng.int(0, 2),
      });
    }

    previousOpenLane = openLane;
    previousX = x;
    // Gaps tighten as the trip ramps, but never below the reachability floor.
    const gap = rng.range(MIN_GROUP_GAP, MAX_GROUP_GAP) * (1 - progress * 0.25);
    x += Math.max(MIN_GROUP_GAP * 0.75, gap);
  }

  // The exit portal always terminates the trip in the last open lane.
  pieces.push({ kind: 'portal', x: lengthUnits + 260, lane: previousOpenLane, variant: 0 });

  pieces.sort((a, b) => a.x - b.x || a.lane - b.lane);

  // Integrate 1/speed over the track to get a real duration estimate.
  let seconds = 0;
  const steps = 64;
  for (let i = 0; i < steps; i += 1) {
    seconds += lengthUnits / steps / runnerSpeedAt(i / steps);
  }

  return { seed, length: lengthUnits, pieces, durationSeconds: seconds };
}

export interface RunnerValidation {
  readonly ok: boolean;
  readonly failures: readonly string[];
}

/**
 * Independent fairness check.
 *
 * Walks the track group by group and confirms that (a) every group leaves an
 * open lane and (b) the player can physically reach it from the previous open
 * lane at the speed the track will be moving there.
 */
export function validateRunnerTrack(
  track: RunnerTrack,
  laneChangeSeconds = RUNNER_LANE_CHANGE_SECONDS,
): RunnerValidation {
  const failures: string[] = [];

  // Group blocking pieces by their x position.
  const groups = new Map<number, Set<number>>();
  for (const piece of track.pieces) {
    if (piece.kind === 'collectible' || piece.kind === 'portal') continue;
    const key = Math.round(piece.x);
    const set = groups.get(key) ?? new Set<number>();
    set.add(piece.lane);
    groups.set(key, set);
  }

  const ordered = [...groups.entries()].sort((a, b) => a[0] - b[0]);

  // Reachability is a set problem, not a single path: when a group leaves two
  // lanes open the player may be in either one at the next group. Track every
  // lane the player could occupy and fail only if that set ever empties.
  let reachable: Set<number> | null = null;
  let previousX = 0;

  for (const [x, blocked] of ordered) {
    const open: number[] = [];
    for (let lane = 0; lane < RUNNER_LANES; lane += 1) {
      if (!blocked.has(lane)) open.push(lane);
    }
    if (open.length === 0) {
      failures.push(`group at ${x} blocks every lane`);
      reachable = null;
      previousX = x;
      continue;
    }

    if (reachable === null) {
      reachable = new Set(open);
      previousX = x;
      continue;
    }

    const speed = runnerSpeedAt(x / track.length);
    const travelSeconds = (x - previousX) / speed;
    const maxShift = Math.floor(travelSeconds / laneChangeSeconds);

    const next = new Set<number>();
    for (const lane of open) {
      for (const from of reachable) {
        if (Math.abs(lane - from) <= maxShift) {
          next.add(lane);
          break;
        }
      }
    }

    if (next.size === 0) {
      failures.push(
        `group at ${x} is unreachable from lanes [${[...reachable].join(',')}]`,
      );
      // Recover so one bad group does not cascade into false positives.
      reachable = new Set(open);
    } else {
      reachable = next;
    }
    previousX = x;
  }

  return { ok: failures.length === 0, failures };
}

/** Score values for the interlude. Deliberately modest: this is a flourish. */
export const RUNNER_SCORE = {
  collectible: 150,
  survivalPerSecond: 50,
  flawless: 2_500,
} as const;
