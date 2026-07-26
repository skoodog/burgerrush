/**
 * Factory for non-gameplay chef dolls (title attract, character select, results).
 *
 * These share the exact skeleton, clip library and art of the playable chef -
 * only the state graph differs, which is the whole point of keeping the graph
 * separate from the rig.
 */

import { bindClips, type BoundClip } from '../anim/clip';
import { DollRig } from '../anim/dollRig';
import { Skeleton } from '../anim/skeleton';
import { CHEF_DOLL } from '../rigs/chefDoll';
import { CHEF_CLIPS } from '../rigs/chefClips';
import { CHEF_GAMEPLAY_GRAPH, CHEF_SELECT_GRAPH } from '../rigs/chefGraph';
import {
  accentForSlot,
  chefSkin,
  type ChefIdentity,
  type GenderPresentation,
  type PlayerSlot,
} from '../config/identity';
import type { AnimGraphDef } from '../anim/types';

let cache: Map<string, BoundClip> | null = null;

export function chefClipLibrary(): Map<string, BoundClip> {
  if (!cache) cache = bindClips(CHEF_CLIPS, new Skeleton(CHEF_DOLL.skeleton));
  return cache;
}

export interface PreviewOptions {
  readonly identity: ChefIdentity;
  readonly presentation: GenderPresentation;
  readonly slot: PlayerSlot;
  readonly scale?: number;
  readonly graph?: AnimGraphDef;
}

export function createChefPreviewRig(options: PreviewOptions): DollRig {
  return new DollRig({
    def: CHEF_DOLL,
    graph: options.graph ?? CHEF_SELECT_GRAPH,
    clips: chefClipLibrary(),
    skin: chefSkin(options.identity, options.presentation, accentForSlot(options.slot)),
    scale: options.scale ?? 2.4,
  });
}

/** Gameplay-graph doll used by the Doll Lab and the attract demo. */
export function createChefGameplayRig(options: PreviewOptions): DollRig {
  return createChefPreviewRig({ ...options, graph: CHEF_GAMEPLAY_GRAPH });
}
