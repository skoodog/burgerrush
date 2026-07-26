/**
 * Chef and local player select.
 *
 * Implements the contract in docs/LOCAL_COOP_CHARACTER_SELECT.md:
 * device-scoped join, per-panel identity and presentation choice, an animated
 * swap when a player picks the occupied identity, live red/blue accent preview,
 * independent ready, and colour-independent P1/P2 identification.
 */

import Phaser from 'phaser';
import { VIEW } from '../config/gameplay';
import { UI } from '../art/palette';
import {
  ACCENT_COLORS,
  IDENTITY_META,
  PRESENTATION_META,
  accentForSlot,
  chefSkin,
  swapIdentities,
  type ChefIdentity,
  type GenderPresentation,
  type PlayerSlot,
} from '../config/identity';
import { ControlMap } from '../input/ControlMap';
import { CHEF_TRIGGERS } from '../rigs/chefGraph';
import type { Session} from '../state/Session';
import { SESSION_KEY } from '../state/Session';
import { DollView } from '../view/DollView';
import { createChefPreviewRig } from '../view/chefDollFactory';
import { backdrop, heading, hintChip, label, panel, slotBadge } from '../ui/theme';

interface Panel {
  readonly slot: PlayerSlot;
  readonly x: number;
  view: DollView | null;
  frame: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  letterText: Phaser.GameObjects.Text;
  presentationText: Phaser.GameObjects.Text;
  deviceText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  blurbText: Phaser.GameObjects.Text;
  joined: boolean;
}

export class CharacterSelectScene extends Phaser.Scene {
  private session!: Session;
  private controls!: ControlMap;
  private panels: Panel[] = [];
  private startText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    this.session = this.registry.get(SESSION_KEY) as Session;
    this.session.devices.reset();
    for (const selection of this.session.selections) selection.ready = false;

    backdrop(this, VIEW.width, VIEW.height);
    heading(this, VIEW.width / 2, 52, 'CHOOSE YOUR CHEF', 34);
    label(
      this,
      VIEW.width / 2,
      86,
      'IDENTITY AND PRESENTATION ARE INDEPENDENT · ALL COMBINATIONS PLAY IDENTICALLY',
      12,
      UI.textDim,
    );

    this.controls = new ControlMap(this, this.session.devices);

    const slots: PlayerSlot[] = this.session.coop ? [1, 2] : [1];
    const positions = this.session.coop ? [268, 692] : [VIEW.width / 2];
    slots.forEach((slot, i) => {
      this.panels.push(this.buildPanel(slot, positions[i] as number));
    });

    // Solo play still claims a device so ownership rules are uniform.
    if (!this.session.coop) {
      this.session.devices.claim('keyboard', 1);
      this.joinPanel(this.panels[0] as Panel);
    }

    this.startText = label(this, VIEW.width / 2, 500, '', 16, UI.goldHi);
    hintChip(this, 300, 462, '←→', 'SAL / PEP');
    hintChip(this, 470, 462, '↑↓', 'BOY / GIRL');
    hintChip(this, 640, 462, '⏎', 'READY');

    this.refreshAll();
  }

  private buildPanel(slot: PlayerSlot, x: number): Panel {
    const accent = accentForSlot(slot);
    const color = ACCENT_COLORS[accent];
    const w = this.session.coop ? 380 : 460;
    const frame = panel(this, x - w / 2, 108, w, 330, accent === 'red' ? '#e0392b' : '#2f6fe0');

    slotBadge(this, x - w / 2 + 30, 138, slot, accent, 15);
    label(this, x - w / 2 + 62, 138, `PLAYER ${slot}`, 15, UI.text).setOrigin(0, 0.5);

    const nameText = label(this, x, 380, '', 24, UI.text);
    const letterText = label(this, x + w / 2 - 40, 138, '', 30, `#${color.toString(16).padStart(6, '0')}`);
    const presentationText = label(this, x, 408, '', 15, UI.textDim);
    const blurbText = label(this, x, 432, '', 11, UI.textDim);
    const deviceText = label(this, x, 172, '', 12, UI.textDim);
    const statusText = label(this, x, 196, 'PRESS ENTER / SOUTH BUTTON TO JOIN', 13, UI.goldHi);

    return {
      slot,
      x,
      view: null,
      frame,
      nameText,
      letterText,
      presentationText,
      deviceText,
      statusText,
      blurbText,
      joined: false,
    };
  }

  private joinPanel(panel: Panel): void {
    if (panel.joined) return;
    panel.joined = true;
    const selection = this.session.selection(panel.slot);
    const rig = createChefPreviewRig({
      identity: selection.identity,
      presentation: selection.presentation,
      slot: panel.slot,
      scale: this.session.coop ? 2.0 : 2.4,
    });
    rig.teleport(panel.x, 372);
    rig.context.triggers.add(CHEF_TRIGGERS.join);
    const view = new DollView(this, rig, { shadow: true });
    view.setDepth(6);
    panel.view = view;
    this.session.audio.unlock();
    this.session.audio.play('uiConfirm');
  }

  private setIdentity(panel: Panel, identity: ChefIdentity): void {
    const selection = this.session.selection(panel.slot);
    if (selection.identity === identity) return;

    // Occupied identity -> animated swap that preserves presentation, device and
    // slot colour for both players (co-op acceptance test 6).
    const other = this.panels.find(
      (p) => p !== panel && p.joined && this.session.selection(p.slot).identity === identity,
    );
    if (other) {
      swapIdentities(selection, this.session.selection(other.slot));
      this.applySkin(other);
      other.view?.rig.animator.play('identitySwap', 0);
      panel.view?.rig.animator.play('identitySwap', 0);
    } else {
      selection.identity = identity;
      panel.view?.rig.animator.play('identitySwap', 0);
    }
    this.applySkin(panel);
    this.session.audio.play('uiMove');
    this.refreshAll();
  }

  private setPresentation(panel: Panel, presentation: GenderPresentation): void {
    const selection = this.session.selection(panel.slot);
    if (selection.presentation === presentation) return;
    selection.presentation = presentation;
    this.applySkin(panel);
    panel.view?.rig.animator.play('presentationSwap', 0);
    this.session.audio.play('uiMove');
    this.refreshAll();
  }

  private applySkin(panel: Panel): void {
    const selection = this.session.selection(panel.slot);
    panel.view?.rig.setSkin(
      chefSkin(selection.identity, selection.presentation, accentForSlot(panel.slot)),
    );
  }

  private toggleReady(panel: Panel): void {
    const selection = this.session.selection(panel.slot);
    selection.ready = !selection.ready;
    panel.view?.rig.animator.play(selection.ready ? 'ready' : 'unready', 0.08);
    this.session.audio.play(selection.ready ? 'uiConfirm' : 'uiBack');
    this.refreshAll();
  }

  private refreshAll(): void {
    for (const panel of this.panels) {
      const selection = this.session.selection(panel.slot);
      const meta = IDENTITY_META[selection.identity];
      const accent = accentForSlot(panel.slot);
      panel.nameText.setText(panel.joined ? meta.name.toUpperCase() : '');
      panel.letterText.setText(panel.joined ? meta.letter : '');
      panel.blurbText.setText(panel.joined ? meta.blurb : '');
      panel.presentationText.setText(
        panel.joined
          ? `${PRESENTATION_META[selection.presentation].icon}  ${PRESENTATION_META[selection.presentation].label}`
          : '',
      );
      const device = this.session.devices.deviceForSlot(panel.slot);
      panel.deviceText.setText(panel.joined && device ? `DEVICE: ${device.label}` : '');
      panel.statusText.setText(
        !panel.joined
          ? 'PRESS ENTER / SOUTH BUTTON TO JOIN'
          : selection.ready
            ? `${accent.toUpperCase()} READY`
            : 'CHOOSE, THEN CONFIRM',
      );
      panel.statusText.setColor(selection.ready ? UI.good : UI.goldHi);
      panel.frame.setAlpha(panel.joined ? 1 : 0.55);
    }

    const joined = this.panels.filter((p) => p.joined);
    const allReady = joined.length === this.panels.length && joined.every((p) => this.session.selection(p.slot).ready);
    this.startText.setText(
      allReady ? 'ALL READY — PRESS START' : this.session.coop ? 'BOTH PLAYERS MUST JOIN AND READY UP' : '',
    );
    if (allReady) this.startRun();
  }

  private startRun(): void {
    this.session.persist();
    this.time.delayedCall(420, () => {
      this.scene.start('StackPhase');
    });
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);
    this.controls.update();

    // Join requests from any unclaimed device.
    for (const request of this.controls.pollJoinRequests()) {
      if (this.session.devices.isClaimed(request.deviceId)) continue;
      const free = this.panels.find((p) => !p.joined);
      if (!free) continue;
      if (this.session.devices.claim(request.deviceId, free.slot)) {
        this.joinPanel(free);
        this.refreshAll();
      }
    }

    for (const panel of this.panels) {
      if (!panel.joined) continue;
      const state = this.controls.state(panel.slot);
      if (state.leftPressed) this.setIdentity(panel, 'sal');
      if (state.rightPressed) this.setIdentity(panel, 'pep');
      if (state.upPressed) this.setPresentation(panel, 'boy');
      if (state.downPressed) this.setPresentation(panel, 'girl');
      if (state.confirmPressed) this.toggleReady(panel);
      if (state.backPressed && this.session.selection(panel.slot).ready) this.toggleReady(panel);

      const view = panel.view;
      if (view) {
        view.rig.update(dt);
        view.sync();
      }
    }
  }

  shutdown(): void {
    for (const panel of this.panels) panel.view?.destroy();
    this.panels = [];
  }
}
