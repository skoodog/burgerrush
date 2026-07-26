/**
 * Headless map validator.
 *
 *   npm run validate:maps -- --seed 1234
 *   npm run validate:maps -- --count 1000
 *   npm run validate:maps -- --count 1000 --ascii
 *
 * Runs every accepted map through the reachability, route-budget and fairness
 * checks in MASTER_PROMPT section 11, plus the boss-deck fairness validator.
 * Exits non-zero on the first class of failure so CI catches it.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TREAD_SEGMENT_W } from '../src/game/art/worldArt';
import { buildPatternDeck, validateDeck } from '../src/game/systems/bossPatterns';
import { BurgerStack, collectSurfaces } from '../src/game/systems/burgerStack';
import { buildNavGraph } from '../src/game/systems/navGraph';
import { TUTORIAL_MAP_A, TUTORIAL_MAP_A_ROUND_2 } from '../src/game/levels/tutorialMapA';
import type { LevelDef } from '../src/game/levels/types';
import { Rng } from '../src/game/core/rng';
import { CHEF_MOVE } from '../src/game/config/gameplay';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(HERE, '../tests/fixtures');

interface Args {
  seed: number | null;
  count: number;
  ascii: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { seed: null, count: 1, ascii: false, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--seed' && value !== undefined) {
      args.seed = Number.parseInt(value, 10);
      i += 1;
    } else if (flag === '--count' && value !== undefined) {
      args.count = Number.parseInt(value, 10);
      i += 1;
    } else if (flag === '--ascii') {
      args.ascii = true;
    } else if (flag === '--verbose') {
      args.verbose = true;
    }
  }
  return args;
}

export interface ValidationFailure {
  readonly seed: number;
  readonly check: string;
  readonly detail: string;
}

/**
 * The fixed maps in the vertical slice, plus a deterministic seeded variant of
 * each so the validator exercises the same code path the procedural generator
 * will use once it lands.
 */
function mapForSeed(seed: number): LevelDef {
  const rng = new Rng(seed);
  const base = rng.bool() ? TUTORIAL_MAP_A : TUTORIAL_MAP_A_ROUND_2;
  return { ...base, id: `${base.id}#${seed}`, round: 1 + (seed % 9) };
}

export function validateMap(level: LevelDef, seed: number): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const fail = (check: string, detail: string): void => {
    failures.push({ seed, check, detail });
  };

  const graph = buildNavGraph(level);
  const stack = new BurgerStack(level);

  // 1. Every node reachable - no stranded deck.
  if (graph.nodes.length === 0) fail('graph', 'empty navigation graph');
  else {
    const reachable = graph.reachableFrom(0);
    if (reachable.size !== graph.nodes.length) {
      fail('reachability', `${graph.nodes.length - reachable.size} unreachable nav nodes`);
    }
  }

  // 2. Every tread segment stands on a walkable surface within its layer span.
  const surfaces = collectSurfaces(level, stack);
  for (const layer of level.layers) {
    for (let i = 0; i < layer.segments; i += 1) {
      const x = layer.x + i * TREAD_SEGMENT_W + TREAD_SEGMENT_W / 2;
      const supported = surfaces.some(
        (s) => s.layerId === layer.id && x >= s.x1 - 1 && x <= s.x2 + 1,
      );
      if (!supported) fail('treadReachable', `${layer.id} segment ${i} has no surface`);
    }
    const deck = level.platforms.find(
      (p) => Math.abs(p.y - layer.y) < 2 && layer.x >= p.x1 - 2 && layer.x <= p.x2 + 2,
    );
    if (!deck) fail('layerDeck', `${layer.id} does not rest on a platform`);
  }

  // 3. Every burger has an ordered, complete layer set and a plate.
  const burgers = new Map<string, number[]>();
  for (const layer of level.layers) {
    const list = burgers.get(layer.burger) ?? [];
    list.push(layer.order);
    burgers.set(layer.burger, list);
  }
  for (const [burger, orders] of burgers) {
    const sorted = [...orders].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i] !== i) fail('layerOrder', `burger ${burger} has a gap in its layer order`);
    }
    if (!level.plates.some((p) => p.burger === burger)) {
      fail('plate', `burger ${burger} has no plate`);
    }
  }

  // 4. The burger actually completes under simulation.
  const sim = new BurgerStack(level);
  sim.forceCompleteAll();
  let guard = 0;
  while (!sim.allComplete && guard < 4000) {
    sim.update(1 / 120);
    guard += 1;
  }
  if (!sim.allComplete) fail('completable', 'burger did not land within 33 simulated seconds');

  // 5. Spawns are on a deck and separated from each other.
  for (const spawn of level.playerSpawns) {
    if (!level.platforms.some((p) => Math.abs(p.y - spawn.y) < 2 && spawn.x >= p.x1 && spawn.x <= p.x2)) {
      fail('spawn', `player spawn ${spawn.x},${spawn.y} is not on a deck`);
    }
  }
  for (const spawn of level.enemySpawns) {
    if (!level.platforms.some((p) => Math.abs(p.y - spawn.y) < 2 && spawn.x >= p.x1 && spawn.x <= p.x2)) {
      fail('spawn', `enemy spawn ${spawn.x},${spawn.y} is not on a deck`);
    }
    for (const player of level.playerSpawns) {
      if (Math.hypot(player.x - spawn.x, player.y - spawn.y) < 150) {
        fail('spawnSeparation', `enemy spawns within 150 units of a player spawn`);
      }
    }
  }

  // 6. Checkpoints are on decks - no respawn into empty air.
  for (const cp of level.checkpoints) {
    if (!level.platforms.some((p) => Math.abs(p.y - cp.y) < 2 && cp.x >= p.x1 && cp.x <= p.x2)) {
      fail('checkpoint', `checkpoint ${cp.x},${cp.y} is not on a deck`);
    }
  }

  // 7. No overlapping ladders on the same span.
  for (let i = 0; i < level.ladders.length; i += 1) {
    for (let j = i + 1; j < level.ladders.length; j += 1) {
      const a = level.ladders[i];
      const b = level.ladders[j];
      if (!a || !b) continue;
      if (Math.abs(a.x - b.x) > 6) continue;
      const overlap = Math.min(a.yBottom, b.yBottom) - Math.max(a.yTop, b.yTop);
      if (overlap > 4) fail('ladderOverlap', `${a.id} overlaps ${b.id}`);
    }
  }

  // 8. Escape topology.
  //
  // A platform *end* legitimately has one exit - you walk back the way you came.
  // What must never happen is a junction (a node on a ladder) with a single
  // exit, because that is where pursuit closes and the player needs a choice.
  const junctions = graph.nodes.filter((n) => n.ladder !== null);
  const trappedJunctions = junctions.filter((n) => graph.escapeDegree(n.id) < 2);
  if (trappedJunctions.length > 0) {
    fail(
      'escape',
      `${trappedJunctions.length}/${junctions.length} ladder junctions have a single exit`,
    );
  }
  // And the stage as a whole must contain a loop, not just a tree: a pure tree
  // makes pursuit unavoidable. |edges|/2 > |nodes|-1 proves at least one cycle.
  if (graph.edges.length / 2 <= graph.nodes.length - 1) {
    fail('escape', 'navigation graph is a tree - no alternate route exists');
  }

  // 9. Route budget.
  //
  // Two separate requirements from the brief:
  //   a) a complete enemy-free route exists inside the map's optimal window;
  //   b) a *novice* route still has a reasonable chance inside the 60s timer.
  // The novice model charges backtracking, a wrong turn per layer and one hit.
  const optimal = estimateOptimalRoute(level, graph);
  const [lo, hi] = level.targetTime;
  if (!Number.isFinite(optimal)) {
    fail('routeBudget', 'no complete route exists');
  } else {
    if (optimal > hi) fail('routeBudget', `optimal route ${optimal.toFixed(1)}s exceeds ${hi}s`);
    if (optimal < lo) fail('routeBudget', `optimal route ${optimal.toFixed(1)}s is below ${lo}s`);
    const novice = optimal * NOVICE_PENALTY + HIT_ALLOWANCE_SECONDS;
    if (novice > 60) {
      fail('noviceBudget', `novice route ${novice.toFixed(1)}s does not fit the 60s timer`);
    }
  }

  // 10. The round's boss deck leaves a survivable corridor in every step.
  const deckCheck = validateDeck(buildPatternDeck(level.round, new Rng(seed), 16));
  if (!deckCheck.ok) fail('bossFairness', `unfair pattern steps: ${deckCheck.failures.join(',')}`);

  return failures;
}

/**
 * Deterministic optimal-route estimate.
 *
 * Travels between layers on the nav graph at the chef's published speeds, then
 * charges the full width of each layer because every tread segment has to be
 * walked. Adds the authored drop anticipation per layer. It assumes perfect
 * routing and zero enemy pressure, so it is a *lower bound* on real play time -
 * which is exactly what a "can this be finished at all" budget check wants.
 */
export function estimateOptimalRoute(level: LevelDef, graph: ReturnType<typeof buildNavGraph>): number {
  const ordered = level.layers.slice().sort((a, b) => a.y - b.y || a.order - b.order);
  const start = level.playerSpawns[0] ?? { x: 160, y: 470 };
  let cursor = graph.nearestNode(start.x, start.y);
  let seconds = 0;

  const travel = (goal: number): void => {
    const path = graph.findPath(cursor, goal);
    if (path.length === 0) {
      seconds = Number.POSITIVE_INFINITY;
      return;
    }
    for (let i = 1; i < path.length; i += 1) {
      const a = graph.nodes[path[i - 1] as number];
      const b = graph.nodes[path[i] as number];
      if (!a || !b) continue;
      seconds +=
        Math.abs(b.x - a.x) / CHEF_MOVE.maxRunSpeed + Math.abs(b.y - a.y) / CHEF_MOVE.climbSpeed;
    }
    cursor = goal;
  };

  for (const layer of ordered) {
    const width = layer.segments * TREAD_SEGMENT_W;
    travel(graph.nearestNode(layer.x, layer.y));
    if (!Number.isFinite(seconds)) return seconds;
    // Cross every tread segment, then wait out the drop anticipation.
    seconds += width / CHEF_MOVE.maxRunSpeed + DROP_ANTICIPATION_SECONDS;
    cursor = graph.nearestNode(layer.x + width, layer.y);
  }
  return seconds;
}

/** Matches the arm-to-drop delay in BurgerStack. */
const DROP_ANTICIPATION_SECONDS = 0.22;
/** Backtracking and wrong turns a first-time player makes, as a multiplier. */
const NOVICE_PENALTY = 2.6;
/** One hit: the 3-second deduction plus respawn and re-approach. */
const HIT_ALLOWANCE_SECONDS = 6;

/** ASCII debug diagram - handy when a seed fails and needs eyeballing. */
export function asciiDiagram(level: LevelDef, cols = 96, rows = 26): string {
  const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(' '));
  const sx = (x: number): number => Math.max(0, Math.min(cols - 1, Math.round((x / 960) * cols)));
  const sy = (y: number): number => Math.max(0, Math.min(rows - 1, Math.round((y / 540) * rows)));

  for (const p of level.platforms) {
    for (let x = sx(p.x1); x <= sx(p.x2); x += 1) (grid[sy(p.y)] as string[])[x] = '-';
  }
  for (const l of level.ladders) {
    for (let y = sy(l.yTop); y <= sy(l.yBottom); y += 1) (grid[y] as string[])[sx(l.x)] = '#';
  }
  for (const layer of level.layers) {
    const glyph = layer.kind.startsWith('bun') ? 'B' : layer.kind[0]?.toUpperCase() ?? '?';
    for (let i = 0; i < layer.segments; i += 1) {
      (grid[sy(layer.y)] as string[])[sx(layer.x + i * TREAD_SEGMENT_W)] = glyph;
    }
  }
  for (const plate of level.plates) (grid[sy(plate.y)] as string[])[sx(plate.x)] = '=';
  for (const s of level.playerSpawns) (grid[sy(s.y)] as string[])[sx(s.x)] = 'P';
  for (const s of level.enemySpawns) (grid[sy(s.y)] as string[])[sx(s.x)] = 'E';
  return grid.map((row) => row.join('')).join('\n');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const seeds = args.seed !== null ? [args.seed] : Array.from({ length: args.count }, (_, i) => i + 1);

  const failures: ValidationFailure[] = [];
  const started = Date.now();
  let routeTotal = 0;

  for (const seed of seeds) {
    const level = mapForSeed(seed);
    const result = validateMap(level, seed);
    failures.push(...result);
    routeTotal += estimateOptimalRoute(level, buildNavGraph(level));
    if (args.ascii && (args.seed !== null || result.length > 0)) {
      console.log(`\n--- seed ${seed} (${level.id}) ---`);
      console.log(asciiDiagram(level));
    }
    if (args.verbose && result.length > 0) {
      for (const f of result) console.log(`seed ${f.seed}: ${f.check} - ${f.detail}`);
    }
  }

  const elapsed = Date.now() - started;
  console.log(
    `validate:maps  seeds=${seeds.length}  failures=${failures.length}  ` +
      `avgOptimalRoute=${(routeTotal / seeds.length).toFixed(1)}s  ${elapsed}ms`,
  );

  if (failures.length > 0) {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const file = resolve(FIXTURE_DIR, 'failing-seeds.json');
    writeFileSync(file, JSON.stringify(failures.slice(0, 200), null, 2));
    const byCheck = new Map<string, number>();
    for (const f of failures) byCheck.set(f.check, (byCheck.get(f.check) ?? 0) + 1);
    for (const [check, n] of byCheck) console.error(`  ${check}: ${n}`);
    console.error(`Wrote failing-seed fixtures to ${file}`);
    process.exitCode = 1;
    return;
  }
  console.log('All maps valid.');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop() ?? '')) {
  main();
}
