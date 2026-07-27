/**
 * Two-face map tests.
 *
 * The failure this file exists to prevent: front and back geometry sitting at
 * identical coordinates and silently collapsing into one navigation node, which
 * would let foes cross between faces without a portal and would make the flip
 * meaningless. Everything else here follows from that.
 */

import { describe, expect, it } from 'vitest';
import { buildNavGraph, ladderAt, portalAt } from '@/game/systems/navGraph';
import { BurgerStack, collectSurfaces } from '@/game/systems/burgerStack';
import { FLIP_MAP_B } from '@/game/levels/flipMapB';
import { TUTORIAL_MAP_A } from '@/game/levels/tutorialMapA';
import { faceOf, portalTarget, type Face, type LevelDef } from '@/game/levels/types';

const level = FLIP_MAP_B;

describe('face defaults keep single-face maps unchanged', () => {
  it('treats absent face as the front', () => {
    expect(faceOf({})).toBe(0);
    expect(faceOf({ face: 1 })).toBe(1);
  });

  it('leaves the existing tutorial map entirely on face 0', () => {
    const graph = buildNavGraph(TUTORIAL_MAP_A);
    expect(graph.nodes.every((n) => n.face === 0)).toBe(true);
    expect(graph.edges.some((e) => e.kind === 'portal')).toBe(false);
  });

  it('still connects every node of the single-face map', () => {
    const graph = buildNavGraph(TUTORIAL_MAP_A);
    expect(graph.reachableFrom(0).size).toBe(graph.nodes.length);
  });
});

describe('two-face navigation graph', () => {
  const graph = buildNavGraph(level);

  it('never merges front and back nodes that share coordinates', () => {
    // The sharp version of this check. Collapsing coincident nodes does not
    // produce mixed-face edges — it silently *deletes* nodes from the second
    // face — so asserting on edges misses it entirely. Instead demand that
    // every platform end on every face resolves to a node on that same face.
    for (const platform of level.platforms) {
      const face = faceOf(platform);
      for (const x of [platform.x1 + 10, platform.x2 - 10]) {
        const found = graph.nodes.find(
          (n) => n.face === face && Math.abs(n.x - x) < 2 && Math.abs(n.y - platform.y) < 2,
        );
        expect(
          found,
          `platform ${platform.id} end x=${x} has no node on face ${face}`,
        ).toBeDefined();
      }
    }
  });

  it('keeps coincident front/back geometry as two separate nodes', () => {
    // f0-floor and f1-floor are the same span at the same height on both faces,
    // so their end nodes are coincident in world space by construction.
    const front = level.platforms.find((p) => p.id === 'f0-floor')!;
    const back = level.platforms.find((p) => p.id === 'f1-floor')!;
    expect(front.y).toBe(back.y);
    expect(front.x1).toBe(back.x1);

    const at = (face: Face, x: number) =>
      graph.nodes.find((n) => n.face === face && Math.abs(n.x - x) < 2 && Math.abs(n.y - front.y) < 2);

    for (const x of [front.x1 + 10, front.x2 - 10]) {
      const a = at(0, x);
      const b = at(1, x);
      expect(a, `no front node at ${x}`).toBeDefined();
      expect(b, `no back node at ${x} — the faces were merged`).toBeDefined();
      expect(a!.id).not.toBe(b!.id);
    }
  });

  it('has exactly as many nodes as the two faces contribute separately', () => {
    const perFace = ([0, 1] as Face[]).map(
      (f) => graph.nodes.filter((n) => n.face === f).length,
    );
    expect(perFace[0]).toBeGreaterThan(0);
    expect(perFace[1]).toBeGreaterThan(0);
    expect(perFace[0]! + perFace[1]!).toBe(graph.nodes.length);
  });

  it('builds nodes for both faces', () => {
    expect(graph.nodes.some((n) => n.face === 0)).toBe(true);
    expect(graph.nodes.some((n) => n.face === 1)).toBe(true);
  });

  it('gives walk and ladder edges both endpoints on one face', () => {
    for (const edge of graph.edges) {
      if (edge.kind === 'portal') continue;
      const a = graph.nodes[edge.from];
      const b = graph.nodes[edge.to];
      expect(a?.face).toBe(b?.face);
    }
  });

  it('creates a portal edge for every authored portal, in both directions', () => {
    const portalEdges = graph.edges.filter((e) => e.kind === 'portal');
    // link() emits both directions, so two edges per portal.
    expect(portalEdges.length).toBe(level.portals.length * 2);
    expect(portalEdges.some((e) => graph.nodes[e.from]?.face !== graph.nodes[e.to]?.face)).toBe(true);
  });

  it('makes the back face reachable from the front spawn, and only via a portal', () => {
    const spawn = level.playerSpawns[0];
    expect(spawn).toBeDefined();
    const start = graph.nearestNode(spawn!.x, spawn!.y, true, 0);
    expect(graph.nodes[start]?.face).toBe(0);

    const reachable = graph.reachableFrom(start);
    const reachedBack = [...reachable].filter((id) => graph.nodes[id]?.face === 1);
    expect(reachedBack.length).toBeGreaterThan(0);

    // Remove the portals and the back face must become unreachable.
    graph.edges.forEach((e, i) => {
      if (e.kind === 'portal') graph.blockEdge(i);
    });
    const withoutPortals = graph.reachableFrom(start);
    expect([...withoutPortals].every((id) => graph.nodes[id]?.face === 0)).toBe(true);
    graph.clearBlocks();
  });

  it('reaches every node from the spawn once portals are open', () => {
    const spawn = level.playerSpawns[0]!;
    const start = graph.nearestNode(spawn.x, spawn.y, true, 0);
    expect(graph.reachableFrom(start).size).toBe(graph.nodes.length);
  });

  it('confines nearestNode to the requested face', () => {
    for (const face of [0, 1] as Face[]) {
      const id = graph.nearestNode(200, 470, true, face);
      expect(graph.nodes[id]?.face).toBe(face);
    }
  });

  it('routes across faces through a portal rather than walking there', () => {
    const start = graph.nearestNode(160, 470, true, 0);
    const goal = graph.nearestNode(500, 230, true, 1);
    const path = graph.findPath(start, goal);
    expect(path.length).toBeGreaterThan(1);
    expect(graph.nodes[path[0]!]?.face).toBe(0);
    expect(graph.nodes[path.at(-1)!]?.face).toBe(1);

    // The route must contain exactly one face change, and it must be a portal.
    let changes = 0;
    for (let i = 0; i + 1 < path.length; i += 1) {
      if (graph.nodes[path[i]!]?.face !== graph.nodes[path[i + 1]!]?.face) changes += 1;
    }
    expect(changes).toBe(1);
  });
});

describe('portal geometry', () => {
  it('mirrors x by default and keeps the height', () => {
    const portal = level.portals[0]!;
    const target = portalTarget(level, portal);
    expect(target.x).toBe((level.width ?? 960) - portal.x);
    expect(target.y).toBe(portal.y);
    expect(target.face).toBe(portal.targetFace);
  });

  it('honours an explicit landing when one is authored', () => {
    const custom: LevelDef = {
      ...level,
      portals: [{ id: 'p', x: 100, y: 470, face: 0, targetFace: 1, targetX: 333, targetY: 350 }],
    };
    expect(portalTarget(custom, custom.portals[0]!)).toEqual({ x: 333, y: 350, face: 1 });
  });

  it('lands every portal on a real platform of the target face', () => {
    for (const portal of level.portals) {
      const target = portalTarget(level, portal);
      const standable = level.platforms.some(
        (p) =>
          faceOf(p) === target.face &&
          Math.abs(p.y - target.y) < 2 &&
          target.x >= p.x1 &&
          target.x <= p.x2,
      );
      expect(standable, `portal ${portal.id} lands off-platform`).toBe(true);
    }
  });

  it('finds a portal only on the face the chef is actually on', () => {
    const portal = level.portals[0]!;
    expect(portalAt(level, portal.x, portal.y, 24, 0)?.id).toBe(portal.id);
    expect(portalAt(level, portal.x, portal.y, 24, 1)).toBeNull();
  });

  it('does not report a portal the chef is nowhere near', () => {
    expect(portalAt(level, 880, 150, 24, 0)).toBeNull();
  });
});

describe('face-scoped surfaces and ladders', () => {
  it('gives each face only its own platforms', () => {
    const stack = new BurgerStack(level);
    const front = collectSurfaces(level, stack, 0);
    const back = collectSurfaces(level, stack, 1);

    const frontPlatforms = level.platforms.filter((p) => faceOf(p) === 0).length;
    const backPlatforms = level.platforms.filter((p) => faceOf(p) === 1).length;
    const frontLayers = level.layers.filter((l) => faceOf(l) === 0).length;
    const backLayers = level.layers.filter((l) => faceOf(l) === 1).length;

    expect(front).toHaveLength(frontPlatforms + frontLayers);
    expect(back).toHaveLength(backPlatforms + backLayers);
  });

  it('defaults to the front so existing callers are unaffected', () => {
    const stack = new BurgerStack(level);
    expect(collectSurfaces(level, stack)).toEqual(collectSurfaces(level, stack, 0));
  });

  it('snaps only to ladders on the chef current face', () => {
    const front = level.ladders.find((l) => faceOf(l) === 0)!;
    expect(ladderAt(level, front.x, front.yBottom - 4, 14, 0)?.id).toBe(front.id);
    expect(ladderAt(level, front.x, front.yBottom - 4, 14, 1)).toBeNull();
  });
});

describe('the secret burger', () => {
  it('lives entirely on the back face', () => {
    const secret = level.layers.filter((l) => l.secret);
    expect(secret.length).toBeGreaterThan(0);
    expect(secret.every((l) => faceOf(l) === 1)).toBe(true);
  });

  it('is optional, so the round is completable without ever flipping', () => {
    expect(level.secret).toBe('optional-bonus');
    const required = level.layers.filter((l) => !l.secret);
    expect(required.every((l) => faceOf(l) === 0)).toBe(true);
    expect(required.length).toBeGreaterThan(0);
  });

  it('declares two faces', () => {
    expect(level.faces).toBe(2);
  });
});
