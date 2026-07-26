/**
 * Procedural audio.
 *
 * Every cue in docs/ART_AND_AUDIO_PROMPTS.md is synthesised here with Web Audio
 * so the game ships complete, offline, with no sample downloads and no
 * generation credits spent. The production prompts stay in the docs; when real
 * recordings arrive they replace `play(id)` behind the same cue ids.
 *
 * Runtime behaviour implemented per the audio brief:
 *  - four variations per repeat-heavy footstep, chosen round-robin;
 *  - +/-3% pitch and +/-1.5 dB gain randomisation;
 *  - alternating stereo position by foot;
 *  - identical footsteps never stack on the same frame;
 *  - separate master / music / SFX / warning buses.
 */

import { AUDIO_DEFAULTS } from '../config/gameplay';

export type Substrate =
  | 'bunTop'
  | 'bunBottom'
  | 'lettuce'
  | 'cheese'
  | 'patty'
  | 'tomato'
  | 'pickle'
  | 'onion'
  | 'steel'
  | 'plate'
  | 'ladder'
  | 'freezer';

export type CueId =
  | 'tread'
  | 'layerArmed'
  | 'layerDrop'
  | 'layerLand'
  | 'enemyCarried'
  | 'burgerComplete'
  | 'portal'
  | 'mapFlip'
  | 'spatulaPickup'
  | 'spatulaThrow'
  | 'spatulaHit'
  | 'klaxon'
  | 'launch'
  | 'flightFire'
  | 'pickleShot'
  | 'ketchupShot'
  | 'mustardShot'
  | 'mayoShot'
  | 'armourBreak'
  | 'vulnerableCore'
  | 'enrage'
  | 'bossDefeat'
  | 'tick'
  | 'finalWarning'
  | 'lifeLost'
  | 'roundClear'
  | 'uiMove'
  | 'uiConfirm'
  | 'uiBack';

interface SubstrateVoice {
  readonly baseFreq: number;
  readonly noise: number;
  readonly decay: number;
  readonly body: number;
  readonly tick: number;
}

/**
 * Per-surface voicing. These map straight onto the written prompts: airy
 * cushion for bun, leafy crinkle for lettuce, tacky slap for cheese, glassy
 * brine click for pickle, metallic tick for steel and ladder rungs.
 */
const SUBSTRATES: Readonly<Record<Substrate, SubstrateVoice>> = Object.freeze({
  bunTop: { baseFreq: 150, noise: 0.35, decay: 0.17, body: 0.7, tick: 0.25 },
  bunBottom: { baseFreq: 138, noise: 0.32, decay: 0.18, body: 0.72, tick: 0.2 },
  lettuce: { baseFreq: 900, noise: 0.85, decay: 0.14, body: 0.18, tick: 0.55 },
  cheese: { baseFreq: 420, noise: 0.45, decay: 0.15, body: 0.5, tick: 0.6 },
  patty: { baseFreq: 118, noise: 0.4, decay: 0.18, body: 0.85, tick: 0.15 },
  tomato: { baseFreq: 260, noise: 0.42, decay: 0.16, body: 0.55, tick: 0.35 },
  pickle: { baseFreq: 1150, noise: 0.7, decay: 0.13, body: 0.22, tick: 0.8 },
  onion: { baseFreq: 780, noise: 0.8, decay: 0.14, body: 0.3, tick: 0.7 },
  steel: { baseFreq: 1800, noise: 0.3, decay: 0.12, body: 0.2, tick: 0.9 },
  plate: { baseFreq: 640, noise: 0.2, decay: 0.18, body: 0.6, tick: 0.75 },
  ladder: { baseFreq: 2100, noise: 0.25, decay: 0.11, body: 0.15, tick: 1 },
  freezer: { baseFreq: 200, noise: 0.6, decay: 0.15, body: 0.5, tick: 0.5 },
});

/** Deterministic-enough jitter that never touches a gameplay RNG stream. */
class AudioJitter {
  private state = 0x1234_5678;
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
}

export class AudioDirector {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private warningBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private readonly jitter = new AudioJitter();
  private footVariation = 0;
  private lastFootstepAt = -1;
  private musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicLayer = 0;

  readonly volumes: Record<keyof typeof AUDIO_DEFAULTS, number> = { ...AUDIO_DEFAULTS };
  muted = false;

  /** Web Audio needs a user gesture; scenes call this from the first input. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.master.connect(ctx.destination);

    const bus = (level: number): GainNode => {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(this.master as GainNode);
      return g;
    };
    this.musicBus = bus(this.volumes.music);
    this.sfxBus = bus(this.volumes.sfx);
    this.warningBus = bus(this.volumes.warning);

    // Shared white-noise buffer for all textural cues.
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  setVolume(bus: keyof typeof AUDIO_DEFAULTS, value: number): void {
    this.volumes[bus] = value;
    if (!this.ctx) return;
    const target =
      bus === 'master'
        ? this.master
        : bus === 'music'
          ? this.musicBus
          : bus === 'sfx'
            ? this.sfxBus
            : this.warningBus;
    if (target) target.gain.value = value;
  }

  get ready(): boolean {
    return this.ctx !== null;
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private busFor(cue: CueId): GainNode | null {
    if (cue === 'klaxon' || cue === 'finalWarning' || cue === 'tick') return this.warningBus;
    return this.sfxBus;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    bus: GainNode | null,
    pan = 0,
    sweepTo?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !bus || this.muted) return;
    const t = this.now();
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (sweepTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.008, duration * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(g).connect(panner).connect(bus);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(
    duration: number,
    gain: number,
    bus: GainNode | null,
    filterFreq: number,
    q = 1,
    pan = 0,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !bus || !this.noiseBuffer || this.muted) return;
    const t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    src.connect(filter).connect(g).connect(panner).connect(bus);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  /**
   * Substrate footstep. Four variations, alternating stereo position, with the
   * same-frame stack guard the audio brief requires.
   */
  footstep(substrate: Substrate, foot: 'near' | 'far' = 'near'): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = this.now();
    if (t - this.lastFootstepAt < 0.03) return;
    this.lastFootstepAt = t;

    const voice = SUBSTRATES[substrate];
    this.footVariation = (this.footVariation + 1) % 4;
    const pitch = 1 + (this.jitter.next() - 0.5) * 0.06 + (this.footVariation - 1.5) * 0.012;
    const gain = 0.22 * (1 + (this.jitter.next() - 0.5) * 0.17);
    const pan = foot === 'near' ? 0.14 : -0.14;

    this.tone(voice.baseFreq * pitch, voice.decay * voice.body, 'sine', gain * voice.body, this.sfxBus, pan, voice.baseFreq * pitch * 0.6);
    this.noise(voice.decay, gain * voice.noise * 0.5, this.sfxBus, voice.baseFreq * 3.2 * pitch, 1.4, pan);
    if (voice.tick > 0.4) {
      this.tone(voice.baseFreq * 4 * pitch, 0.035, 'triangle', gain * voice.tick * 0.3, this.sfxBus, pan);
    }
  }

  play(cue: CueId): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bus = this.busFor(cue);
    const t = this.now();
    switch (cue) {
      case 'tread':
        this.tone(760, 0.07, 'triangle', 0.12, bus);
        this.noise(0.05, 0.05, bus, 1600, 2);
        break;
      case 'layerArmed':
        [520, 660, 830].forEach((f, i) => {
          window.setTimeout(() => this.tone(f, 0.09, 'square', 0.11, bus), i * 70);
        });
        break;
      case 'layerDrop':
        this.tone(180, 0.4, 'sine', 0.24, bus, 0, 60);
        this.noise(0.36, 0.14, bus, 420, 0.8);
        break;
      case 'layerLand':
        this.tone(120, 0.24, 'sine', 0.3, bus, 0, 70);
        this.noise(0.14, 0.16, bus, 900, 1.2);
        this.tone(880, 0.12, 'triangle', 0.08, bus);
        break;
      case 'enemyCarried':
        this.tone(700, 0.3, 'sawtooth', 0.12, bus, 0, 180);
        break;
      case 'burgerComplete':
        [660, 880, 1180].forEach((f, i) => {
          window.setTimeout(() => this.tone(f, 0.2, 'triangle', 0.16, bus), i * 110);
        });
        break;
      case 'portal':
        this.tone(240, 0.32, 'sine', 0.16, bus, 0, 1400);
        this.noise(0.3, 0.1, bus, 2200, 3);
        break;
      case 'mapFlip':
        this.tone(90, 0.9, 'sine', 0.2, bus, 0, 260);
        this.noise(0.85, 0.12, bus, 1200, 0.7);
        break;
      case 'spatulaPickup':
        this.tone(1320, 0.14, 'triangle', 0.16, bus, 0, 2100);
        break;
      case 'spatulaThrow':
      case 'flightFire':
        this.tone(1500 + this.jitter.next() * 220, 0.06, 'triangle', 0.07, bus, (this.jitter.next() - 0.5) * 0.5, 900);
        this.noise(0.05, 0.045, bus, 3200, 3.5);
        break;
      case 'spatulaHit':
        this.tone(420, 0.16, 'square', 0.16, bus, 0, 160);
        this.noise(0.1, 0.12, bus, 2400, 2);
        break;
      case 'klaxon':
        // Original two-pulse warning horn: lower/shorter, then higher/longer.
        this.tone(300, 0.34, 'sawtooth', 0.26, this.warningBus, -0.1, 268);
        window.setTimeout(() => this.tone(392, 0.52, 'sawtooth', 0.28, this.warningBus, 0.1, 350), 420);
        break;
      case 'launch':
        this.noise(0.55, 0.2, bus, 900, 0.6);
        this.tone(220, 0.6, 'sine', 0.18, bus, 0, 1500);
        break;
      case 'pickleShot':
        this.tone(1400, 0.1, 'sine', 0.11, bus, 0, 900);
        break;
      case 'ketchupShot':
        this.tone(180, 0.34, 'sawtooth', 0.15, bus, 0, 120);
        this.noise(0.3, 0.1, bus, 700, 1);
        break;
      case 'mustardShot':
        this.tone(880, 0.26, 'triangle', 0.12, bus, 0, 1320);
        break;
      case 'mayoShot':
        this.tone(320, 0.3, 'sine', 0.14, bus, 0, 220);
        break;
      case 'armourBreak':
        this.noise(0.22, 0.2, bus, 1800, 1.5);
        this.tone(560, 0.18, 'square', 0.14, bus, 0, 300);
        window.setTimeout(() => this.tone(1180, 0.14, 'triangle', 0.1, bus), 120);
        break;
      case 'vulnerableCore':
        this.tone(220, 0.16, 'square', 0.14, bus, 0, 180);
        window.setTimeout(() => this.tone(190, 0.16, 'square', 0.13, bus, 0, 150), 150);
        window.setTimeout(() => this.tone(880, 0.3, 'triangle', 0.16, bus, 0, 1400), 320);
        break;
      case 'enrage':
        this.tone(70, 0.7, 'sawtooth', 0.22, bus, 0, 140);
        this.noise(0.6, 0.14, bus, 500, 0.8);
        break;
      case 'bossDefeat':
        this.tone(520, 0.2, 'square', 0.2, bus, -0.2, 300);
        window.setTimeout(() => this.tone(520, 0.2, 'square', 0.2, bus, 0.2, 300), 90);
        window.setTimeout(() => this.noise(0.5, 0.18, bus, 700, 0.7), 200);
        [523, 659, 784, 1047].forEach((f, i) =>
          window.setTimeout(() => this.tone(f, 0.28, 'triangle', 0.16, bus), 700 + i * 110),
        );
        break;
      case 'tick':
        this.tone(1600, 0.045, 'square', 0.09, this.warningBus);
        break;
      case 'finalWarning':
        for (let i = 0; i < 5; i += 1) {
          window.setTimeout(
            () => this.tone(1200 + i * 180, 0.07, 'square', 0.14, this.warningBus),
            i * 200,
          );
        }
        break;
      case 'lifeLost':
        this.noise(0.14, 0.16, bus, 1400, 1.4);
        this.tone(330, 0.22, 'triangle', 0.16, bus, 0, 220);
        window.setTimeout(() => this.tone(220, 0.3, 'triangle', 0.14, bus, 0, 160), 180);
        break;
      case 'roundClear':
        [392, 523, 659, 784].forEach((f, i) =>
          window.setTimeout(() => this.tone(f, 0.24, 'triangle', 0.17, bus), i * 130),
        );
        break;
      case 'uiMove':
        this.tone(880, 0.05, 'square', 0.07, bus);
        break;
      case 'uiConfirm':
        this.tone(660, 0.08, 'triangle', 0.12, bus);
        window.setTimeout(() => this.tone(990, 0.12, 'triangle', 0.12, bus), 70);
        break;
      case 'uiBack':
        this.tone(440, 0.09, 'triangle', 0.1, bus, 0, 300);
        break;
      default:
        break;
    }
    void t;
  }

  // -------------------------------------------------------------------------
  // Adaptive music: four phase-aligned layers that add without restarting
  // -------------------------------------------------------------------------

  startStackMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    this.stopMusic();
    const chord = [98, 147, 196, 294];
    this.musicNodes = chord.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.05 : 0;
      osc.connect(gain).connect(this.musicBus as GainNode);
      osc.start();
      return { osc, gain };
    });
    this.musicLayer = 0;
  }

  /** 0 = base, 1 = pressure, 2 = rage, 3 = final five. */
  setMusicLayer(layer: 0 | 1 | 2 | 3): void {
    if (layer === this.musicLayer) return;
    this.musicLayer = layer;
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.musicNodes.forEach((node, i) => {
      const target = i <= layer ? (i === 0 ? 0.05 : 0.032) : 0;
      node.gain.gain.cancelScheduledValues(t);
      node.gain.gain.linearRampToValueAtTime(target, t + 0.4);
      if (layer >= 2) node.osc.detune.setValueAtTime(i * 4, t);
    });
  }

  stopMusic(): void {
    for (const node of this.musicNodes) {
      try {
        node.osc.stop();
      } catch {
        // Already stopped; nothing to clean up.
      }
      node.osc.disconnect();
      node.gain.disconnect();
    }
    this.musicNodes = [];
  }

  /** Briefly ducks music under a headline cue. */
  duck(seconds = 0.4): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const t = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(this.volumes.music * 0.25, t + 0.06);
    this.musicBus.gain.linearRampToValueAtTime(this.volumes.music, t + seconds);
  }

  destroy(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}

/** Maps an ingredient kind onto its footstep substrate. */
export function substrateForLayer(kind: string | null): Substrate {
  switch (kind) {
    case 'bunTop':
      return 'bunTop';
    case 'bunBottom':
      return 'bunBottom';
    case 'lettuce':
      return 'lettuce';
    case 'cheese':
      return 'cheese';
    case 'patty':
      return 'patty';
    case 'tomato':
      return 'tomato';
    case 'pickle':
      return 'pickle';
    case 'onion':
      return 'onion';
    default:
      return 'steel';
  }
}
