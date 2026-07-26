/**
 * Chef animation state graphs.
 *
 * Two graphs share the same skeleton and clip library:
 *  - `CHEF_GAMEPLAY_GRAPH` drives Stack Phase, the boss warning/launch and Boss
 *    Flight, all from one blackboard so a chef never has to be rebuilt when the
 *    act changes;
 *  - `CHEF_SELECT_GRAPH` drives the character-select doll (join, swap, ready,
 *    disconnect, reconnect).
 *
 * Gameplay writes `AnimContext` once per fixed step. Nothing in here reads a
 * gameplay object, which is what lets the wing partner, the attract-mode bot and
 * a replay ghost drive identical rigs.
 */

import { clamp01 } from '../core/math';
import type { AnimContext, AnimGraphDef } from '../anim/types';

/** One-step triggers gameplay raises on the blackboard. */
export const CHEF_TRIGGERS = {
  hit: 'hit',
  respawn: 'respawn',
  compress: 'compress',
  pickup: 'pickup',
  throwField: 'throwField',
  portalEnter: 'portalEnter',
  portalExit: 'portalExit',
  pivot: 'pivot',
  join: 'join',
  identitySwap: 'identitySwap',
  presentationSwap: 'presentationSwap',
  ready: 'ready',
  unready: 'unready',
  deviceLost: 'deviceLost',
  deviceReconnect: 'deviceReconnect',
  finalVolley: 'finalVolley',
} as const;

/** Latched flags gameplay maintains on the blackboard. */
export const CHEF_FLAGS = {
  bossWarning: 'bossWarning',
  launching: 'launching',
  flying: 'flying',
  firing: 'firing',
  victory: 'victory',
  gameOver: 'gameOver',
  turntable: 'turntable',
  showcase: 'showcase',
} as const;

const has = (ctx: AnimContext, trigger: string): boolean => ctx.triggers.has(trigger);
const flag = (ctx: AnimContext, name: string): boolean => ctx.flags.has(name);

/** Run-cycle playback rate: the cycle stretches with actual ground speed. */
function runSpeed(ctx: AnimContext): number {
  return 0.55 + clamp01(ctx.runBlend) * 0.85;
}

export const CHEF_GAMEPLAY_GRAPH: AnimGraphDef = {
  id: 'chef.gameplay',
  initial: 'idle',
  states: [
    { id: 'idle', clip: 'idle' },
    { id: 'run', clip: 'run', speed: runSpeed },
    { id: 'skid', clip: 'skid' },
    { id: 'pivot', clip: 'pivot' },
    { id: 'climb', clip: 'climb', speed: (ctx) => 0.6 + clamp01(Math.abs(ctx.inputY)) * 0.9 },
    { id: 'climbIdle', clip: 'climbIdle' },
    { id: 'compress', clip: 'compress' },
    { id: 'portalEnter', clip: 'portalEnter' },
    { id: 'portalExit', clip: 'portalExit' },
    { id: 'hit', clip: 'hit' },
    { id: 'respawn', clip: 'respawn' },
    { id: 'fieldPickup', clip: 'fieldPickup' },
    { id: 'fieldThrow', clip: 'fieldThrow' },
    { id: 'bossWarning', clip: 'bossWarningLookUp', layers: [{ clip: 'lookUp', weight: 0.35 }] },
    { id: 'launch', clip: 'crouchLaunch' },
    {
      id: 'flightIdle',
      clip: 'flightIdle',
      layers: [
        {
          clip: 'flightFire',
          // Additive fire layer fades in only while the fire input is held, so
          // one flight pose covers both the drifting and the firing chef.
          weight: (ctx) => (flag(ctx, CHEF_FLAGS.firing) ? 1 : 0),
        },
      ],
    },
    { id: 'flightHit', clip: 'flightHit' },
    { id: 'finalVolley', clip: 'pairedVolley' },
    { id: 'victory', clip: 'victory' },
    { id: 'gameOver', clip: 'gameOver' },
  ],
  transitions: [
    // --- highest priority: run-ending states ------------------------------
    { from: '*', to: 'gameOver', duration: 0.2, priority: 100, when: (c) => flag(c, CHEF_FLAGS.gameOver) },
    {
      from: '*',
      to: 'victory',
      duration: 0.16,
      priority: 95,
      when: (c) => flag(c, CHEF_FLAGS.victory),
    },
    {
      from: '*',
      to: 'finalVolley',
      duration: 0.1,
      priority: 92,
      when: (c) => has(c, CHEF_TRIGGERS.finalVolley),
    },

    // --- damage -----------------------------------------------------------
    {
      from: '*',
      to: 'flightHit',
      duration: 0.05,
      priority: 90,
      when: (c) => has(c, CHEF_TRIGGERS.hit) && flag(c, CHEF_FLAGS.flying),
    },
    {
      from: '*',
      to: 'hit',
      duration: 0.05,
      priority: 90,
      when: (c) => has(c, CHEF_TRIGGERS.hit),
    },
    {
      from: '*',
      to: 'respawn',
      duration: 0.06,
      priority: 88,
      when: (c) => has(c, CHEF_TRIGGERS.respawn),
    },

    // --- act transitions --------------------------------------------------
    {
      from: '*',
      to: 'bossWarning',
      duration: 0.22,
      priority: 80,
      when: (c) => flag(c, CHEF_FLAGS.bossWarning) && !flag(c, CHEF_FLAGS.launching),
    },
    {
      from: '*',
      to: 'launch',
      duration: 0.12,
      priority: 80,
      when: (c) => flag(c, CHEF_FLAGS.launching),
    },
    {
      from: '*',
      to: 'flightIdle',
      duration: 0.2,
      priority: 78,
      when: (c) => flag(c, CHEF_FLAGS.flying),
    },
    { from: 'flightHit', to: 'flightIdle', duration: 0.18, exitTime: 1, when: () => true },

    // --- portals ----------------------------------------------------------
    {
      from: '*',
      to: 'portalEnter',
      duration: 0.05,
      priority: 70,
      when: (c) => has(c, CHEF_TRIGGERS.portalEnter),
    },
    {
      from: '*',
      to: 'portalExit',
      duration: 0.05,
      priority: 70,
      when: (c) => has(c, CHEF_TRIGGERS.portalExit),
    },

    // --- spatulas ---------------------------------------------------------
    {
      from: '*',
      to: 'fieldThrow',
      duration: 0.06,
      priority: 60,
      when: (c) => has(c, CHEF_TRIGGERS.throwField),
    },
    {
      from: '*',
      to: 'fieldPickup',
      duration: 0.08,
      priority: 58,
      when: (c) => has(c, CHEF_TRIGGERS.pickup),
    },

    // --- ladder -----------------------------------------------------------
    {
      from: '*',
      to: 'climb',
      duration: 0.12,
      priority: 40,
      when: (c) => c.onLadder && c.climbing,
    },
    {
      from: '*',
      to: 'climbIdle',
      duration: 0.12,
      priority: 39,
      when: (c) => c.onLadder && !c.climbing,
    },

    // --- ground locomotion ------------------------------------------------
    {
      from: '*',
      to: 'compress',
      duration: 0.04,
      priority: 35,
      when: (c) => has(c, CHEF_TRIGGERS.compress),
    },
    {
      from: '*',
      to: 'pivot',
      duration: 0.03,
      priority: 34,
      when: (c) => has(c, CHEF_TRIGGERS.pivot),
    },
    {
      from: 'run',
      to: 'skid',
      duration: 0.05,
      when: (c) => c.inputX === 0 && c.runBlend > 0.45,
    },
    { from: 'skid', to: 'run', duration: 0.09, when: (c) => c.runBlend > 0.2 && c.inputX !== 0 },
    { from: 'skid', to: 'idle', duration: 0.14, exitTime: 0.6, when: (c) => c.runBlend < 0.12 },
    { from: 'idle', to: 'run', duration: 0.09, when: (c) => c.runBlend > 0.12 },
    { from: 'run', to: 'idle', duration: 0.12, when: (c) => c.runBlend < 0.08 },

    // --- one-shots fall back to locomotion --------------------------------
    { from: 'compress', to: 'run', duration: 0.08, exitTime: 1, when: (c) => c.runBlend > 0.12 },
    { from: 'compress', to: 'idle', duration: 0.1, exitTime: 1, when: () => true },
    { from: 'pivot', to: 'run', duration: 0.05, exitTime: 1, when: (c) => c.runBlend > 0.12 },
    { from: 'pivot', to: 'idle', duration: 0.08, exitTime: 1, when: () => true },
    { from: 'fieldThrow', to: 'run', duration: 0.1, exitTime: 1, when: (c) => c.runBlend > 0.12 },
    { from: 'fieldThrow', to: 'idle', duration: 0.12, exitTime: 1, when: () => true },
    { from: 'fieldPickup', to: 'run', duration: 0.1, exitTime: 1, when: (c) => c.runBlend > 0.12 },
    { from: 'fieldPickup', to: 'idle', duration: 0.12, exitTime: 1, when: () => true },
    { from: 'hit', to: 'idle', duration: 0.18, exitTime: 1, when: () => true },
    { from: 'respawn', to: 'idle', duration: 0.12, exitTime: 1, when: () => true },
    { from: 'portalExit', to: 'idle', duration: 0.1, exitTime: 1, when: () => true },
  ],
};

export const CHEF_SELECT_GRAPH: AnimGraphDef = {
  id: 'chef.select',
  initial: 'selectIdle',
  states: [
    { id: 'selectIdle', clip: 'selectIdle' },
    { id: 'turntable', clip: 'turntable' },
    { id: 'joinIn', clip: 'joinIn' },
    { id: 'identitySwap', clip: 'identitySwap' },
    { id: 'presentationSwap', clip: 'presentationSwap' },
    { id: 'ready', clip: 'ready' },
    { id: 'unready', clip: 'unready' },
    { id: 'deviceLost', clip: 'deviceLost' },
    { id: 'deviceReconnect', clip: 'deviceReconnect' },
    { id: 'victory', clip: 'victory' },
  ],
  transitions: [
    {
      from: '*',
      to: 'deviceLost',
      duration: 0.15,
      priority: 100,
      when: (c) => has(c, CHEF_TRIGGERS.deviceLost),
    },
    {
      from: '*',
      to: 'deviceReconnect',
      duration: 0.1,
      priority: 95,
      when: (c) => has(c, CHEF_TRIGGERS.deviceReconnect),
    },
    {
      from: '*',
      to: 'joinIn',
      duration: 0,
      priority: 90,
      when: (c) => has(c, CHEF_TRIGGERS.join),
    },
    {
      from: '*',
      to: 'identitySwap',
      duration: 0.05,
      priority: 80,
      when: (c) => has(c, CHEF_TRIGGERS.identitySwap),
    },
    {
      from: '*',
      to: 'presentationSwap',
      duration: 0.05,
      priority: 79,
      when: (c) => has(c, CHEF_TRIGGERS.presentationSwap),
    },
    {
      from: '*',
      to: 'ready',
      duration: 0.08,
      priority: 70,
      when: (c) => has(c, CHEF_TRIGGERS.ready),
    },
    {
      from: '*',
      to: 'unready',
      duration: 0.08,
      priority: 70,
      when: (c) => has(c, CHEF_TRIGGERS.unready),
    },
    {
      from: '*',
      to: 'turntable',
      duration: 0.2,
      priority: 30,
      when: (c) => flag(c, CHEF_FLAGS.turntable),
    },
    { from: 'turntable', to: 'selectIdle', duration: 0.2, when: (c) => !flag(c, CHEF_FLAGS.turntable) },
    { from: 'joinIn', to: 'selectIdle', duration: 0.12, exitTime: 1, when: () => true },
    { from: 'identitySwap', to: 'selectIdle', duration: 0.1, exitTime: 1, when: () => true },
    { from: 'presentationSwap', to: 'selectIdle', duration: 0.1, exitTime: 1, when: () => true },
    { from: 'unready', to: 'selectIdle', duration: 0.1, exitTime: 1, when: () => true },
    { from: 'deviceReconnect', to: 'selectIdle', duration: 0.12, exitTime: 1, when: () => true },
  ],
};
