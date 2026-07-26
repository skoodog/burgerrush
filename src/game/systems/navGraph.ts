/**
 * Enemy navigation graph.
 *
 * Built once per level from the same data the renderer uses, so an enemy can
 * never path through geometry the player cannot see. Edges carry a kind so
 * brains can express ladder preference, and edges can be temporarily blocked
 * (a melting Cheese Creep, a dropping ingredient) without rebuilding the graph.
 *
 * Pure data + pure functions: the whole thing is exercised headlessly by the map
 * validator and the deterministic bot.
 */

import type { LadderDef, LevelDef, PlatformDef } from '../levels/types';

export type EdgeKind = 'walk' | 'ladder' | 'portal';

export interface NavNode {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** Platform id this node stands on, when it is a ground node. */
  readonly platform: string | null;
  readonly ladder: string | null;
}

export interface NavEdge {
  readonly from: number;
  readonly to: number;
  readonly kind: EdgeKind;
  readonly cost: number;
  readonly ladder: string | null;
}

export class NavGraph {
  readonly nodes: readonly NavNode[];
  readonly edges: readonly NavEdge[];
  readonly adjacency: readonly (readonly number[])[];
  private readonly blocked = new Set<number>();

  constructor(nodes: NavNode[], edges: NavEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    const adjacency: number[][] = nodes.map(() => []);
    edges.forEach((edge, i) => {
      (adjacency[edge.from] as number[]).push(i);
    });
    this.adjacency = adjacency;
  }

  blockEdge(index: number): void {
    this.blocked.add(index);
  }

  unblockEdge(index: number): void {
    this.blocked.delete(index);
  }

  clearBlocks(): void {
    this.blocked.clear();
  }

  isBlocked(index: number): boolean {
    return this.blocked.has(index);
  }

  /** Nearest node to a world position. Ties break on lower index for determinism. */
  nearestNode(x: number, y: number, preferPlatform = true): number {
    let best = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const node of this.nodes) {
      // Vertical distance dominates: an enemy on deck 2 should not target deck 3.
      const dy = Math.abs(node.y - y);
      const dx = Math.abs(node.x - x);
      const score = dy * 4 + dx + (preferPlatform && node.platform === null ? 12 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = node.id;
      }
    }
    return best;
  }

  /**
   * Dijkstra with a per-edge cost multiplier so brains can weight ladders.
   * Returns the node path from `start` to `goal`, or an empty array.
   */
  findPath(start: number, goal: number, ladderPreference = 1): number[] {
    const n = this.nodes.length;
    if (start === goal) return [start];
    const dist = new Float64Array(n).fill(Number.POSITIVE_INFINITY);
    const prev = new Int32Array(n).fill(-1);
    const visited = new Uint8Array(n);
    dist[start] = 0;

    for (let iter = 0; iter < n; iter += 1) {
      let u = -1;
      let best = Number.POSITIVE_INFINITY;
      for (let i = 0; i < n; i += 1) {
        if (!visited[i] && (dist[i] as number) < best) {
          best = dist[i] as number;
          u = i;
        }
      }
      if (u < 0) break;
      if (u === goal) break;
      visited[u] = 1;
      for (const edgeIndex of this.adjacency[u] as readonly number[]) {
        if (this.blocked.has(edgeIndex)) continue;
        const edge = this.edges[edgeIndex] as NavEdge;
        const weight = edge.kind === 'ladder' ? edge.cost / Math.max(0.1, ladderPreference) : edge.cost;
        const alt = (dist[u] as number) + weight;
        if (alt < (dist[edge.to] as number)) {
          dist[edge.to] = alt;
          prev[edge.to] = u;
        }
      }
    }

    if (!Number.isFinite(dist[goal] as number)) return [];
    const path: number[] = [];
    let cur = goal;
    while (cur !== -1) {
      path.push(cur);
      if (cur === start) break;
      cur = prev[cur] as number;
    }
    return path.reverse();
  }

  /** Reachability check used by the map validator. */
  reachableFrom(start: number): Set<number> {
    const seen = new Set<number>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const u = queue.shift() as number;
      for (const edgeIndex of this.adjacency[u] as readonly number[]) {
        if (this.blocked.has(edgeIndex)) continue;
        const edge = this.edges[edgeIndex] as NavEdge;
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    return seen;
  }

  /**
   * Counts distinct escape directions from a node. The threat director uses this
   * to guarantee the player always has somewhere to go.
   */
  escapeDegree(node: number): number {
    const dirs = new Set<string>();
    for (const edgeIndex of this.adjacency[node] as readonly number[]) {
      if (this.blocked.has(edgeIndex)) continue;
      const edge = this.edges[edgeIndex] as NavEdge;
      const a = this.nodes[edge.from] as NavNode;
      const b = this.nodes[edge.to] as NavNode;
      if (edge.kind === 'ladder') dirs.add(b.y < a.y ? 'up' : 'down');
      else dirs.add(b.x < a.x ? 'left' : 'right');
    }
    return dirs.size;
  }
}

const EPS = 1.5;

function onPlatform(platform: PlatformDef, x: number): boolean {
  return x >= platform.x1 - EPS && x <= platform.x2 + EPS;
}

/** Builds the graph: ladder endpoints and platform ends become nodes. */
export function buildNavGraph(level: LevelDef): NavGraph {
  const nodes: NavNode[] = [];
  const keyToId = new Map<string, number>();

  const addNode = (x: number, y: number, platform: string | null, ladder: string | null): number => {
    const key = `${Math.round(x)}:${Math.round(y)}`;
    const existing = keyToId.get(key);
    if (existing !== undefined) {
      const node = nodes[existing] as NavNode;
      if (node.ladder === null && ladder !== null) {
        nodes[existing] = { ...node, ladder };
      }
      return existing;
    }
    const id = nodes.length;
    nodes.push({ id, x, y, platform, ladder });
    keyToId.set(key, id);
    return id;
  };

  const platformAt = (x: number, y: number): PlatformDef | undefined =>
    level.platforms.find((p) => Math.abs(p.y - y) < EPS && onPlatform(p, x));

  // Ladder endpoints.
  for (const ladder of level.ladders) {
    const top = platformAt(ladder.x, ladder.yTop);
    const bottom = platformAt(ladder.x, ladder.yBottom);
    addNode(ladder.x, ladder.yTop, top?.id ?? null, ladder.id);
    addNode(ladder.x, ladder.yBottom, bottom?.id ?? null, ladder.id);
  }

  // Platform ends, inset so an enemy never stands on the lip.
  for (const platform of level.platforms) {
    addNode(platform.x1 + 10, platform.y, platform.id, null);
    addNode(platform.x2 - 10, platform.y, platform.id, null);
  }

  const edges: NavEdge[] = [];
  const link = (from: number, to: number, kind: EdgeKind, ladder: string | null): void => {
    const a = nodes[from] as NavNode;
    const b = nodes[to] as NavNode;
    const cost = Math.hypot(a.x - b.x, a.y - b.y) + (kind === 'ladder' ? 14 : 0);
    edges.push({ from, to, kind, cost, ladder });
    edges.push({ from: to, to: from, kind, cost, ladder });
  };

  // Walk edges: consecutive nodes on the same platform.
  for (const platform of level.platforms) {
    const onIt = nodes
      .filter((n) => Math.abs(n.y - platform.y) < EPS && onPlatform(platform, n.x))
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i + 1 < onIt.length; i += 1) {
      link((onIt[i] as NavNode).id, (onIt[i + 1] as NavNode).id, 'walk', null);
    }
  }

  // Ladder edges.
  for (const ladder of level.ladders) {
    const top = keyToId.get(`${Math.round(ladder.x)}:${Math.round(ladder.yTop)}`);
    const bottom = keyToId.get(`${Math.round(ladder.x)}:${Math.round(ladder.yBottom)}`);
    if (top !== undefined && bottom !== undefined) link(top, bottom, 'ladder', ladder.id);
  }

  return new NavGraph(nodes, edges);
}

/** Ladder occupying a given x/y, used for chef ladder snapping. */
export function ladderAt(level: LevelDef, x: number, y: number, radius: number): LadderDef | null {
  let best: LadderDef | null = null;
  let bestDx = radius;
  for (const ladder of level.ladders) {
    const dx = Math.abs(ladder.x - x);
    if (dx > bestDx) continue;
    if (y < ladder.yTop - 8 || y > ladder.yBottom + 8) continue;
    best = ladder;
    bestDx = dx;
  }
  return best;
}
