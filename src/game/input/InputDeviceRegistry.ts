/**
 * Input device ownership.
 *
 * A device claims exactly one player slot and keeps it across scenes, pauses,
 * portals, map flips, boss transitions and results. Reconnection uses an
 * explicit session token rather than the browser gamepad index, because indices
 * are reassigned on reconnect - docs/LOCAL_COOP_CHARACTER_SELECT.md section 5.
 */

import type { PlayerSlot } from '../config/identity';

export type DeviceKind = 'keyboard' | 'gamepad' | 'touch';

export interface InputDevice {
  /** Stable session token. Survives a gamepad index change. */
  readonly id: string;
  readonly kind: DeviceKind;
  label: string;
  /** Live gamepad index, refreshed on every reconnect. May be -1 when absent. */
  gamepadIndex: number;
  connected: boolean;
}

export interface DeviceAssignment {
  readonly slot: PlayerSlot;
  readonly deviceId: string;
}

export type RegistryEvent =
  | { type: 'deviceConnected'; device: InputDevice }
  | { type: 'deviceDisconnected'; device: InputDevice; slot: PlayerSlot | null }
  | { type: 'deviceClaimed'; device: InputDevice; slot: PlayerSlot }
  | { type: 'deviceReleased'; device: InputDevice; slot: PlayerSlot }
  | { type: 'deviceRebound'; device: InputDevice; slot: PlayerSlot };

export class InputDeviceRegistry {
  private readonly devices = new Map<string, InputDevice>();
  private readonly slotToDevice = new Map<PlayerSlot, string>();
  private readonly listeners: ((event: RegistryEvent) => void)[] = [];
  private gamepadCounter = 0;

  constructor() {
    this.register({
      id: 'keyboard',
      kind: 'keyboard',
      label: 'Keyboard',
      gamepadIndex: -1,
      connected: true,
    });
  }

  on(listener: (event: RegistryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const i = this.listeners.indexOf(listener);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  register(device: InputDevice): InputDevice {
    this.devices.set(device.id, device);
    this.emit({ type: 'deviceConnected', device });
    return device;
  }

  list(): InputDevice[] {
    return [...this.devices.values()];
  }

  get(id: string): InputDevice | undefined {
    return this.devices.get(id);
  }

  deviceForSlot(slot: PlayerSlot): InputDevice | undefined {
    const id = this.slotToDevice.get(slot);
    return id ? this.devices.get(id) : undefined;
  }

  slotForDevice(deviceId: string): PlayerSlot | null {
    for (const [slot, id] of this.slotToDevice) if (id === deviceId) return slot;
    return null;
  }

  isClaimed(deviceId: string): boolean {
    return this.slotForDevice(deviceId) !== null;
  }

  /**
   * Claims a slot for a device.
   *
   * Refuses when the device already owns another slot: one physical input source
   * may never drive both panels (co-op acceptance test 3).
   */
  claim(deviceId: string, slot: PlayerSlot): boolean {
    const device = this.devices.get(deviceId);
    if (!device || !device.connected) return false;
    const existing = this.slotForDevice(deviceId);
    if (existing !== null && existing !== slot) return false;
    if (this.slotToDevice.has(slot) && this.slotToDevice.get(slot) !== deviceId) return false;
    this.slotToDevice.set(slot, deviceId);
    this.emit({ type: 'deviceClaimed', device, slot });
    return true;
  }

  release(slot: PlayerSlot): void {
    const id = this.slotToDevice.get(slot);
    if (!id) return;
    const device = this.devices.get(id);
    this.slotToDevice.delete(slot);
    if (device) this.emit({ type: 'deviceReleased', device, slot });
  }

  /**
   * Binds a replacement device to a slot whose device dropped.
   * Identity, presentation, slot colour, score ownership and the replay channel
   * are all untouched - they live outside the registry by design.
   */
  rebind(slot: PlayerSlot, newDeviceId: string): boolean {
    const device = this.devices.get(newDeviceId);
    if (!device || !device.connected) return false;
    const owner = this.slotForDevice(newDeviceId);
    if (owner !== null && owner !== slot) return false;
    this.slotToDevice.set(slot, newDeviceId);
    this.emit({ type: 'deviceRebound', device, slot });
    return true;
  }

  /** Called by the gamepad poller when a pad appears. */
  connectGamepad(index: number, rawId: string): InputDevice {
    // Reuse a disconnected device with the same hardware id so a reconnecting
    // controller can rebind to its old slot.
    for (const device of this.devices.values()) {
      if (device.kind === 'gamepad' && !device.connected && device.label === rawId) {
        device.connected = true;
        device.gamepadIndex = index;
        this.emit({ type: 'deviceConnected', device });
        return device;
      }
    }
    this.gamepadCounter += 1;
    return this.register({
      id: `gamepad-${this.gamepadCounter}`,
      kind: 'gamepad',
      label: rawId,
      gamepadIndex: index,
      connected: true,
    });
  }

  disconnectGamepad(index: number): InputDevice | null {
    for (const device of this.devices.values()) {
      if (device.kind === 'gamepad' && device.gamepadIndex === index && device.connected) {
        device.connected = false;
        device.gamepadIndex = -1;
        const slot = this.slotForDevice(device.id);
        this.emit({ type: 'deviceDisconnected', device, slot });
        return device;
      }
    }
    return null;
  }

  /** Devices that are connected but not owned by any slot. */
  unclaimed(): InputDevice[] {
    return this.list().filter((d) => d.connected && !this.isClaimed(d.id));
  }

  assignments(): DeviceAssignment[] {
    return [...this.slotToDevice.entries()].map(([slot, deviceId]) => ({ slot, deviceId }));
  }

  reset(): void {
    this.slotToDevice.clear();
  }
}
