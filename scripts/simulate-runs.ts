/**
 * Headless run simulator.
 *
 *   npm run simulate:runs -- --count 200
 *   npm run simulate:runs -- --count 50 --csv artifacts/runs.csv
 *
 * Drives the real simulation systems - burger stack, nav graph, enemy brains,
 * threat director, scoring and boss decks - with a deterministic bot, and
 * reports completion rates and score distributions for balance work. No
 * renderer, no canvas, no audio.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CHEF_MOVE, SCORE, STACK_PHASE } from '../src/game/config/gameplay';
import { RngStreams } from '../src/game/core/rng';
import { Enemy } from '../src/game/entities/Enemy';
import { TREAD_SEGMENT_W } from '../src/game/art/worldArt';
import { TUTORIAL_MAP_A } from '../src/game/levels/tutorialMapA';
import type { LevelDef } from '../src/game/levels/types';
import { BurgerStack } from '../src/game/systems/burgerStack';
import { buildNavGraph } from '../src/game/systems/navGraph';
import { ScoreKeeper, remainingTimeBonus } from '../src/game/systems/scoring';
import { ThreatDirector } from '../src/game/systems/threatDirector';
import { buildPatternDeck, validateDeck } from '../src/game/systems/bossPatterns';

const STEP = 1 / 120;

interface Args {
  count: number;
  csv: string | null;
  level: LevelDef;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { count: 50, csv: null, level: TUTORIAL_MAP_A };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--count' && argv[i + 1] !== undefined) {
      args.count = Number.parseInt(argv[i + 1] as string, 10);
      i += 1;
    } else if (argv[i] === '--csv' && argv[i + 1] !== undefined) {
      args.csv = argv[i + 1] as string;
      i += 1;
    }
  }
  return args;
}

export interface RunReport {
  readonly seed: number;
  readonly cleared: boolean;
  readonly secondsRemaining: number;
  readonly score: number;
  readonly hits: number;
  readonly segments: number;
  readonly bossDeckFair: boolean;
}

/**
 * Deterministic bot.
 *
 * Walks the layer stack top-down, crossing every tread segment. It routes
 * through the nav graph rather than teleporting, takes hits when a foe reaches
 * it, and never reads enemy state to dodge - so its completion rate is a
 * conservative floor on what a competent human achieves.
 */
export function simulateRun(seed: number, level: LevelDef): RunReport {
  const streams = new RngStreams(seed);
  const graph = buildNavGraph(level);
  const stack = new BurgerStack(level);
  const score = new ScoreKeeper();
  const threat = new ThreatDirector();

  const enemies = level.enemySpawns.map(
    (spawn, i) =>
      new Enemy({ id: i + 1, species: spawn.species, x: spawn.x, y: spawn.y, delay: spawn.delay }),
  );

  const spawn = level.playerSpawns[0] ?? { x: 160, y: 470 };
  const bot = { x: spawn.x, y: spawn.y, vx: 0, vy: 0, invuln: 0, onLadder: false };
  /** Ladder the bot has committed to, held until it reaches the far deck. */
  let climbing: { x: number; deckY: number } | null = null;

  const targets = level.layers
    .slice()
    .sort((a, b) => a.y - b.y || a.order - b.order)
    .flatMap((layer) => {
      const width = layer.segments * TREAD_SEGMENT_W;
      return [
        { id: layer.id, x: layer.x + 2, y: layer.y },
        { id: layer.id, x: layer.x + width - 2, y: layer.y },
      ];
    });

  let targetIndex = 0;
  let time = STACK_PHASE.durationSeconds;
  let hits = 0;
  const aiRng = streams.stream('ai');

  while (time > 0 && !stack.allComplete) {
    time -= STEP;
    if (bot.invuln > 0) bot.invuln -= STEP;

    // --- bot movement -----------------------------------------------------
    //
    // One deck at a time: walk to a ladder that actually connects the current
    // deck to the next, climb exactly that span, then re-evaluate. The bot may
    // never traverse a gap no ladder covers, so its times are achievable.
    const target = targets[Math.min(targetIndex, targets.length - 1)];
    if (target) {
      if (climbing) {
        // Committed to a ladder: ride it all the way to the deck it serves.
        bot.onLadder = true;
        bot.x = climbing.x;
        bot.vx = 0;
        const dir = Math.sign(climbing.deckY - bot.y);
        bot.y += dir * CHEF_MOVE.climbSpeed * STEP;
        if ((dir < 0 && bot.y <= climbing.deckY) || (dir > 0 && bot.y >= climbing.deckY)) {
          bot.y = climbing.deckY;
          climbing = null;
          bot.onLadder = false;
        }
      } else {
        const dy = target.y - bot.y;
        if (Math.abs(dy) > 2) {
          const ladder = nearestLadder(level, bot.x, bot.y, target.y);
          if (ladder) {
            if (Math.abs(ladder.x - bot.x) > 3) {
              bot.vx = Math.sign(ladder.x - bot.x) * CHEF_MOVE.maxRunSpeed;
              bot.x += bot.vx * STEP;
            } else {
              climbing = { x: ladder.x, deckY: dy < 0 ? ladder.yTop : ladder.yBottom };
            }
          } else {
            // No ladder leaves this deck toward the target: walk the deck
            // looking for one rather than floating through geometry.
            bot.vx = CHEF_MOVE.maxRunSpeed * (bot.x < 480 ? 1 : -1);
            bot.x += bot.vx * STEP;
          }
        } else {
          bot.y = target.y;
          const dx = target.x - bot.x;
          bot.vx = Math.sign(dx) * CHEF_MOVE.maxRunSpeed;
          bot.x += bot.vx * STEP;
          if (Math.abs(dx) < 3) targetIndex += 1;
        }
      }
    }

    // --- tread ------------------------------------------------------------
    const layer = stack.layerAtPosition(bot.x, bot.y, 4);
    if (layer && stack.tread(layer, bot.x) >= 0) {
      score.award('tread', SCORE.treadSegment);
    }

    stack.update(STEP);
    for (const event of stack.drainEvents()) {
      if (event.type === 'layerComplete') score.award('layerComplete', SCORE.ingredientLayerComplete);
      if (event.type === 'layerLand') score.award('dropLanding', SCORE.ingredientDropLanding);
      if (event.type === 'burgerComplete') score.award('burger', SCORE.burgerComplete);
    }

    // --- enemies ----------------------------------------------------------
    for (const enemy of enemies) {
      enemy.setRage(time <= STACK_PHASE.rageAt ? 1 : 0);
      enemy.update(STEP, graph, { x: bot.x, y: bot.y, vx: bot.vx, vy: 0 }, aiRng);
      if (bot.invuln <= 0 && enemy.dangerous) {
        if (Math.abs(enemy.x - bot.x) < 16 && Math.abs(enemy.y - bot.y) < 24) {
          hits += 1;
          bot.invuln = STACK_PHASE.hitInvulnSeconds;
          time -= STACK_PHASE.hitTimePenalty;
          const checkpoint = level.checkpoints[0] ?? spawn;
          bot.x = checkpoint.x;
          bot.y = checkpoint.y;
          climbing = null;
          targetIndex = Math.max(0, targetIndex - 1);
        }
      }
    }
    threat.update(bot, enemies, graph);
  }

  const cleared = stack.allComplete;
  if (cleared) score.award('remainingTime', remainingTimeBonus(Math.max(0, time)));

  const deck = buildPatternDeck(level.round, streams.stream('boss'), 16);
  return {
    seed,
    cleared,
    secondsRemaining: Math.max(0, time),
    score: score.score,
    hits,
    segments: stack.segmentProgress().pressed,
    bossDeckFair: validateDeck(deck).ok,
  };
}

function nearestLadder(
  level: LevelDef,
  x: number,
  y: number,
  targetY: number,
): { x: number; yTop: number; yBottom: number } | null {
  const up = targetY < y;
  let best: { x: number; yTop: number; yBottom: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ladder of level.ladders) {
    const spansFrom = up ? Math.abs(ladder.yBottom - y) < 3 : Math.abs(ladder.yTop - y) < 3;
    if (!spansFrom) continue;
    const d = Math.abs(ladder.x - x);
    if (d < bestDist) {
      bestDist = d;
      best = ladder;
    }
  }
  return best;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const reports: RunReport[] = [];

  for (let seed = 1; seed <= args.count; seed += 1) {
    reports.push(simulateRun(seed, args.level));
  }

  const cleared = reports.filter((r) => r.cleared);
  const rate = cleared.length / reports.length;
  const scores = reports.map((r) => r.score).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)] ?? 0;
  const avgHits = reports.reduce((n, r) => n + r.hits, 0) / reports.length;
  const avgRemaining = cleared.reduce((n, r) => n + r.secondsRemaining, 0) / Math.max(1, cleared.length);
  const unfair = reports.filter((r) => !r.bossDeckFair);

  console.log(
    `simulate:runs  runs=${reports.length}  clearRate=${(rate * 100).toFixed(1)}%  ` +
      `medianScore=${median}  avgHits=${avgHits.toFixed(2)}  ` +
      `avgSecondsLeft=${avgRemaining.toFixed(1)}  ${Date.now() - started}ms`,
  );

  // Determinism check: the same seed must reproduce exactly.
  const first = reports[0];
  if (first) {
    const repeat = simulateRun(first.seed, args.level);
    if (repeat.score !== first.score || repeat.cleared !== first.cleared) {
      console.error('Non-deterministic run detected for seed', first.seed);
      process.exitCode = 1;
      return;
    }
  }

  if (unfair.length > 0) {
    console.error(`${unfair.length} runs drew an unfair boss deck`);
    process.exitCode = 1;
    return;
  }

  if (args.csv) {
    const file = resolve(process.cwd(), args.csv);
    mkdirSync(dirname(file), { recursive: true });
    const header = 'seed,cleared,secondsRemaining,score,hits,segments\n';
    const rows = reports
      .map((r) => `${r.seed},${r.cleared},${r.secondsRemaining.toFixed(2)},${r.score},${r.hits},${r.segments}`)
      .join('\n');
    writeFileSync(file, header + rows + '\n');
    console.log(`Wrote ${file}`);
  }

  // A bot that cannot finish the tutorial at all means the map or the timer is
  // broken, not merely unbalanced.
  if (rate < 0.5) {
    console.error(`Clear rate ${(rate * 100).toFixed(1)}% is below the 50% floor for a tutorial map.`);
    process.exitCode = 1;
  }
}

main();
