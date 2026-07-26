/**
 * Clip authoring + sampling.
 *
 * Clips are authored with a compact spec (degrees, seconds, `[time, value]`
 * pairs) and compiled once into dense per-bone tracks. Sampling is a binary
 * search per track with no allocation, so a full chef doll costs a handful of
 * microseconds per frame.
 */

import { DEG, ease, type EaseName } from '../core/math';
import type { Skeleton } from './skeleton';
import type {
  ChannelId,
  Clip,
  ClipEvent,
  ClipLoopMode,
  Keyframe,
  Pose,
  Track,
} from './types';

/** `[time, value]` or `[time, value, ease]`. Rotations are authored in degrees. */
export type KeySpec = readonly [number, number] | readonly [number, number, EaseName];

export type TrackSpec = Partial<Record<ChannelId, readonly KeySpec[]>>;

/** bone name -> channels. */
export type ClipSpec = Record<string, TrackSpec>;

export interface ClipOptions {
  readonly loop?: ClipLoopMode;
  readonly events?: readonly ClipEvent[];
  readonly additive?: boolean;
  readonly slots?: Readonly<Record<string, string>>;
  /** Default easing for keys that do not specify one. */
  readonly ease?: EaseName;
}

const ANGULAR_CHANNELS: ReadonlySet<ChannelId> = new Set<ChannelId>(['rot']);

/**
 * Compiles an authoring spec into a `Clip`.
 *
 * ```ts
 * clip('run', 0.52, { loop: 'loop' }, {
 *   hips:  { y: [[0, 0], [0.13, -2.4], [0.26, 0]] },
 *   torso: { rot: [[0, -4], [0.26, -7]] },
 * });
 * ```
 */
export function clip(
  id: string,
  duration: number,
  options: ClipOptions,
  spec: ClipSpec,
): Clip {
  if (!(duration > 0)) throw new Error(`Clip "${id}" needs a positive duration`);
  const defaultEase: EaseName = options.ease ?? 'sineInOut';
  const tracks: Track[] = [];

  for (const [bone, channels] of Object.entries(spec)) {
    if (!channels) continue;
    for (const [channel, keySpecs] of Object.entries(channels) as [
      ChannelId,
      readonly KeySpec[] | undefined,
    ][]) {
      if (!keySpecs || keySpecs.length === 0) continue;
      const angular = ANGULAR_CHANNELS.has(channel);
      const keys: Keyframe[] = keySpecs
        .map((k) => ({
          t: k[0],
          v: angular ? k[1] * DEG : k[1],
          ease: (k[2] ?? defaultEase) as EaseName,
        }))
        .sort((a, b) => a.t - b.t);
      for (const key of keys) {
        if (key.t < 0 || key.t > duration + 1e-6) {
          throw new Error(
            `Clip "${id}" track ${bone}.${channel} has key at t=${key.t} outside [0, ${duration}]`,
          );
        }
      }
      tracks.push({ bone, channel, keys });
    }
  }

  const events = [...(options.events ?? [])].sort((a, b) => a.t - b.t);
  return {
    id,
    duration,
    loop: options.loop ?? 'once',
    tracks,
    events,
    additive: options.additive ?? false,
    ...(options.slots ? { slots: options.slots } : {}),
  };
}

/** Convenience for a static pose held for `duration`. */
export function poseClip(id: string, duration: number, spec: ClipSpec, options: ClipOptions = {}): Clip {
  const held: ClipSpec = {};
  for (const [bone, channels] of Object.entries(spec)) {
    const out: TrackSpec = {};
    for (const [channel, keys] of Object.entries(channels ?? {}) as [
      ChannelId,
      readonly KeySpec[] | undefined,
    ][]) {
      if (!keys || keys.length === 0) continue;
      out[channel] = keys;
    }
    held[bone] = out;
  }
  return clip(id, duration, { loop: 'hold', ...options }, held);
}

/**
 * Precompiled clip bound to a skeleton: bone names resolved to indices once.
 * Tracks targeting bones the skeleton lacks are dropped with a single warning,
 * which lets one clip library serve several rigs (chef variants, wing partner).
 */
export class BoundClip {
  readonly clip: Clip;
  readonly duration: number;
  private readonly boneIdx: Int32Array;
  private readonly channels: ChannelId[];
  private readonly keyTimes: Float64Array[];
  private readonly keyValues: Float64Array[];
  private readonly keyEases: EaseName[][];

  constructor(source: Clip, skeleton: Skeleton) {
    this.clip = source;
    this.duration = source.duration;

    const usable = source.tracks.filter((t) => skeleton.hasBone(t.bone));
    this.boneIdx = new Int32Array(usable.length);
    this.channels = new Array<ChannelId>(usable.length);
    this.keyTimes = new Array<Float64Array>(usable.length);
    this.keyValues = new Array<Float64Array>(usable.length);
    this.keyEases = new Array<EaseName[]>(usable.length);

    usable.forEach((track, i) => {
      this.boneIdx[i] = skeleton.indexOf(track.bone);
      this.channels[i] = track.channel;
      this.keyTimes[i] = Float64Array.from(track.keys, (k) => k.t);
      this.keyValues[i] = Float64Array.from(track.keys, (k) => k.v);
      this.keyEases[i] = track.keys.map((k) => k.ease);
    });
  }

  /**
   * Writes the clip's value at `time` into `pose`.
   *
   * `weight` < 1 blends toward whatever is already in the pose, so a state
   * machine crossfade is just two `sample` calls at complementary weights.
   * Additive clips add their delta instead of replacing.
   */
  sample(pose: Pose, time: number, weight = 1, additive = this.clip.additive): void {
    if (weight <= 0) return;
    const t = this.wrap(time);
    for (let i = 0; i < this.boneIdx.length; i += 1) {
      const value = this.evaluateTrack(i, t);
      const bone = this.boneIdx[i] as number;
      const channel = this.channels[i] as ChannelId;
      const target = pose[channel];
      const current = target[bone] as number;
      if (additive) {
        const base = channel === 'sx' || channel === 'sy' || channel === 'a' ? 1 : 0;
        target[bone] = current + (value - base) * weight;
      } else {
        target[bone] = weight >= 1 ? value : current + (value - current) * weight;
      }
    }
  }

  /** Normalises `time` according to the clip's loop mode. */
  wrap(time: number): number {
    const d = this.duration;
    switch (this.clip.loop) {
      case 'loop': {
        const t = time % d;
        return t < 0 ? t + d : t;
      }
      case 'pingpong': {
        const span = d * 2;
        let t = time % span;
        if (t < 0) t += span;
        return t <= d ? t : span - t;
      }
      case 'once':
      case 'hold':
      default:
        return time < 0 ? 0 : time > d ? d : time;
    }
  }

  /** True once a non-looping clip has played through. */
  isFinished(time: number): boolean {
    return this.clip.loop !== 'loop' && this.clip.loop !== 'pingpong' && time >= this.duration;
  }

  /** Emits events crossed between `prevTime` and `time`. Loop-safe. */
  collectEvents(prevTime: number, time: number, out: ClipEvent[]): void {
    const events = this.clip.events;
    if (events.length === 0 || time === prevTime) return;
    const d = this.duration;
    if (this.clip.loop === 'loop' && Math.floor(time / d) !== Math.floor(prevTime / d)) {
      const a = this.wrap(prevTime);
      for (const e of events) if (e.t > a && e.t <= d) out.push(e);
      const b = this.wrap(time);
      for (const e of events) if (e.t >= 0 && e.t <= b) out.push(e);
      return;
    }
    const a = this.wrap(prevTime);
    const b = this.wrap(time);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (const e of events) if (e.t > lo && e.t <= hi) out.push(e);
  }

  private evaluateTrack(trackIndex: number, t: number): number {
    const times = this.keyTimes[trackIndex] as Float64Array;
    const values = this.keyValues[trackIndex] as Float64Array;
    const n = times.length;
    if (n === 1) return values[0] as number;
    if (t <= (times[0] as number)) return values[0] as number;
    if (t >= (times[n - 1] as number)) return values[n - 1] as number;

    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((times[mid] as number) <= t) lo = mid;
      else hi = mid;
    }
    const t0 = times[lo] as number;
    const t1 = times[hi] as number;
    const v0 = values[lo] as number;
    const v1 = values[hi] as number;
    if (t1 === t0) return v1;
    const easeName = (this.keyEases[trackIndex] as EaseName[])[lo] as EaseName;
    const u = ease(easeName, (t - t0) / (t1 - t0));
    return v0 + (v1 - v0) * u;
  }
}

/** Compiles a clip library against one skeleton. */
export function bindClips(clips: readonly Clip[], skeleton: Skeleton): Map<string, BoundClip> {
  const map = new Map<string, BoundClip>();
  for (const c of clips) {
    if (map.has(c.id)) throw new Error(`Duplicate clip id "${c.id}"`);
    map.set(c.id, new BoundClip(c, skeleton));
  }
  return map;
}
