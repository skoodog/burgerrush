/**
 * Reads assigned devices into per-slot control state.
 *
 * Unassigned devices can raise a join action but can never move a chef.
 * Keyboard defaults follow MASTER_PROMPT section 6.
 */

import Phaser from 'phaser';
import type { PlayerSlot } from '../config/identity';
import type { InputDeviceRegistry } from './InputDeviceRegistry';

export interface ControlState {
  moveX: number;
  moveY: number;
  fire: boolean;
  firePressed: boolean;
  actionPressed: boolean;
  confirmPressed: boolean;
  backPressed: boolean;
  pausePressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
}

export function emptyControlState(): ControlState {
  return {
    moveX: 0,
    moveY: 0,
    fire: false,
    firePressed: false,
    actionPressed: false,
    confirmPressed: false,
    backPressed: false,
    pausePressed: false,
    upPressed: false,
    downPressed: false,
    leftPressed: false,
    rightPressed: false,
  };
}

const DEAD_ZONE = 0.35;

interface KeyBundle {
  readonly left: Phaser.Input.Keyboard.Key[];
  readonly right: Phaser.Input.Keyboard.Key[];
  readonly up: Phaser.Input.Keyboard.Key[];
  readonly down: Phaser.Input.Keyboard.Key[];
  readonly fire: Phaser.Input.Keyboard.Key[];
  readonly action: Phaser.Input.Keyboard.Key[];
  readonly confirm: Phaser.Input.Keyboard.Key[];
  readonly back: Phaser.Input.Keyboard.Key[];
  readonly pause: Phaser.Input.Keyboard.Key[];
}

export class ControlMap {
  private readonly scene: Phaser.Scene;
  private readonly registry: InputDeviceRegistry;
  private keys: KeyBundle | null = null;
  private readonly padPrev = new Map<number, Set<number>>();
  private readonly states = new Map<PlayerSlot, ControlState>();
  /** Touch/virtual-pad axis contributions, written by the touch overlay. */
  readonly virtual = { moveX: 0, moveY: 0, fire: false, firePressed: false };

  constructor(scene: Phaser.Scene, registry: InputDeviceRegistry) {
    this.scene = scene;
    this.registry = registry;
    this.states.set(1, emptyControlState());
    this.states.set(2, emptyControlState());
    this.bindKeyboard();
    this.bindGamepads();
  }

  private bindKeyboard(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    const add = (...codes: string[]): Phaser.Input.Keyboard.Key[] =>
      codes.map((c) => kb.addKey(c, true, true));
    this.keys = {
      left: add('LEFT', 'A'),
      right: add('RIGHT', 'D'),
      up: add('UP', 'W'),
      down: add('DOWN', 'S'),
      fire: add('X', 'K'),
      action: add('SPACE', 'Z'),
      confirm: add('ENTER'),
      back: add('ESC'),
      pause: add('ESC', 'P'),
    };
  }

  private bindGamepads(): void {
    const pads = this.scene.input.gamepad;
    if (!pads) return;
    pads.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.registry.connectGamepad(pad.index, pad.id || `Gamepad ${pad.index + 1}`);
    });
    pads.on('disconnected', (pad: Phaser.Input.Gamepad.Gamepad) => {
      this.registry.disconnectGamepad(pad.index);
    });
    // Pads already present before this scene started.
    for (const pad of pads.gamepads) {
      if (pad) this.registry.connectGamepad(pad.index, pad.id || `Gamepad ${pad.index + 1}`);
    }
  }

  /** Refreshes both slots. Call once per frame before reading. */
  update(): void {
    for (const slot of [1, 2] as PlayerSlot[]) {
      const state = this.states.get(slot) as ControlState;
      Object.assign(state, emptyControlState());
      const device = this.registry.deviceForSlot(slot);
      if (!device || !device.connected) continue;
      if (device.kind === 'keyboard') this.readKeyboard(state);
      else if (device.kind === 'gamepad') this.readGamepad(state, device.gamepadIndex);
      else if (device.kind === 'touch') this.readVirtual(state);
    }
  }

  state(slot: PlayerSlot): ControlState {
    return this.states.get(slot) as ControlState;
  }

  /** Any-device join detection for the character-select scene. */
  pollJoinRequests(): { deviceId: string }[] {
    const out: { deviceId: string }[] = [];
    const kb = this.keys;
    if (kb) {
      const pressed =
        kb.confirm.some((k) => Phaser.Input.Keyboard.JustDown(k)) ||
        kb.action.some((k) => Phaser.Input.Keyboard.JustDown(k));
      if (pressed) out.push({ deviceId: 'keyboard' });
    }
    const pads = this.scene.input.gamepad;
    if (pads) {
      for (const pad of pads.gamepads) {
        if (!pad) continue;
        const buttons = new Set<number>();
        pad.buttons.forEach((b, i) => {
          if (b.pressed) buttons.add(i);
        });
        const prev = this.padPrev.get(pad.index) ?? new Set<number>();
        // South face (0) or Start (9).
        for (const index of [0, 9]) {
          if (buttons.has(index) && !prev.has(index)) {
            const device = this.registry
              .list()
              .find((d) => d.kind === 'gamepad' && d.gamepadIndex === pad.index);
            if (device) out.push({ deviceId: device.id });
            break;
          }
        }
        this.padPrev.set(pad.index, buttons);
      }
    }
    return out;
  }

  private readKeyboard(state: ControlState): void {
    const k = this.keys;
    if (!k) return;
    const down = (list: Phaser.Input.Keyboard.Key[]): boolean => list.some((key) => key.isDown);
    const just = (list: Phaser.Input.Keyboard.Key[]): boolean =>
      list.some((key) => Phaser.Input.Keyboard.JustDown(key));

    state.moveX = (down(k.right) ? 1 : 0) - (down(k.left) ? 1 : 0);
    state.moveY = (down(k.down) ? 1 : 0) - (down(k.up) ? 1 : 0);
    state.fire = down(k.fire);
    state.firePressed = just(k.fire);
    state.actionPressed = just(k.action);
    state.confirmPressed = just(k.confirm);
    state.backPressed = just(k.back);
    state.pausePressed = just(k.pause);
    state.leftPressed = just(k.left);
    state.rightPressed = just(k.right);
    state.upPressed = just(k.up);
    state.downPressed = just(k.down);
  }

  private readGamepad(state: ControlState, index: number): void {
    const pads = this.scene.input.gamepad;
    if (!pads || index < 0) return;
    const pad = pads.gamepads[index];
    if (!pad) return;

    const ax = pad.axes.length > 0 ? (pad.axes[0]?.getValue() ?? 0) : 0;
    const ay = pad.axes.length > 1 ? (pad.axes[1]?.getValue() ?? 0) : 0;
    const dpadLeft = pad.left || ax < -DEAD_ZONE;
    const dpadRight = pad.right || ax > DEAD_ZONE;
    const dpadUp = pad.up || ay < -DEAD_ZONE;
    const dpadDown = pad.down || ay > DEAD_ZONE;

    state.moveX = (dpadRight ? 1 : 0) - (dpadLeft ? 1 : 0);
    state.moveY = (dpadDown ? 1 : 0) - (dpadUp ? 1 : 0);

    const buttons = new Set<number>();
    pad.buttons.forEach((b, i) => {
      if (b.pressed) buttons.add(i);
    });
    const prev = this.padPrev.get(index) ?? new Set<number>();
    const justPressed = (i: number): boolean => buttons.has(i) && !prev.has(i);

    // 0 south, 1 east, 2 west, 9 start.
    state.fire = buttons.has(2);
    state.firePressed = justPressed(2);
    state.actionPressed = justPressed(0);
    state.confirmPressed = justPressed(0);
    state.backPressed = justPressed(1);
    state.pausePressed = justPressed(9);
    state.leftPressed = dpadLeft && !prev.has(-1);
    state.rightPressed = dpadRight && !prev.has(-2);
    state.upPressed = dpadUp && !prev.has(-3);
    state.downPressed = dpadDown && !prev.has(-4);

    // Encode direction latches into the same prev-set so repeats are edge-based.
    if (dpadLeft) buttons.add(-1);
    if (dpadRight) buttons.add(-2);
    if (dpadUp) buttons.add(-3);
    if (dpadDown) buttons.add(-4);
    this.padPrev.set(index, buttons);
  }

  private readVirtual(state: ControlState): void {
    state.moveX = this.virtual.moveX;
    state.moveY = this.virtual.moveY;
    state.fire = this.virtual.fire;
    state.firePressed = this.virtual.firePressed;
    this.virtual.firePressed = false;
  }
}
