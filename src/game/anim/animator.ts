/**
 * Animator: clip playback, crossfades, additive layers and the state machine
 * that maps gameplay context onto clips.
 *
 * The animator is renderer-agnostic and advances on the fixed simulation step,
 * so an animation looks identical at 30 fps and 240 fps and replays bit-exactly.
 */

import { clamp01 } from '../core/math';
import type { BoundClip } from './clip';
import { copyPose, createPose, resetPose } from './skeleton';
import type { Skeleton } from './skeleton';
import type {
  AnimContext,
  AnimGraphDef,
  AnimStateDef,
  AnimTransitionDef,
  ClipEvent,
  Pose,
} from './types';

export function createAnimContext(): AnimContext {
  return {
    velocityX: 0,
    velocityY: 0,
    runBlend: 0,
    grounded: true,
    onLadder: false,
    climbing: false,
    inputX: 0,
    inputY: 0,
    facing: 1,
    triggers: new Set<string>(),
    flags: new Set<string>(),
    stateTime: 0,
  };
}

interface ActiveState {
  def: AnimStateDef;
  clip: BoundClip;
  time: number;
  prevTime: number;
}

export type AnimEventListener = (event: ClipEvent, stateId: string) => void;

export class Animator {
  readonly skeleton: Skeleton;
  readonly graph: AnimGraphDef;
  readonly pose: Pose;

  private readonly clips: ReadonlyMap<string, BoundClip>;
  private readonly states: ReadonlyMap<string, AnimStateDef>;
  private readonly transitionsByState: ReadonlyMap<string, AnimTransitionDef[]>;
  private readonly anyTransitions: readonly AnimTransitionDef[];

  private current: ActiveState;
  private previous: ActiveState | null = null;
  private fadeTime = 0;
  private fadeDuration = 0;

  private readonly scratchA: Pose;
  private readonly scratchB: Pose;
  private readonly pendingEvents: ClipEvent[] = [];
  private readonly listeners: AnimEventListener[] = [];
  private readonly activeSlots = new Map<string, string>();

  constructor(skeleton: Skeleton, graph: AnimGraphDef, clips: ReadonlyMap<string, BoundClip>) {
    this.skeleton = skeleton;
    this.graph = graph;
    this.clips = clips;
    this.pose = createPose(skeleton.boneCount);
    this.scratchA = createPose(skeleton.boneCount);
    this.scratchB = createPose(skeleton.boneCount);

    const states = new Map<string, AnimStateDef>();
    for (const state of graph.states) {
      if (states.has(state.id)) throw new Error(`Duplicate anim state "${state.id}"`);
      if (!clips.has(state.clip)) {
        throw new Error(`Anim state "${state.id}" references missing clip "${state.clip}"`);
      }
      states.set(state.id, state);
    }
    this.states = states;

    const byState = new Map<string, AnimTransitionDef[]>();
    const any: AnimTransitionDef[] = [];
    graph.transitions.forEach((t, i) => {
      if (!states.has(t.to)) {
        throw new Error(`Transition to unknown state "${t.to}"`);
      }
      const withOrder = { ...t, __order: i } as AnimTransitionDef & { __order: number };
      if (t.from === '*') {
        any.push(withOrder);
      } else {
        if (!states.has(t.from)) throw new Error(`Transition from unknown state "${t.from}"`);
        const list = byState.get(t.from) ?? [];
        list.push(withOrder);
        byState.set(t.from, list);
      }
    });
    const byPriority = (a: AnimTransitionDef, b: AnimTransitionDef): number => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pa !== pb) return pb - pa;
      return (
        ((a as AnimTransitionDef & { __order: number }).__order ?? 0) -
        ((b as AnimTransitionDef & { __order: number }).__order ?? 0)
      );
    };
    for (const list of byState.values()) list.sort(byPriority);
    any.sort(byPriority);
    this.transitionsByState = byState;
    this.anyTransitions = any;

    const initial = states.get(graph.initial);
    if (!initial) throw new Error(`Anim graph "${graph.id}" has no initial state "${graph.initial}"`);
    this.current = this.makeActive(initial);
    this.applySlots(initial);
  }

  get stateId(): string {
    return this.current.def.id;
  }

  get stateTime(): number {
    return this.current.time;
  }

  get normalizedTime(): number {
    return this.current.clip.duration > 0 ? this.current.time / this.current.clip.duration : 1;
  }

  get isBlending(): boolean {
    return this.previous !== null;
  }

  /** Runtime slot overrides (face expression, held prop). */
  get slots(): ReadonlyMap<string, string> {
    return this.activeSlots;
  }

  setSlot(slot: string, texture: string): void {
    this.activeSlots.set(slot, texture);
  }

  clearSlot(slot: string): void {
    this.activeSlots.delete(slot);
  }

  onEvent(listener: AnimEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  /** Forces a state, optionally crossfading. Used by cutscenes and the Doll Lab. */
  play(stateId: string, fadeDuration = 0): void {
    const next = this.states.get(stateId);
    if (!next) throw new Error(`Unknown anim state "${stateId}"`);
    if (next.id === this.current.def.id && fadeDuration > 0) return;
    this.beginTransition(next, fadeDuration);
  }

  /**
   * Advances the animator by `dt` seconds.
   *
   * Order matters: transitions are evaluated *before* time advances so a trigger
   * raised this step starts its clip at t=0 rather than one frame in.
   */
  update(dt: number, ctx: AnimContext): void {
    this.evaluateTransitions(ctx);

    const speed = resolveSpeed(this.current.def, ctx);
    this.current.prevTime = this.current.time;
    this.current.time += dt * speed;

    if (this.previous) {
      this.previous.prevTime = this.previous.time;
      this.previous.time += dt * resolveSpeed(this.previous.def, ctx);
      this.fadeTime += dt;
      if (this.fadeDuration <= 0 || this.fadeTime >= this.fadeDuration) {
        this.previous = null;
        this.fadeTime = 0;
        this.fadeDuration = 0;
      }
    }

    this.emitEvents();
    this.buildPose(ctx);
  }

  /** Rebuilds the pose without advancing time - used after a hard `play()`. */
  refresh(ctx: AnimContext): void {
    this.buildPose(ctx);
  }

  private evaluateTransitions(ctx: AnimContext): void {
    const local = this.transitionsByState.get(this.current.def.id);
    const progress = this.current.clip.duration > 0 ? this.current.time / this.current.clip.duration : 1;

    const consider = (list: readonly AnimTransitionDef[] | undefined): boolean => {
      if (!list) return false;
      for (const t of list) {
        if (t.to === this.current.def.id) continue;
        if (t.exitTime !== undefined && progress < t.exitTime) continue;
        if (!t.when(ctx)) continue;
        const next = this.states.get(t.to);
        if (!next) continue;
        this.beginTransition(next, t.duration);
        return true;
      }
      return false;
    };

    if (consider(local)) return;
    consider(this.anyTransitions);
  }

  private beginTransition(next: AnimStateDef, duration: number): void {
    if (duration > 0) {
      this.previous = this.current;
      this.fadeTime = 0;
      this.fadeDuration = duration;
    } else {
      this.previous = null;
      this.fadeTime = 0;
      this.fadeDuration = 0;
    }
    this.current = this.makeActive(next);
    this.applySlots(next);
  }

  private makeActive(def: AnimStateDef): ActiveState {
    const clip = this.clips.get(def.clip);
    if (!clip) throw new Error(`Anim state "${def.id}" references missing clip "${def.clip}"`);
    return { def, clip, time: 0, prevTime: 0 };
  }

  private applySlots(def: AnimStateDef): void {
    const fromClip = this.clips.get(def.clip)?.clip.slots;
    if (fromClip) for (const [k, v] of Object.entries(fromClip)) this.activeSlots.set(k, v);
    if (def.slots) for (const [k, v] of Object.entries(def.slots)) this.activeSlots.set(k, v);
  }

  private emitEvents(): void {
    if (this.listeners.length === 0) return;
    this.pendingEvents.length = 0;
    this.current.clip.collectEvents(this.current.prevTime, this.current.time, this.pendingEvents);
    for (const event of this.pendingEvents) {
      for (const listener of this.listeners) listener(event, this.current.def.id);
    }
  }

  private buildPose(ctx: AnimContext): void {
    const { pose, scratchA, scratchB } = this;

    resetPose(scratchA);
    this.current.clip.sample(scratchA, this.current.time, 1, false);

    if (this.previous && this.fadeDuration > 0) {
      resetPose(scratchB);
      this.previous.clip.sample(scratchB, this.previous.time, 1, false);
      const t = clamp01(this.fadeTime / this.fadeDuration);
      blendInto(scratchB, scratchA, t, pose);
    } else {
      copyPose(scratchA, pose);
    }

    const layers = this.current.def.layers;
    if (layers) {
      for (const layer of layers) {
        const clip = this.clips.get(layer.clip);
        if (!clip) continue;
        const weight =
          typeof layer.weight === 'function' ? clamp01(layer.weight(ctx)) : (layer.weight ?? 1);
        if (weight <= 0) continue;
        clip.sample(pose, this.current.time, weight, true);
      }
    }
  }
}

function resolveSpeed(def: AnimStateDef, ctx: AnimContext): number {
  const speed = def.speed;
  if (speed === undefined) return 1;
  return typeof speed === 'function' ? speed(ctx) : speed;
}

/** out = lerp(a, b, t) across every channel. */
export function blendInto(a: Pose, b: Pose, t: number, out: Pose): void {
  const n = out.boneCount;
  for (let i = 0; i < n; i += 1) {
    out.x[i] = (a.x[i] as number) + ((b.x[i] as number) - (a.x[i] as number)) * t;
    out.y[i] = (a.y[i] as number) + ((b.y[i] as number) - (a.y[i] as number)) * t;
    out.rot[i] = (a.rot[i] as number) + ((b.rot[i] as number) - (a.rot[i] as number)) * t;
    out.sx[i] = (a.sx[i] as number) + ((b.sx[i] as number) - (a.sx[i] as number)) * t;
    out.sy[i] = (a.sy[i] as number) + ((b.sy[i] as number) - (a.sy[i] as number)) * t;
    out.a[i] = (a.a[i] as number) + ((b.a[i] as number) - (a.a[i] as number)) * t;
  }
}
