/**
 * Ingredient traversal and burger assembly.
 *
 * Deterministic, allocation-light and completely decoupled from rendering: the
 * scene reads `layers[i].y` and `segmentPressed` each frame and draws them. That
 * lets the headless validator prove a map is completable without a canvas.
 *
 * Rules implemented (MASTER_PROMPT section 7):
 *  1. entering an unpressed segment marks it complete;
 *  2. progress reads by shape/compression, not colour (the art supplies both
 *     `raw` and `pressed` segment textures);
 *  3. completing every segment arms the layer;
 *  4. the layer drops after a short readable anticipation;
 *  5. enemies riding it are carried down and defeated by drop distance;
 *  6. a drop cascades into the layers below;
 *  7. all layers landing on the plate in order completes the burger.
 */

import { TREAD_SEGMENT_W, INGREDIENT_H } from '../art/worldArt';
import type { Face, IngredientLayerDef, LevelDef, PlateDef } from '../levels/types';
import { faceOf } from '../levels/types';

export type LayerState = 'resting' | 'armed' | 'falling' | 'landed';

export interface LayerRuntime {
  readonly def: IngredientLayerDef;
  /** Current top-surface y. */
  y: number;
  state: LayerState;
  /** One flag per tread segment. */
  readonly pressed: boolean[];
  /** Anticipation timer before a drop begins. */
  armTimer: number;
  fallSpeed: number;
  /** y this layer will settle at once it lands. */
  targetY: number;
  /** Enemies riding this layer down, by entity id. */
  readonly riders: Set<number>;
  /** How many decks this drop has travelled, for carry scoring. */
  dropLevels: number;
}

export interface BurgerRuntime {
  readonly id: string;
  readonly plate: PlateDef;
  readonly layerIds: readonly string[];
  landed: number;
  complete: boolean;
}

export interface StackEvent {
  readonly type:
    | 'segment'
    | 'layerComplete'
    | 'layerArmed'
    | 'layerDrop'
    | 'layerLand'
    | 'burgerComplete'
    | 'riderCarried';
  readonly layerId?: string;
  readonly burgerId?: string;
  readonly riders?: number;
  readonly levels?: number;
  readonly segmentIndex?: number;
}

const ARM_ANTICIPATION = 0.22;
const FALL_ACCEL = 1150;
const MAX_FALL = 620;

export class BurgerStack {
  readonly layers = new Map<string, LayerRuntime>();
  readonly burgers = new Map<string, BurgerRuntime>();
  readonly events: StackEvent[] = [];

  constructor(level: LevelDef) {
    for (const def of level.layers) {
      this.layers.set(def.id, {
        def,
        y: def.y,
        state: 'resting',
        pressed: new Array<boolean>(def.segments).fill(false),
        armTimer: 0,
        fallSpeed: 0,
        targetY: def.y,
        riders: new Set<number>(),
        dropLevels: 0,
      });
    }
    for (const plate of level.plates) {
      const layerIds = level.layers
        .filter((l) => l.burger === plate.burger)
        .sort((a, b) => a.order - b.order)
        .map((l) => l.id);
      this.burgers.set(plate.burger, {
        id: plate.burger,
        plate,
        layerIds,
        landed: 0,
        complete: false,
      });
    }
  }

  get allComplete(): boolean {
    for (const burger of this.burgers.values()) if (!burger.complete) return false;
    return true;
  }

  get requiredBurgerCount(): number {
    return this.burgers.size;
  }

  get completedBurgerCount(): number {
    let n = 0;
    for (const burger of this.burgers.values()) if (burger.complete) n += 1;
    return n;
  }

  /** Total pressed segments across the level - drives the HUD progress read. */
  segmentProgress(): { pressed: number; total: number } {
    let pressed = 0;
    let total = 0;
    for (const layer of this.layers.values()) {
      total += layer.pressed.length;
      for (const p of layer.pressed) if (p) pressed += 1;
    }
    return { pressed, total };
  }

  /** Top surface y of a layer, whatever its state. */
  surfaceY(layer: LayerRuntime): number {
    return layer.y;
  }

  layerAtPosition(x: number, y: number, tolerance = 6): LayerRuntime | null {
    for (const layer of this.layers.values()) {
      const w = layer.def.segments * TREAD_SEGMENT_W;
      if (x < layer.def.x || x > layer.def.x + w) continue;
      if (Math.abs(layer.y - y) > tolerance) continue;
      return layer;
    }
    return null;
  }

  /**
   * Marks the tread segment under `x` as pressed.
   * Returns the segment index if this call changed anything, else -1.
   */
  tread(layer: LayerRuntime, x: number): number {
    if (layer.state !== 'resting') return -1;
    const local = x - layer.def.x;
    const index = Math.floor(local / TREAD_SEGMENT_W);
    if (index < 0 || index >= layer.pressed.length) return -1;
    if (layer.pressed[index]) return -1;
    layer.pressed[index] = true;
    this.events.push({ type: 'segment', layerId: layer.def.id, segmentIndex: index });
    if (layer.pressed.every(Boolean)) {
      layer.state = 'armed';
      layer.armTimer = ARM_ANTICIPATION;
      this.events.push({ type: 'layerComplete', layerId: layer.def.id });
      this.events.push({ type: 'layerArmed', layerId: layer.def.id });
    }
    return index;
  }

  /** Fixed-step update. */
  update(dt: number): void {
    for (const layer of this.layers.values()) {
      switch (layer.state) {
        case 'armed':
          layer.armTimer -= dt;
          if (layer.armTimer <= 0) this.beginFall(layer);
          break;
        case 'falling':
          layer.fallSpeed = Math.min(MAX_FALL, layer.fallSpeed + FALL_ACCEL * dt);
          layer.y += layer.fallSpeed * dt;
          if (layer.y >= layer.targetY) this.land(layer);
          else this.cascade(layer);
          break;
        default:
          break;
      }
    }
  }

  private beginFall(layer: LayerRuntime): void {
    layer.state = 'falling';
    layer.fallSpeed = 90;
    layer.dropLevels = 0;
    layer.targetY = this.computeLandingY(layer);
    this.events.push({ type: 'layerDrop', layerId: layer.def.id });
    if (layer.riders.size > 0) {
      this.events.push({
        type: 'riderCarried',
        layerId: layer.def.id,
        riders: layer.riders.size,
      });
    }
  }

  /**
   * A falling layer that reaches a resting layer below arms it too, which is the
   * cascade the brief asks for and the source of multi-enemy drop scoring.
   */
  private cascade(falling: LayerRuntime): void {
    const burger = this.burgers.get(falling.def.burger);
    if (!burger) return;
    for (const id of burger.layerIds) {
      if (id === falling.def.id) continue;
      const other = this.layers.get(id);
      if (!other || other.state !== 'resting') continue;
      if (other.def.order >= falling.def.order) continue;
      if (Math.abs(other.y - falling.y) > INGREDIENT_H * 0.75) continue;
      other.state = 'falling';
      other.fallSpeed = falling.fallSpeed;
      other.dropLevels = 0;
      other.targetY = this.computeLandingY(other);
      falling.dropLevels += 1;
      this.events.push({ type: 'layerDrop', layerId: other.def.id });
      if (other.riders.size > 0) {
        this.events.push({ type: 'riderCarried', layerId: other.def.id, riders: other.riders.size });
      }
    }
  }

  /** Landing height = plate top minus one thickness per already-landed layer. */
  private computeLandingY(layer: LayerRuntime): number {
    const burger = this.burgers.get(layer.def.burger);
    if (!burger) return layer.y;
    const belowLanded = burger.layerIds
      .map((id) => this.layers.get(id))
      .filter((l): l is LayerRuntime => !!l && l.state === 'landed' && l.def.order < layer.def.order)
      .length;
    const fallingBelow = burger.layerIds
      .map((id) => this.layers.get(id))
      .filter(
        (l): l is LayerRuntime =>
          !!l && (l.state === 'falling' || l.state === 'armed') && l.def.order < layer.def.order,
      ).length;
    const stackIndex = belowLanded + fallingBelow;
    return burger.plate.y - stackIndex * (INGREDIENT_H - 2);
  }

  private land(layer: LayerRuntime): void {
    layer.y = layer.targetY;
    layer.state = 'landed';
    layer.fallSpeed = 0;
    const carried = layer.riders.size;
    layer.riders.clear();
    this.events.push({
      type: 'layerLand',
      layerId: layer.def.id,
      riders: carried,
      levels: Math.max(1, layer.dropLevels + 1),
    });

    const burger = this.burgers.get(layer.def.burger);
    if (!burger) return;
    burger.landed = burger.layerIds.filter((id) => this.layers.get(id)?.state === 'landed').length;
    if (!burger.complete && burger.landed === burger.layerIds.length) {
      burger.complete = true;
      this.events.push({ type: 'burgerComplete', burgerId: burger.id });
    }
  }

  /** Cheat path used by E2E tests and the attract-mode bot. */
  forceCompleteAll(): void {
    for (const layer of this.layers.values()) {
      layer.pressed.fill(true);
      if (layer.state === 'resting') {
        layer.state = 'armed';
        layer.armTimer = 0;
      }
    }
  }

  drainEvents(): StackEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }
}

/** Solid surfaces the chef can stand on: platforms plus resting/landed layers. */
export interface SurfaceQuery {
  readonly y: number;
  readonly x1: number;
  readonly x2: number;
  readonly layerId: string | null;
}

/**
 * Standable surfaces on one face.
 *
 * `face` defaults to the front so every single-face map and every existing
 * caller behaves exactly as before. On a two-face map this filter is what stops
 * a chef on the front from landing on a platform that is physically behind them.
 */
export function collectSurfaces(
  level: LevelDef,
  stack: BurgerStack,
  face: Face = 0,
): SurfaceQuery[] {
  const surfaces: SurfaceQuery[] = level.platforms
    .filter((p) => faceOf(p) === face)
    .map((p) => ({
      y: p.y,
      x1: p.x1,
      x2: p.x2,
      layerId: null,
    }));
  for (const layer of stack.layers.values()) {
    if (layer.state === 'falling') continue;
    if (faceOf(layer.def) !== face) continue;
    surfaces.push({
      y: layer.y,
      x1: layer.def.x,
      x2: layer.def.x + layer.def.segments * TREAD_SEGMENT_W,
      layerId: layer.def.id,
    });
  }
  return surfaces;
}
