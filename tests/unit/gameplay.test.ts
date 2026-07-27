/**
 * Gameplay-rule unit tests: identity model, burger assembly, scoring, boss
 * decks, navigation, persistence and the unlimited-ammunition invariant.
 */

import { describe, expect, it } from 'vitest';
import { BOSS_WARNING_TEXT, CHEF_MOVE, FLIGHT, RUN, SCORE, STACK_PHASE } from '@/game/config/gameplay';
import {
  accentForIdentity,
  chefSkin,
  createSelection,
  markerForSlot,
  swapIdentities,
  CHEF_IDENTITIES,
  PRESENTATIONS,
  type PlayerSelection,
} from '@/game/config/identity';
import { CHEF_COLLISION } from '@/game/rigs/chefDoll';
import { Chef } from '@/game/entities/Chef';
import { BurgerStack, collectSurfaces } from '@/game/systems/burgerStack';
import { buildNavGraph, ladderAt } from '@/game/systems/navGraph';
import { ScoreKeeper, bossDefeatScore, quickClearBonus, remainingTimeBonus } from '@/game/systems/scoring';
import { buildPatternDeck, unlockedFamilies, validateDeck } from '@/game/systems/bossPatterns';
import { TUTORIAL_MAP_A } from '@/game/levels/tutorialMapA';
import { Rng, RngStreams, formatSeed, hashString, parseSeed } from '@/game/core/rng';
import {
  defaultProfile,
  sanitizeDisplayName,
  sanitizeInitials,
  submitLocalScore,
  type LeaderboardEntry,
} from '@/game/state/persistence';
import { InputDeviceRegistry } from '@/game/input/InputDeviceRegistry';
import {
  buildRunnerTrack,
  runnerSpeedAt,
  validateRunnerTrack,
  RUNNER_BASE_SPEED,
  RUNNER_MAX_SPEED,
} from '@/game/systems/runnerTrack';

describe('chef identity model', () => {
  it('derives accent from identity only: Sal red, Pep blue', () => {
    expect(accentForIdentity('sal')).toBe('red');
    expect(accentForIdentity('pep')).toBe('blue');
    expect(markerForSlot(1)).toBe('diamond');
    expect(markerForSlot(2)).toBe('circle');
  });

  it('keeps Sal red and Pep blue in either presentation and either slot', () => {
    for (const presentation of PRESENTATIONS) {
      expect(chefSkin('sal', presentation).accent).toBe('red');
      expect(chefSkin('pep', presentation).accent).toBe('blue');
    }
  });

  it('gives Sal and Pep identical body art within a presentation', () => {
    for (const presentation of PRESENTATIONS) {
      const sal = chefSkin('sal', presentation).textures;
      const pep = chefSkin('pep', presentation).textures;
      // Head, hair and face are literally the same artwork.
      for (const key of ['chef.head', 'chef.hairBack', 'chef.hairFront', 'face.neutral']) {
        expect(pep[key]).toBe(sal[key]);
      }
      // Only the emblem letter and the accent colour differ.
      expect(pep['chef.emblem']).not.toBe(sal['chef.emblem']);
      expect(pep['chef.torso']).not.toBe(sal['chef.torso']);
    }
  });

  it('swaps identities, carrying colour with them but never the device or presentation', () => {
    const p1: PlayerSelection = createSelection(1, {
      identity: 'sal',
      presentation: 'boy',
      inputDeviceId: 'keyboard',
    });
    const p2: PlayerSelection = createSelection(2, {
      identity: 'pep',
      presentation: 'boy',
      inputDeviceId: 'gamepad-1',
    });
    swapIdentities(p1, p2);
    expect(p1.identity).toBe('pep');
    expect(p2.identity).toBe('sal');
    expect(p1.presentation).toBe('boy');
    expect(p2.presentation).toBe('boy');
    expect(p1.inputDeviceId).toBe('keyboard');
    expect(p2.inputDeviceId).toBe('gamepad-1');
    // Colour follows the identity across the swap.
    expect(p1.accent).toBe('blue');
    expect(p2.accent).toBe('red');
  });

  it('lets both players choose the same presentation and still reads apart', () => {
    const p1 = createSelection(1, { identity: 'sal', presentation: 'girl' });
    const p2 = createSelection(2, { identity: 'pep', presentation: 'girl' });
    expect(p1.presentation).toBe(p2.presentation);
    // Pep Girl is the same artwork as Sal Girl, so colour and marker carry it.
    expect(p1.accent).not.toBe(p2.accent);
    expect(markerForSlot(p1.slot)).not.toBe(markerForSlot(p2.slot));
  });

  it('gives all eight visual combinations identical collision bounds', () => {
    const boxes = new Set<string>();
    for (const identity of CHEF_IDENTITIES) {
      for (const presentation of PRESENTATIONS) {
        for (const slot of [1, 2] as const) {
          const chef = new Chef({ slot, identity, presentation });
          const b = chef.bounds;
          boxes.add(`${b.width}x${b.height}`);
        }
      }
    }
    expect(boxes.size).toBe(1);
    expect([...boxes][0]).toBe(`${CHEF_COLLISION.width}x${CHEF_COLLISION.height}`);
  });

  it('changes appearance without disturbing physics state', () => {
    const chef = new Chef({ slot: 1, identity: 'sal', presentation: 'boy' });
    chef.teleport(100, 200);
    chef.vx = 42;
    chef.setAppearance('pep', 'girl');
    expect(chef.identity).toBe('pep');
    expect(chef.presentation).toBe('girl');
    expect(chef.x).toBe(100);
    expect(chef.vx).toBe(42);
  });
});

describe('boss-flight ammunition invariant', () => {
  it('never decrements anything while firing', () => {
    const chef = new Chef({ slot: 1, identity: 'pep', presentation: 'boy' });
    chef.mode = 'flight';
    chef.fieldSpatulas = 3;
    chef.setInput({ moveX: 0, moveY: 0, fire: true, firePressed: false, actionPressed: false });

    let shots = 0;
    // 60 seconds of continuous fire.
    for (let i = 0; i < 60 * 120; i += 1) {
      chef.update(1 / 120, null);
      if (chef.tryFire()) shots += 1;
    }
    expect(chef.fieldSpatulas).toBe(3);
    // Cadence is per chef and holds for the whole encounter.
    expect(shots).toBeGreaterThan(60 * FLIGHT.fireRate * 0.9);
    expect(shots).toBeLessThan(60 * FLIGHT.fireRate * 1.1);
  });

  it('never fires when the input is released', () => {
    const chef = new Chef({ slot: 1, identity: 'sal', presentation: 'girl' });
    chef.mode = 'flight';
    chef.setInput({ moveX: 0, moveY: 0, fire: false, firePressed: false, actionPressed: false });
    for (let i = 0; i < 600; i += 1) {
      chef.update(1 / 120, null);
      expect(chef.tryFire()).toBe(false);
    }
  });

  it('keeps the finite field inventory independent of flight fire', () => {
    const chef = new Chef({ slot: 1, identity: 'sal', presentation: 'boy' });
    chef.fieldSpatulas = RUN.fieldSpatulaCount;
    expect(chef.fieldSpatulas).toBe(3);
    chef.mode = 'flight';
    chef.setInput({ moveX: 0, moveY: 0, fire: true, firePressed: true, actionPressed: false });
    for (let i = 0; i < 240; i += 1) {
      chef.update(1 / 120, null);
      chef.tryFire();
    }
    expect(chef.fieldSpatulas).toBe(3);
  });
});

describe('burger assembly', () => {
  const level = TUTORIAL_MAP_A;

  it('marks tread segments and arms a layer only when all are pressed', () => {
    const stack = new BurgerStack(level);
    const layer = stack.layers.get('a-bun-top');
    expect(layer).toBeDefined();
    if (!layer) return;
    for (let i = 0; i < layer.def.segments - 1; i += 1) {
      stack.tread(layer, layer.def.x + i * 16 + 8);
    }
    expect(layer.state).toBe('resting');
    stack.tread(layer, layer.def.x + (layer.def.segments - 1) * 16 + 8);
    expect(layer.state).toBe('armed');
  });

  it('ignores a repeated tread on the same segment', () => {
    const stack = new BurgerStack(level);
    const layer = stack.layers.get('a-patty');
    if (!layer) return;
    expect(stack.tread(layer, layer.def.x + 8)).toBe(0);
    expect(stack.tread(layer, layer.def.x + 8)).toBe(-1);
  });

  it('drops armed layers and completes the burger', () => {
    const stack = new BurgerStack(level);
    stack.forceCompleteAll();
    for (let i = 0; i < 1200; i += 1) stack.update(1 / 120);
    expect(stack.allComplete).toBe(true);
    expect(stack.completedBurgerCount).toBe(stack.requiredBurgerCount);
  });

  it('reports total tread progress for the HUD', () => {
    const stack = new BurgerStack(level);
    const before = stack.segmentProgress();
    expect(before.pressed).toBe(0);
    expect(before.total).toBe(24);
    stack.forceCompleteAll();
    expect(stack.segmentProgress().pressed).toBe(24);
  });

  it('exposes ingredient layers as standable surfaces except while falling', () => {
    const stack = new BurgerStack(level);
    expect(collectSurfaces(level, stack)).toHaveLength(
      level.platforms.length + level.layers.length,
    );
    const layer = stack.layers.get('a-bun-top');
    if (layer) layer.state = 'falling';
    expect(collectSurfaces(level, stack)).toHaveLength(
      level.platforms.length + level.layers.length - 1,
    );
  });

  it('is deterministic for identical inputs', () => {
    const run = (): number[] => {
      const stack = new BurgerStack(level);
      stack.forceCompleteAll();
      const out: number[] = [];
      for (let i = 0; i < 600; i += 1) {
        stack.update(1 / 120);
        for (const layer of stack.layers.values()) out.push(layer.y);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});

describe('navigation graph', () => {
  const graph = buildNavGraph(TUTORIAL_MAP_A);

  it('connects every node - no isolated deck', () => {
    const reachable = graph.reachableFrom(0);
    expect(reachable.size).toBe(graph.nodes.length);
  });

  it('finds a path between the far corners of the stage', () => {
    const start = graph.nearestNode(150, 470);
    const goal = graph.nearestNode(760, 158);
    const path = graph.findPath(start, goal);
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toBe(start);
    expect(path.at(-1)).toBe(goal);
  });

  it('leaves at least two escape directions from an interior node', () => {
    const node = graph.nearestNode(400, 314);
    expect(graph.escapeDegree(node)).toBeGreaterThanOrEqual(2);
  });

  it('respects blocked edges', () => {
    const start = graph.nearestNode(150, 470);
    const goal = graph.nearestNode(760, 158);
    const before = graph.findPath(start, goal).length;
    for (let i = 0; i < graph.edges.length; i += 1) {
      if (graph.edges[i]?.kind === 'ladder') graph.blockEdge(i);
    }
    expect(graph.findPath(start, goal)).toHaveLength(0);
    graph.clearBlocks();
    expect(graph.findPath(start, goal).length).toBe(before);
  });

  it('snaps to a ladder only within the snap radius', () => {
    const ladder = TUTORIAL_MAP_A.ladders[0];
    expect(ladder).toBeDefined();
    if (!ladder) return;
    expect(ladderAt(TUTORIAL_MAP_A, ladder.x, ladder.yBottom - 4, CHEF_MOVE.ladderSnapRadius)).not.toBeNull();
    expect(
      ladderAt(TUTORIAL_MAP_A, ladder.x + CHEF_MOVE.ladderSnapRadius + 5, ladder.yBottom - 4, CHEF_MOVE.ladderSnapRadius),
    ).toBeNull();
  });
});

describe('scoring', () => {
  it('applies the published table', () => {
    const score = new ScoreKeeper();
    score.award('tread', SCORE.treadSegment);
    expect(score.score).toBe(10);
    score.award('burger', SCORE.burgerComplete);
    expect(score.score).toBe(10 + 5000);
  });

  it('escalates multi-enemy ingredient drops', () => {
    const score = new ScoreKeeper();
    score.awardEnemyDrop(3);
    expect(score.score).toBe(
      SCORE.enemyFlattened + SCORE.enemyFlattenedSecond + SCORE.enemyFlattenedThird,
    );
  });

  it('escalates a field-spatula line-up', () => {
    const score = new ScoreKeeper();
    score.awardFieldLineup(3);
    expect(score.breakdown.fieldSpatulas).toBe(750 + 1500 + 3000);
  });

  it('caps the combo multiplier', () => {
    const score = new ScoreKeeper();
    for (let i = 0; i < 50; i += 1) score.bumpCombo();
    expect(score.combo).toBe(SCORE.comboCap);
  });

  it('never multiplies flat bonuses by the combo', () => {
    const score = new ScoreKeeper();
    for (let i = 0; i < 5; i += 1) score.bumpCombo();
    const event = score.award('remainingTime', 1000);
    expect(event.multiplier).toBe(1);
    expect(event.total).toBe(1000);
  });

  it('caps destructible pickle-disc farming per encounter', () => {
    const score = new ScoreKeeper();
    for (let i = 0; i < 500; i += 1) score.award('pickleDisc', SCORE.pickleDiscDestroyed);
    expect(score.breakdown.bossDamage).toBe(SCORE.pickleDiscCap * SCORE.pickleDiscDestroyed);
  });

  it('expires the combo window', () => {
    const score = new ScoreKeeper();
    score.bumpCombo(1);
    expect(score.combo).toBe(2);
    score.update(1.5);
    expect(score.combo).toBe(1);
  });

  it('computes the published time bonuses', () => {
    expect(remainingTimeBonus(12.9)).toBe(1200);
    expect(remainingTimeBonus(-3)).toBe(0);
    expect(quickClearBonus(10.4)).toBe(2500);
    expect(bossDefeatScore(1)).toBe(SCORE.bossDefeatBase);
    expect(bossDefeatScore(5)).toBeGreaterThan(SCORE.bossDefeatBase);
  });

  it('emits a structured event for every award', () => {
    const score = new ScoreKeeper();
    score.award('tread', 10, 2, 'seg-3');
    const events = score.drainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ reason: 'tread', slot: 2, detail: 'seg-3' });
    expect(score.drainEvents()).toHaveLength(0);
  });
});

describe('boss pattern decks', () => {
  it('teaches the families in order', () => {
    expect(unlockedFamilies(1)).toEqual(['pickle']);
    expect(unlockedFamilies(2)).toEqual(['pickle', 'ketchup']);
    expect(unlockedFamilies(3)).toEqual(['pickle', 'ketchup', 'mustard']);
    expect(unlockedFamilies(4)).toContain('mayo');
  });

  it('keeps round 1 a pickle-only tutorial', () => {
    const deck = buildPatternDeck(1, new Rng(1), 10);
    expect(deck.every((s) => s.family === 'pickle')).toBe(true);
  });

  it('is deterministic for a seed and never repeats a family back to back', () => {
    const a = buildPatternDeck(4, new Rng(1234), 24);
    const b = buildPatternDeck(4, new Rng(1234), 24);
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i += 1) {
      expect(a[i]?.family).not.toBe(a[i - 1]?.family);
    }
  });

  it('leaves a survivable corridor in every generated deck', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      for (const round of [1, 2, 3, 4, 9]) {
        const deck = buildPatternDeck(round, new Rng(seed), 12);
        expect(validateDeck(deck).ok).toBe(true);
      }
    }
  });
});

describe('seeded rng', () => {
  it('reproduces a sequence for the same seed', () => {
    const a = new Rng(99);
    const b = new Rng(99);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(
      Array.from({ length: 20 }, () => b.next()),
    );
  });

  it('gives independent streams that do not disturb each other', () => {
    const streams = new RngStreams(4242);
    const aiFirst = [streams.stream('ai').next(), streams.stream('ai').next()];
    const fresh = new RngStreams(4242);
    fresh.stream('map').next();
    fresh.stream('cosmetic').next();
    const aiAfter = [fresh.stream('ai').next(), fresh.stream('ai').next()];
    expect(aiFirst).toEqual(aiAfter);
  });

  it('parses and formats human seeds', () => {
    expect(parseSeed('1234')).toBe(1234);
    expect(parseSeed('midnight')).toBe(hashString('MIDNIGHT'));
    expect(formatSeed(255)).toBe('000000FF');
  });
});

describe('persistence', () => {
  it('sanitises arcade initials and display names', () => {
    expect(sanitizeInitials('a<b')).toBe('ABAA'.slice(0, 3));
    expect(sanitizeInitials('')).toBe('AAA');
    // Angle brackets and quotes are stripped, then the 16-character cap applies.
    expect(sanitizeDisplayName('<script>alert(1)</script>')).toBe('scriptalert(1)/s');
    expect(sanitizeDisplayName('<b>hi</b>')).toBe('bhi/b');
    expect(sanitizeDisplayName('a'.repeat(50))).toHaveLength(16);
  });

  it('keeps the local leaderboard sorted and capped', () => {
    let profile = defaultProfile();
    const entry = (score: number): LeaderboardEntry => ({
      initials: 'ABC',
      score,
      round: 1,
      durationSeconds: 60,
      mode: 'arcade',
      seed: 'DEADBEEF',
      bossSeed: 'CAFE',
      bossClearSeconds: 20,
      leadIdentity: 'sal',
      leadPresentation: 'girl',
      coop: false,
      version: '0.3.0',
      replayHash: 'x',
      timestamp: score,
      ranked: true,
      practiceFlags: [],
    });
    for (let i = 0; i < 30; i += 1) profile = submitLocalScore(profile, entry(i * 100), 20);
    expect(profile.leaderboard).toHaveLength(20);
    expect(profile.leaderboard[0]?.score).toBe(2900);
    expect(profile.highScore).toBe(2900);
  });
});

describe('input device ownership', () => {
  it('never lets one device drive both slots', () => {
    const registry = new InputDeviceRegistry();
    expect(registry.claim('keyboard', 1)).toBe(true);
    expect(registry.claim('keyboard', 2)).toBe(false);
    expect(registry.slotForDevice('keyboard')).toBe(1);
  });

  it('supports two gamepads joining separately', () => {
    const registry = new InputDeviceRegistry();
    const a = registry.connectGamepad(0, 'Pad A');
    const b = registry.connectGamepad(1, 'Pad B');
    expect(registry.claim(a.id, 1)).toBe(true);
    expect(registry.claim(b.id, 2)).toBe(true);
    expect(registry.deviceForSlot(1)?.id).toBe(a.id);
    expect(registry.deviceForSlot(2)?.id).toBe(b.id);
  });

  it('supports keyboard plus gamepad in either join order', () => {
    const first = new InputDeviceRegistry();
    const padA = first.connectGamepad(0, 'Pad');
    expect(first.claim('keyboard', 1)).toBe(true);
    expect(first.claim(padA.id, 2)).toBe(true);

    const second = new InputDeviceRegistry();
    const padB = second.connectGamepad(0, 'Pad');
    expect(second.claim(padB.id, 1)).toBe(true);
    expect(second.claim('keyboard', 2)).toBe(true);
  });

  it('rebinds a replacement controller to the same slot after a disconnect', () => {
    const registry = new InputDeviceRegistry();
    const pad = registry.connectGamepad(0, 'Pad A');
    registry.claim(pad.id, 2);
    registry.disconnectGamepad(0);
    expect(registry.deviceForSlot(2)?.connected).toBe(false);
    const replacement = registry.connectGamepad(3, 'Pad B');
    expect(registry.rebind(2, replacement.id)).toBe(true);
    expect(registry.deviceForSlot(2)?.id).toBe(replacement.id);
    expect(registry.slotForDevice(replacement.id)).toBe(2);
  });

  it('reuses the original device record when the same pad reconnects', () => {
    const registry = new InputDeviceRegistry();
    const pad = registry.connectGamepad(0, 'Pad A');
    registry.claim(pad.id, 1);
    registry.disconnectGamepad(0);
    const back = registry.connectGamepad(2, 'Pad A');
    expect(back.id).toBe(pad.id);
    expect(registry.deviceForSlot(1)?.id).toBe(pad.id);
    expect(back.gamepadIndex).toBe(2);
  });
});

describe('published contract values', () => {
  it('uses an exact 60-second Stack Phase', () => {
    expect(STACK_PHASE.durationSeconds).toBe(60);
    expect(STACK_PHASE.hitTimePenalty).toBe(3);
    expect(STACK_PHASE.hitInvulnSeconds).toBeCloseTo(1.25, 6);
  });

  it('renders the exact bilingual boss warning', () => {
    expect(BOSS_WARNING_TEXT.en).toBe('BOSS COMING!');
    expect(BOSS_WARNING_TEXT.ja).toBe('ボス接近！');
  });

  it('introduces exactly three field spatulas at round 10', () => {
    expect(RUN.fieldSpatulaRound).toBe(10);
    expect(RUN.fieldSpatulaCount).toBe(3);
  });

  it('starts the quick-clear clock at 30 seconds', () => {
    expect(FLIGHT.quickClearSeconds).toBe(30);
  });

  it('has no salt or pepper shaker anywhere in the enemy roster', async () => {
    const { ENEMY_SPECIES, ENEMY_DISPLAY_NAMES } = await import('@/game/art/enemyArt');
    for (const species of ENEMY_SPECIES) {
      const name = ENEMY_DISPLAY_NAMES[species].toLowerCase();
      expect(name).not.toMatch(/shaker/);
      expect(name).not.toMatch(/\bsalt\b/);
      expect(name).not.toMatch(/\bpepper\b/);
    }
  });
});

describe('surreal runner interlude track', () => {
  it('is deterministic for a seed', () => {
    const a = buildRunnerTrack(1234);
    const b = buildRunnerTrack(1234);
    expect(a.pieces).toEqual(b.pieces);
    expect(a.durationSeconds).toBeCloseTo(b.durationSeconds, 9);
  });

  it('differs between seeds', () => {
    expect(buildRunnerTrack(1).pieces).not.toEqual(buildRunnerTrack(2).pieces);
  });

  it('never blocks every lane, across many seeds', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const track = buildRunnerTrack(seed);
      const result = validateRunnerTrack(track);
      expect(result.failures).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it('always terminates with an exit portal past the end', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const track = buildRunnerTrack(seed);
      const portals = track.pieces.filter((p) => p.kind === 'portal');
      expect(portals).toHaveLength(1);
      expect(portals[0]?.x).toBeGreaterThan(track.length);
    }
  });

  it('ramps speed monotonically and stays inside its bounds', () => {
    let previous = 0;
    for (let i = 0; i <= 20; i += 1) {
      const speed = runnerSpeedAt(i / 20);
      expect(speed).toBeGreaterThanOrEqual(previous);
      expect(speed).toBeGreaterThanOrEqual(RUNNER_BASE_SPEED);
      expect(speed).toBeLessThanOrEqual(RUNNER_MAX_SPEED);
      previous = speed;
    }
    expect(runnerSpeedAt(-5)).toBe(RUNNER_BASE_SPEED);
    expect(runnerSpeedAt(9)).toBe(RUNNER_MAX_SPEED);
  });

  it('lasts long enough to read as its own mode but stays a flourish', () => {
    const track = buildRunnerTrack(7);
    expect(track.durationSeconds).toBeGreaterThan(10);
    expect(track.durationSeconds).toBeLessThan(30);
  });

  it('rewards the open lane with a collectible in every group', () => {
    const track = buildRunnerTrack(99);
    const blockedAt = new Map<number, Set<number>>();
    for (const p of track.pieces) {
      if (p.kind === 'collectible' || p.kind === 'portal') continue;
      const key = Math.round(p.x);
      const set = blockedAt.get(key) ?? new Set<number>();
      set.add(p.lane);
      blockedAt.set(key, set);
    }
    for (const [x, blocked] of blockedAt) {
      const pickup = track.pieces.find(
        (p) => p.kind === 'collectible' && Math.round(p.x) === x && !blocked.has(p.lane),
      );
      expect(pickup, `no reward in the open lane at ${x}`).toBeDefined();
    }
  });
});
