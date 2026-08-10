/**
 * Entry point. Creates the Phaser game with a letterboxed 16:9 canvas.
 *
 * The simulation is fixed-step inside each scene, so the renderer's frame rate
 * never affects gameplay, replay hashes or animation timing.
 */

import Phaser from 'phaser';
import { VIEW } from '../game/config/gameplay';
import { BootScene } from '../game/scenes/BootScene';
import { TitleScene } from '../game/scenes/TitleScene';
import { CharacterSelectScene } from '../game/scenes/CharacterSelectScene';
import { StackPhaseScene } from '../game/scenes/StackPhaseScene';
import { BossFlightScene } from '../game/scenes/BossFlightScene';
import { ResultsScene } from '../game/scenes/ResultsScene';
import { DollLabScene } from '../game/scenes/DollLabScene';
import { HowToPlayScene } from '../game/scenes/HowToPlayScene';
import '../styles/main.css';

// `?3d` boots the Three.js kitchen instead of the Phaser build. Kept as a
// branch rather than a replacement so the shipping 2.5D game stays reachable
// while the 3D runtime comes up.
const params = new URLSearchParams(window.location.search);
const is3D = params.has('3d');

if (is3D) {
  const root = document.getElementById('game-root') as HTMLElement;
  root.style.cssText = 'position:relative;width:100vw;height:100vh;overflow:hidden';
  const seed = Number(params.get('seed') ?? 1) || 1;
  void import('../game3d/Kitchen3D').then(({ startKitchen3D }) => startKitchen3D(root, seed));
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#070c1c',
  width: VIEW.width,
  height: VIEW.height,
  roundPixels: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    gamepad: true,
    keyboard: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [
    BootScene,
    TitleScene,
    CharacterSelectScene,
    StackPhaseScene,
    BossFlightScene,
    ResultsScene,
    DollLabScene,
    HowToPlayScene,
  ],
};

const game = is3D ? null : new Phaser.Game(config);

// Pause on focus loss, per the accessibility contract.
document.addEventListener('visibilitychange', () => {
  if (!game) return;
  if (document.hidden) game.loop.sleep();
  else game.loop.wake();
});

// Test/automation hook. Never used by gameplay.
declare global {
  interface Window {
    __BURGER_RUSH__?: {
      game: Phaser.Game | null;
      scene: (key: string) => Phaser.Scene | null;
    };
  }
}

window.__BURGER_RUSH__ = {
  game,
  scene: (key: string) => game?.scene.getScene(key) ?? null,
};
