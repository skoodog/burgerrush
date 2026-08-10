/**
 * Kitchen3D - the playable 3D runtime.
 *
 * Builds a walkable world straight from a `Level3D` and runs it: you run around
 * floors in x/z, climb ladders between them, and tread ingredients to drop them
 * down their column onto the plate. The level is one the seeded generator made
 * and the validator already proved winnable, so anything you can see, you can
 * finish.
 *
 * Deliberately self-contained. It owns its own canvas and loop rather than
 * living inside the Phaser game, so the shipping 2.5D build is untouched while
 * this comes up.
 *
 * Art: the chef is a billboard using the generated Higgsfield render, loaded
 * from its CDN at runtime. If that fetch fails - offline, blocked egress - it
 * falls back to a painted canvas texture, so the game is always playable
 * without a network.
 */

import * as THREE from 'three';
import { generateLevel3D } from '../game/levels/generate3d';
import { validateLevel3D } from '../game/systems/solvable3d';
import {
  cellKey,
  ingredientCells,
  walkCells,
  type Ingredient3D,
  type Level3D,
} from '../game/levels/level3d';

const CHEF_TEXTURE_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_33A4FtSZ53mYDotyJ5KWAsMBjtW/hf_20260727_031952_4a22948e-3ab6-44f1-858f-708d5ea26b0d_min.webp';

const INGREDIENT_COLOR: Record<string, number> = {
  bunBottom: 0xd9a05b,
  bunTop: 0xe0aa63,
  patty: 0x6b3f26,
  cheese: 0xf2b632,
  lettuce: 0x6fbf4a,
  tomato: 0xd6453c,
};

const STEP = 1 / 120;
const RUN_SPEED = 5.2;
const CLIMB_SPEED = 3.4;
const SLAB = 0.34;

interface IngredientRuntime {
  readonly def: Ingredient3D;
  readonly mesh: THREE.Mesh;
  readonly pressed: boolean[];
  state: 'resting' | 'falling' | 'landed';
  y: number;
  targetY: number;
  fallSpeed: number;
}

/** Painted fallback so the game never depends on the network to be playable. */
function paintedChefTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 128;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.clearRect(0, 0, 96, 128);
  g.fillStyle = '#f4f1e8';
  g.fillRect(30, 8, 36, 22); // toque
  g.fillStyle = '#d33f3f';
  g.fillRect(30, 26, 36, 8); // band
  g.fillStyle = '#f0c9a0';
  g.fillRect(34, 34, 28, 22); // face
  g.fillStyle = '#f4f1e8';
  g.fillRect(28, 56, 40, 38); // jacket
  g.fillStyle = '#d33f3f';
  g.fillRect(46, 56, 6, 38);
  for (let i = 0; i < 4; i += 1) {
    g.fillStyle = i % 2 === 0 ? '#d33f3f' : '#f4f1e8';
    g.fillRect(30 + i * 9, 94, 9, 26); // striped trousers
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export interface Kitchen3DHandle {
  destroy(): void;
}

export function startKitchen3D(root: HTMLElement, seed = 1): Kitchen3DHandle {
  const level: Level3D = generateLevel3D(seed, { floors: 4, burgers: 2, width: 14, depth: 9 });
  const proof = validateLevel3D(level);

  const cell = 1;
  const floorH = 2.2;
  const wx = (x: number): number => x * cell;
  const wz = (z: number): number => z * cell;
  const wy = (f: number): number => f * floorH;

  // --- walkable lookup -----------------------------------------------------
  const walkable = new Set<string>();
  for (const w of level.walks) {
    for (const c of walkCells(w)) walkable.add(cellKey(w.floor, c.x, c.z));
  }
  const ladderAt = new Map<string, number>();
  for (const l of level.ladders) {
    if (!walkable.has(cellKey(l.lower, l.x, l.z))) continue;
    if (!walkable.has(cellKey(l.lower + 1, l.x, l.z))) continue;
    ladderAt.set(cellKey(l.lower, l.x, l.z), l.lower + 1);
    ladderAt.set(cellKey(l.lower + 1, l.x, l.z), l.lower);
  }

  // --- renderer ------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1024);
  scene.fog = new THREE.Fog(0x0a1024, 18, 42);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x2a2118, 1.15));
  const key = new THREE.DirectionalLight(0xfff2d8, 1.5);
  key.position.set(8, 16, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  scene.add(key);

  // --- geometry ------------------------------------------------------------
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x9fb0cc, roughness: 0.75 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x55637f, roughness: 0.9 });

  for (const w of level.walks) {
    const cells = walkCells(w);
    const first = cells[0]!;
    const last = cells[cells.length - 1]!;
    const lenX = Math.abs(last.x - first.x) + 1;
    const lenZ = Math.abs(last.z - first.z) + 1;
    const geo = new THREE.BoxGeometry(lenX * cell, 0.16, lenZ * cell);
    const mesh = new THREE.Mesh(geo, deckMat);
    mesh.position.set(
      wx(first.x + (lenX - 1) / 2),
      wy(w.floor),
      wz(first.z + (lenZ - 1) / 2),
    );
    mesh.receiveShadow = true;
    scene.add(mesh);

    const lip = new THREE.Mesh(new THREE.BoxGeometry(lenX * cell, 0.07, lenZ * cell), edgeMat);
    lip.position.copy(mesh.position);
    lip.position.y -= 0.1;
    scene.add(lip);
  }

  const rungMat = new THREE.MeshStandardMaterial({ color: 0xf0b95c, roughness: 0.5 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x7c4f16, roughness: 0.7 });
  for (const l of level.ladders) {
    if (!ladderAt.has(cellKey(l.lower, l.x, l.z))) continue;
    const base = wy(l.lower);
    for (const dx of [-0.22, 0.22]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, floorH, 0.07), railMat);
      rail.position.set(wx(l.x) + dx, base + floorH / 2, wz(l.z));
      rail.castShadow = true;
      scene.add(rail);
    }
    for (let t = 0.22; t < floorH; t += 0.32) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.07), rungMat);
      rung.position.set(wx(l.x), base + t, wz(l.z));
      scene.add(rung);
    }
  }

  // --- plates and ingredients ----------------------------------------------
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xe9eef7,
    roughness: 0.25,
    metalness: 0.3,
  });
  for (const p of level.plates) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.segments * cell + 0.3, 0.1, cell + 0.3), plateMat);
    mesh.position.set(wx(p.x + (p.segments - 1) / 2), wy(0) + 0.13, wz(p.z));
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const ingredients: IngredientRuntime[] = [];
  for (const def of level.ingredients) {
    const color = INGREDIENT_COLOR[def.kind] ?? 0xcccccc;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(def.segments * cell, SLAB, cell * 0.9),
      mat,
    );
    const y = wy(def.floor) + 0.16;
    mesh.position.set(wx(def.x + (def.segments - 1) / 2), y + SLAB / 2, wz(def.z));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    ingredients.push({
      def,
      mesh,
      pressed: new Array<boolean>(def.segments).fill(false),
      state: 'resting',
      y,
      targetY: y,
      fallSpeed: 0,
    });
  }

  // --- chef ----------------------------------------------------------------
  const chefMat = new THREE.SpriteMaterial({ map: paintedChefTexture(), transparent: true });
  const chef = new THREE.Sprite(chefMat);
  chef.scale.set(0.95, 1.27, 1);
  scene.add(chef);

  // Swap in the generated render when it arrives; keep the painted one if not.
  new THREE.TextureLoader().load(
    CHEF_TEXTURE_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      chefMat.map = tex;
      chefMat.needsUpdate = true;
      setStatus('art: Higgsfield render');
    },
    undefined,
    () => setStatus('art: offline fallback'),
  );

  const shadowBlob = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }),
  );
  shadowBlob.rotation.x = -Math.PI / 2;
  scene.add(shadowBlob);

  // --- player state --------------------------------------------------------
  let px = wx(level.spawn.x);
  let pz = wz(level.spawn.z);
  let pf = level.spawn.floor;
  let climbT = 0;
  let climbFrom = pf;
  let climbTo = pf;
  let climbing = false;

  const keys = new Set<string>();
  const onDown = (e: KeyboardEvent): void => {
    keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  };
  const onUp = (e: KeyboardEvent): void => {
    keys.delete(e.code);
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  const isWalkable = (x: number, z: number, f: number): boolean =>
    walkable.has(cellKey(f, Math.round(x / cell), Math.round(z / cell)));

  // --- HUD -----------------------------------------------------------------
  const hud = document.createElement('div');
  hud.style.cssText =
    'position:absolute;left:0;top:0;padding:10px 14px;font:600 14px/1.5 system-ui,sans-serif;' +
    'color:#f4f1e8;text-shadow:0 2px 6px #000;pointer-events:none;';
  root.appendChild(hud);
  let statusLine = 'art: loading…';
  const setStatus = (s: string): void => {
    statusLine = s;
  };

  const totalIngredients = ingredients.length;
  let landed = 0;
  let won = false;

  // --- simulation ----------------------------------------------------------
  function tread(): void {
    for (const ing of ingredients) {
      if (ing.state !== 'resting') continue;
      if (ing.def.floor !== pf) continue;
      const cells = ingredientCells(ing.def);
      cells.forEach((c, i) => {
        if (ing.pressed[i]) return;
        const dx = Math.abs(px - wx(c.x));
        const dz = Math.abs(pz - wz(c.z));
        if (dx < cell * 0.45 && dz < cell * 0.5) {
          ing.pressed[i] = true;
          (ing.mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x222200);
        }
      });
      if (ing.pressed.every(Boolean)) beginFall(ing);
    }
  }

  function columnOf(ing: IngredientRuntime): IngredientRuntime[] {
    return ingredients.filter((i) => i.def.burger === ing.def.burger);
  }

  function landingY(ing: IngredientRuntime): number {
    const below = columnOf(ing).filter((i) => i.state === 'landed').length;
    return wy(0) + 0.18 + below * SLAB;
  }

  function beginFall(ing: IngredientRuntime): void {
    if (ing.state !== 'resting') return;
    ing.state = 'falling';
    ing.fallSpeed = 1.2;
    ing.targetY = landingY(ing);
  }

  function step(dt: number): void {
    // --- movement ---------------------------------------------------------
    if (climbing) {
      climbT += (CLIMB_SPEED / floorH) * dt;
      if (climbT >= 1) {
        climbing = false;
        pf = climbTo;
        climbT = 0;
      }
    } else {
      let mx = 0;
      let mz = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) mx -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) mx += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) mz -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) mz += 1;

      const here = cellKey(pf, Math.round(px / cell), Math.round(pz / cell));
      const target = ladderAt.get(here);
      // Vertical intent on a ladder cell climbs instead of walking.
      const wantsClimb = target !== undefined && (keys.has('Space') || keys.has('KeyE'));
      if (wantsClimb) {
        climbing = true;
        climbFrom = pf;
        climbTo = target;
        climbT = 0;
        px = wx(Math.round(px / cell));
        pz = wz(Math.round(pz / cell));
      } else if (mx !== 0 || mz !== 0) {
        const len = Math.hypot(mx, mz);
        const nx = px + (mx / len) * RUN_SPEED * dt;
        const nz = pz + (mz / len) * RUN_SPEED * dt;
        if (isWalkable(nx, pz, pf)) px = nx;
        if (isWalkable(px, nz, pf)) pz = nz;
      }
    }

    tread();

    // --- falling ingredients ----------------------------------------------
    for (const ing of ingredients) {
      if (ing.state !== 'falling') continue;
      ing.fallSpeed = Math.min(14, ing.fallSpeed + 22 * dt);
      ing.y -= ing.fallSpeed * dt;

      // Cascade: knock any resting piece it passes in the same column.
      for (const other of columnOf(ing)) {
        if (other === ing || other.state !== 'resting') continue;
        if (ing.y <= other.y + SLAB && ing.y > other.y - SLAB) beginFall(other);
      }

      if (ing.y <= ing.targetY) {
        ing.y = ing.targetY;
        ing.state = 'landed';
        landed += 1;
        (ing.mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x000000);
        if (landed === totalIngredients) won = true;
      }
      ing.mesh.position.y = ing.y + SLAB / 2;
    }
  }

  // --- loop ----------------------------------------------------------------
  const playerY = (): number =>
    climbing ? wy(climbFrom) + (wy(climbTo) - wy(climbFrom)) * climbT : wy(pf);

  let acc = 0;
  let last = performance.now();
  let raf = 0;

  function resize(): void {
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
    }

    const py = playerY();
    chef.position.set(px, py + 0.78, pz);
    shadowBlob.position.set(px, py + 0.2, pz);

    // Angled chase camera: high enough to read depth, close enough to feel it.
    const camTarget = new THREE.Vector3(px, py + 1.1, pz);
    const desired = new THREE.Vector3(px + 0.4, py + 5.4, pz + 7.6);
    camera.position.lerp(desired, 0.09);
    camera.lookAt(camTarget);

    hud.innerHTML =
      `<div>BURGER RUSH 3D — seed ${level.seed}</div>` +
      `<div>plated ${landed}/${totalIngredients}${won ? ' — COMPLETE!' : ''}</div>` +
      `<div style="opacity:.7">arrows/WASD run · SPACE on a ladder to climb</div>` +
      `<div style="opacity:.55">solvable: ${proof.ok ? 'proven' : 'FAILED'} · ${statusLine}</div>`;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      root.removeChild(renderer.domElement);
      root.removeChild(hud);
    },
  };
}
