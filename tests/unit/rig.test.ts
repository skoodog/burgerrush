/**
 * Doll-rig unit tests: matrix maths, skeleton solve, clip sampling, the
 * animation state machine and secondary motion.
 *
 * These run in plain Node with no renderer, which is exactly why the rig was
 * kept free of Phaser types.
 */

import { describe, expect, it } from 'vitest';
import {
  DEG,
  ease,
  mat2dCompose,
  mat2dDecompose,
  mat2dDeterminant,
  mat2dIdentity,
  mat2dMultiply,
  mat2dTransformPoint,
  springStep,
  wrapAngle,
} from '@/game/core/math';
import { Skeleton, topologicalOrder } from '@/game/anim/skeleton';
import { bindClips, clip } from '@/game/anim/clip';
import { Animator, createAnimContext } from '@/game/anim/animator';
import { DollRig } from '@/game/anim/dollRig';
import { CHEF_DOLL } from '@/game/rigs/chefDoll';
import { CHEF_CLIPS } from '@/game/rigs/chefClips';
import { CHEF_GAMEPLAY_GRAPH, CHEF_SELECT_GRAPH, CHEF_TRIGGERS } from '@/game/rigs/chefGraph';
import { ENEMY_CLIPS, ENEMY_DOLL, ENEMY_GRAPH } from '@/game/rigs/enemyDoll';
import { chefSkin } from '@/game/config/identity';
import type { AnimGraphDef, BoneDef, ClipEvent } from '@/game/anim/types';

describe('math', () => {
  it('composes and decomposes an affine transform without loss', () => {
    const m = mat2dCompose(12, -4, 35 * DEG, 1.4, 0.8);
    const d = mat2dDecompose(m);
    expect(d.x).toBeCloseTo(12, 6);
    expect(d.y).toBeCloseTo(-4, 6);
    expect(d.rotation).toBeCloseTo(35 * DEG, 6);
    expect(d.scaleX).toBeCloseTo(1.4, 6);
    expect(d.scaleY).toBeCloseTo(0.8, 6);
  });

  it('reports a mirrored transform as a negative scale', () => {
    const m = mat2dCompose(0, 0, 0, -1, 1);
    expect(mat2dDeterminant(m)).toBeLessThan(0);
    const d = mat2dDecompose(m);
    expect(d.scaleX * d.scaleY).toBeLessThan(0);
  });

  it('multiplies parent-first and is alias-safe', () => {
    const parent = mat2dCompose(10, 0, 90 * DEG, 1, 1);
    const child = mat2dCompose(5, 0, 0, 1, 1);
    const out = mat2dMultiply(parent, child);
    const p = mat2dTransformPoint(out, 0, 0);
    // A child 5 along the parent's local +x, where +x points down.
    expect(p.x).toBeCloseTo(10, 6);
    expect(p.y).toBeCloseTo(5, 6);

    const aliased = mat2dCompose(10, 0, 90 * DEG, 1, 1);
    mat2dMultiply(aliased, child, aliased);
    expect(aliased.tx).toBeCloseTo(out.tx, 6);
    expect(aliased.ty).toBeCloseTo(out.ty, 6);
  });

  it('wraps angles into (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 6);
    expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(Math.PI, 6);
  });

  it('clamps easing input and hits both endpoints', () => {
    for (const name of ['linear', 'sineInOut', 'cubicOut', 'bounceOut'] as const) {
      expect(ease(name, 0)).toBeCloseTo(0, 6);
      expect(ease(name, 1)).toBeCloseTo(1, 6);
      expect(ease(name, -5)).toBeCloseTo(0, 6);
      expect(ease(name, 5)).toBeCloseTo(1, 6);
    }
  });

  it('settles a spring on its target and is deterministic for a fixed dt', () => {
    const a = { value: 0, velocity: 0 };
    const b = { value: 0, velocity: 0 };
    for (let i = 0; i < 400; i += 1) {
      springStep(a, 1, 120, 14, 1 / 120);
      springStep(b, 1, 120, 14, 1 / 120);
    }
    expect(a.value).toBeCloseTo(1, 3);
    expect(a.value).toBe(b.value);
  });
});

describe('skeleton', () => {
  it('orders bones parents-first regardless of declaration order', () => {
    const bones: BoneDef[] = [
      { name: 'hand', parent: 'arm', x: 0, y: 0, rotation: 0 },
      { name: 'arm', parent: 'root', x: 0, y: 0, rotation: 0 },
      { name: 'root', parent: null, x: 0, y: 0, rotation: 0 },
    ];
    const ordered = topologicalOrder(bones).map((b) => b.name);
    expect(ordered.indexOf('root')).toBeLessThan(ordered.indexOf('arm'));
    expect(ordered.indexOf('arm')).toBeLessThan(ordered.indexOf('hand'));
  });

  it('rejects cycles and unknown parents', () => {
    expect(() =>
      topologicalOrder([
        { name: 'a', parent: 'b', x: 0, y: 0, rotation: 0 },
        { name: 'b', parent: 'a', x: 0, y: 0, rotation: 0 },
      ]),
    ).toThrow(/cycle/i);
    expect(() =>
      topologicalOrder([{ name: 'a', parent: 'ghost', x: 0, y: 0, rotation: 0 }]),
    ).toThrow(/unknown parent/i);
  });

  it('propagates parent transforms down the chain', () => {
    const skeleton = new Skeleton({
      id: 'test',
      bones: [
        { name: 'root', parent: null, x: 0, y: 0, rotation: 0 },
        { name: 'child', parent: 'root', x: 10, y: 0, rotation: 0 },
      ],
    });
    const pose = skeleton.createPose();
    pose.rot[skeleton.indexOf('root')] = 90 * DEG;
    skeleton.solve(pose, mat2dIdentity());
    const p = skeleton.worldPoint('child');
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(10, 5);
  });

  it('multiplies alpha down the chain', () => {
    const skeleton = new Skeleton({
      id: 'test',
      bones: [
        { name: 'root', parent: null, x: 0, y: 0, rotation: 0 },
        { name: 'child', parent: 'root', x: 0, y: 0, rotation: 0 },
      ],
    });
    const pose = skeleton.createPose();
    pose.a[skeleton.indexOf('root')] = 0.5;
    pose.a[skeleton.indexOf('child')] = 0.5;
    skeleton.solve(pose, mat2dIdentity());
    expect(skeleton.worldAlpha[skeleton.indexOf('child')]).toBeCloseTo(0.25, 6);
  });
});

describe('clips', () => {
  const skeleton = new Skeleton({
    id: 'test',
    bones: [{ name: 'root', parent: null, x: 0, y: 0, rotation: 0 }],
  });

  it('interpolates between keyframes and converts rotations to radians', () => {
    const bound = bindClips(
      [
        clip('spin', 1, { loop: 'once', ease: 'linear' }, {
          root: {
            rot: [
              [0, 0],
              [1, 90],
            ],
          },
        }),
      ],
      skeleton,
    ).get('spin');
    expect(bound).toBeDefined();
    const pose = skeleton.createPose();
    bound?.sample(pose, 0.5);
    expect(pose.rot[0]).toBeCloseTo(45 * DEG, 6);
  });

  it('honours loop modes', () => {
    const c = (loop: 'loop' | 'once' | 'pingpong'): number =>
      (bindClips([clip('c', 2, { loop }, { root: { x: [[0, 0], [2, 10]] } })], skeleton).get(
        'c',
      ) as { wrap: (t: number) => number }).wrap(3);
    expect(c('loop')).toBeCloseTo(1, 6);
    expect(c('once')).toBeCloseTo(2, 6);
    expect(c('pingpong')).toBeCloseTo(1, 6);
  });

  it('emits events once per crossing, including across a loop boundary', () => {
    const bound = bindClips(
      [
        clip('c', 1, { loop: 'loop', events: [{ t: 0.5, name: 'beat' }] }, {
          root: { x: [[0, 0], [1, 1]] },
        }),
      ],
      skeleton,
    ).get('c');
    const out: ClipEvent[] = [];
    bound?.collectEvents(0.4, 0.6, out);
    expect(out).toHaveLength(1);
    out.length = 0;
    bound?.collectEvents(0.9, 1.6, out);
    expect(out).toHaveLength(1);
  });

  it('blends toward the existing pose at partial weight', () => {
    const bound = bindClips(
      [clip('c', 1, { loop: 'hold' }, { root: { x: [[0, 10]] } })],
      skeleton,
    ).get('c');
    const pose = skeleton.createPose();
    pose.x[0] = 0;
    bound?.sample(pose, 0, 0.5);
    expect(pose.x[0]).toBeCloseTo(5, 6);
  });

  it('adds rather than replaces for additive clips', () => {
    const bound = bindClips(
      [clip('c', 1, { loop: 'hold', additive: true }, { root: { x: [[0, 10]] } })],
      skeleton,
    ).get('c');
    const pose = skeleton.createPose();
    pose.x[0] = 3;
    bound?.sample(pose, 0, 1);
    expect(pose.x[0]).toBeCloseTo(13, 6);
  });

  it('rejects keys outside the clip duration', () => {
    expect(() =>
      clip('bad', 1, {}, { root: { x: [[0, 0], [2, 1]] } }),
    ).toThrow(/outside/);
  });
});

describe('animation state machine', () => {
  const skeleton = new Skeleton({
    id: 'test',
    bones: [{ name: 'root', parent: null, x: 0, y: 0, rotation: 0 }],
  });
  const clips = bindClips(
    [
      clip('idle', 1, { loop: 'loop' }, { root: { x: [[0, 0], [1, 0]] } }),
      clip('run', 1, { loop: 'loop' }, { root: { x: [[0, 10], [1, 10]] } }),
      clip('hit', 0.5, { loop: 'hold' }, { root: { x: [[0, -10], [0.5, -10]] } }),
    ],
    skeleton,
  );
  const graph: AnimGraphDef = {
    id: 'test',
    initial: 'idle',
    states: [
      { id: 'idle', clip: 'idle' },
      { id: 'run', clip: 'run' },
      { id: 'hit', clip: 'hit' },
    ],
    transitions: [
      { from: '*', to: 'hit', duration: 0, priority: 10, when: (c) => c.triggers.has('hit') },
      { from: 'idle', to: 'run', duration: 0, when: (c) => c.runBlend > 0.1 },
      { from: 'run', to: 'idle', duration: 0, when: (c) => c.runBlend <= 0.1 },
      { from: 'hit', to: 'idle', duration: 0, exitTime: 1, when: () => true },
    ],
  };

  it('transitions on context changes', () => {
    const animator = new Animator(skeleton, graph, clips);
    const ctx = createAnimContext();
    expect(animator.stateId).toBe('idle');
    ctx.runBlend = 0.5;
    animator.update(1 / 60, ctx);
    expect(animator.stateId).toBe('run');
    ctx.runBlend = 0;
    animator.update(1 / 60, ctx);
    expect(animator.stateId).toBe('idle');
  });

  it('lets any-state transitions pre-empt by priority', () => {
    const animator = new Animator(skeleton, graph, clips);
    const ctx = createAnimContext();
    ctx.runBlend = 1;
    animator.update(1 / 60, ctx);
    expect(animator.stateId).toBe('run');
    ctx.triggers.add('hit');
    animator.update(1 / 60, ctx);
    expect(animator.stateId).toBe('hit');
  });

  it('respects exitTime so a one-shot is never cut off', () => {
    const animator = new Animator(skeleton, graph, clips);
    const ctx = createAnimContext();
    ctx.triggers.add('hit');
    animator.update(1 / 60, ctx);
    ctx.triggers.clear();
    animator.update(0.1, ctx);
    expect(animator.stateId).toBe('hit');
    animator.update(0.6, ctx);
    // Transitions are evaluated before time advances, so a completed one-shot
    // releases on the following step - never mid-swing.
    expect(animator.stateId).toBe('hit');
    animator.update(1 / 60, ctx);
    expect(animator.stateId).toBe('idle');
  });

  it('crossfades between poses', () => {
    const fading: AnimGraphDef = {
      ...graph,
      transitions: [{ from: 'idle', to: 'run', duration: 0.2, when: (c) => c.runBlend > 0.1 }],
    };
    const animator = new Animator(skeleton, fading, clips);
    const ctx = createAnimContext();
    ctx.runBlend = 1;
    animator.update(0.1, ctx);
    // Halfway through a 0.2s fade from x=0 to x=10.
    expect(animator.pose.x[0]).toBeGreaterThan(1);
    expect(animator.pose.x[0]).toBeLessThan(9);
  });

  it('rejects a graph that references a missing clip', () => {
    expect(
      () =>
        new Animator(skeleton, {
          id: 'bad',
          initial: 'a',
          states: [{ id: 'a', clip: 'nope' }],
          transitions: [],
        }, clips),
    ).toThrow(/missing clip/);
  });
});

describe('chef rig integration', () => {
  const makeRig = (): DollRig =>
    new DollRig({
      def: CHEF_DOLL,
      graph: CHEF_GAMEPLAY_GRAPH,
      clips: bindClips(CHEF_CLIPS, new Skeleton(CHEF_DOLL.skeleton)),
      skin: chefSkin('sal', 'girl', 'red'),
    });

  it('binds every authored clip and graph without error', () => {
    expect(() => makeRig()).not.toThrow();
    const selectRig = new DollRig({
      def: CHEF_DOLL,
      graph: CHEF_SELECT_GRAPH,
      clips: bindClips(CHEF_CLIPS, new Skeleton(CHEF_DOLL.skeleton)),
      skin: chefSkin('pep', 'boy', 'blue'),
    });
    expect(selectRig.animator.stateId).toBe('selectIdle');
  });

  it('binds the enemy rig too', () => {
    expect(
      () =>
        new DollRig({
          def: ENEMY_DOLL,
          graph: ENEMY_GRAPH,
          clips: bindClips(ENEMY_CLIPS, new Skeleton(ENEMY_DOLL.skeleton)),
          skin: { id: 'e', textures: {} },
        }),
    ).not.toThrow();
  });

  it('hides slot-driven parts until a slot fills them', () => {
    const rig = makeRig();
    rig.update(1 / 120);
    const prop = rig.solvedParts.find((p) => p.partId === 'propNear');
    expect(prop?.visible).toBe(false);
    rig.animator.setSlot('slot.propNear', 'prop.spatula');
    rig.update(1 / 120);
    expect(rig.solvedParts.find((p) => p.partId === 'propNear')?.visible).toBe(true);
  });

  it('resolves the face slot through the skin', () => {
    const rig = makeRig();
    rig.update(1 / 120);
    const face = rig.solvedParts.find((p) => p.partId === 'face');
    expect(face?.texture).toBe('chef.face.sal.girl.neutral');
    rig.animator.setSlot('slot.face', 'face.hurt');
    rig.update(1 / 120);
    expect(rig.solvedParts.find((p) => p.partId === 'face')?.texture).toBe(
      'chef.face.sal.girl.hurt',
    );
  });

  it('keeps the toque emblem un-mirrored when facing left', () => {
    const rig = makeRig();
    rig.facing = -1;
    rig.update(1 / 120);
    const emblem = rig.solvedParts.find((p) => p.partId === 'emblem');
    const torso = rig.solvedParts.find((p) => p.partId === 'torso');
    expect(emblem).toBeDefined();
    expect(torso).toBeDefined();
    // The torso mirrors with the doll; the emblem counter-flips so S/P stays legible.
    const torsoMirrored = (torso as { scaleX: number; scaleY: number }).scaleX *
      (torso as { scaleX: number; scaleY: number }).scaleY;
    const emblemMirrored = (emblem as { scaleX: number; scaleY: number }).scaleX *
      (emblem as { scaleX: number; scaleY: number }).scaleY;
    expect(torsoMirrored).toBeLessThan(0);
    expect(emblemMirrored).toBeGreaterThan(0);
  });

  it('produces identical output for identical inputs (replay-safe)', () => {
    const run = (): number[] => {
      const rig = makeRig();
      rig.teleport(0, 0);
      const out: number[] = [];
      for (let i = 0; i < 240; i += 1) {
        rig.x += 1.1;
        rig.context.runBlend = 0.8;
        rig.update(1 / 120);
        out.push(rig.solvedParts[0]?.x ?? 0, rig.solvedParts[0]?.rotation ?? 0);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('drives cloth from doll velocity, then settles at rest', () => {
    const rig = makeRig();
    rig.teleport(0, 0);
    for (let i = 0; i < 30; i += 1) {
      rig.x += 3;
      rig.update(1 / 120);
    }
    const toqueTip = rig.skeleton.indexOf('toqueTip');
    const moving = rig.animator.pose.rot[toqueTip] as number;
    for (let i = 0; i < 400; i += 1) rig.update(1 / 120);
    const resting = rig.animator.pose.rot[toqueTip] as number;
    expect(Math.abs(moving)).toBeGreaterThan(Math.abs(resting));
  });

  it('reaches the boss-flight states from the gameplay blackboard alone', () => {
    const rig = makeRig();
    rig.context.flags.add('bossWarning');
    rig.update(1 / 60);
    expect(rig.animator.stateId).toBe('bossWarning');
    rig.context.flags.add('launching');
    rig.update(1 / 60);
    expect(rig.animator.stateId).toBe('launch');
    rig.context.flags.clear();
    rig.context.flags.add('flying');
    rig.update(1 / 60);
    expect(rig.animator.stateId).toBe('flightIdle');
  });

  it('routes a hit trigger to the flight-specific reaction while flying', () => {
    const rig = makeRig();
    rig.context.flags.add('flying');
    rig.update(1 / 60);
    rig.context.triggers.add(CHEF_TRIGGERS.hit);
    rig.update(1 / 60);
    expect(rig.animator.stateId).toBe('flightHit');
  });
});
