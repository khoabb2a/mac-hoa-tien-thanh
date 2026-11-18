import * as THREE from 'three';
import { Terrain } from '../sim/grid';
import { POWERED_THRESHOLD } from '../sim/linhKhi';
import type { World } from '../sim/world';
import { buildBlockout } from './blockout/buildings';
import { inkMaterial, withInkEdges } from './inkMaterial';
import { PALETTE } from './palette';
import { fitSpriteToBlockout, loadSpriteTexture, SPRITE_URL } from './sprites';

/** Góc nhìn isometric 2:1 (GDD 3.3): phương vị 45°, nghiêng 30° ⇒ ô vuông thành hình thoi 2:1. */
const AZIMUTH = Math.PI / 4;
const ELEVATION = Math.PI / 6;
const MIN_VIEW = 6;
const MAX_VIEW = 30;

export interface SceneOptions {
  /** Mức đồ họa "Giản" cho máy yếu (iPhone SE 2020): giảm độ phân giải, tắt hiệu ứng phụ. */
  low: boolean;
}

export class IsoScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private viewHeight = 22;
  private world: World;
  private tiles!: THREE.InstancedMesh;
  private tint!: THREE.InstancedBufferAttribute;
  private buildingGroups = new Map<number, THREE.Group>();
  private bubbles = new Map<number, THREE.Sprite>();
  private spinners: THREE.Object3D[] = [];
  private sprites = new Map<number, THREE.Sprite>();
  /** true = hiện họa bản AI vẽ; false = khối thô (để so sánh). */
  private artMode = true;
  private readonly viewQuat: THREE.Quaternion;
  private overlay = false;
  private timer = new THREE.Timer();
  private onSelect: (id: number | null) => void = () => {};

  constructor(canvas: HTMLCanvasElement, world: World, opts: SceneOptions) {
    this.world = world;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.low, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.low ? 1.5 : 2));
    this.renderer.setClearColor(0x000000, 0); // nền giấy do CSS vẽ

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const probe = new THREE.OrthographicCamera();
    probe.position.copy(viewDirection());
    probe.lookAt(0, 0, 0);
    this.viewQuat = probe.quaternion.clone();
    this.target.set(world.grid.width / 2, 0, world.grid.height / 2 + 1);
    this.scene.fog = new THREE.Fog(PALETTE.paper, 62, 105); // xa nhạt, gần đậm (camera cách tâm 60)

    this.buildTerrain();
    this.buildMountains();
    for (const b of world.grid.buildings) this.addBuilding(b.id);
    this.refreshOverlay();

    world.subscribe(() => this.refreshOverlay());
    this.bindInput(canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setOnSelect(fn: (id: number | null) => void): void {
    this.onSelect = fn;
  }

  setArtMode(on: boolean): void {
    this.artMode = on;
    for (const [id, group] of this.buildingGroups) {
      const sprite = this.sprites.get(id);
      group.visible = !(on && sprite);
      if (sprite) sprite.visible = on;
    }
  }

  setOverlay(on: boolean): void {
    this.overlay = on;
    this.refreshOverlay();
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- dựng cảnh ----------

  private buildTerrain(): void {
    const g = this.world.grid;
    const geo = new THREE.BoxGeometry(0.98, 0.12, 0.98);
    this.tint = new THREE.InstancedBufferAttribute(new Float32Array(g.width * g.height * 3).fill(1), 3);
    geo.setAttribute('aTint', this.tint);
    this.tiles = new THREE.InstancedMesh(geo, inkMaterial('#FFFFFF', '#C9C0AC', true), g.width * g.height);
    const m = new THREE.Matrix4();
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const i = g.idx(x, y);
        const h = g.terrain[i] === Terrain.Water ? -0.08 : g.road[i] ? 0.02 : 0;
        m.makeTranslation(x + 0.5, h - 0.06, y + 0.5);
        this.tiles.setMatrixAt(i, m);
      }
    }
    this.scene.add(this.tiles);
  }

  /** Màu từng ô; khi bật Thiên Nhãn, linh lộ chuyển sang sắc thạch thanh theo lượng linh khí. */
  private paintTiles(): void {
    const g = this.world.grid;
    const lk = this.world.linhKhi.road;
    const c = new THREE.Color();
    const paper = new THREE.Color(PALETTE.paperDeep);
    const qi = new THREE.Color(PALETTE.thachThanh);
    for (let i = 0; i < g.width * g.height; i++) {
      if (g.terrain[i] === Terrain.Water) c.set(PALETTE.water);
      else if (g.terrain[i] === Terrain.Rock) c.set(PALETTE.inkThanh);
      else if (g.road[i]) {
        if (this.overlay) c.copy(paper).lerp(qi, Math.min(lk[i] / 250, 1));
        else c.set('#D6CCB6');
      } else if (this.overlay && g.vein[i]) c.set(PALETTE.dangHoang);
      else c.set(PALETTE.paper).lerp(new THREE.Color(PALETTE.thanhLuc), ((i * 37) % 11) / 60);
      if (this.overlay && !g.road[i] && g.terrain[i] === Terrain.Grass && !g.vein[i]) c.lerp(new THREE.Color('#D9D4C8'), 0.6);
      this.tint.setXYZ(i, c.r, c.g, c.b);
    }
    this.tint.needsUpdate = true;
  }

  private buildMountains(): void {
    const near = inkMaterial(PALETTE.inkDam, PALETTE.inkTrong);
    const far = inkMaterial(PALETTE.inkThanh, PALETTE.inkDam);
    const g = this.world.grid;
    for (let x = 0; x < g.width; x += 2) {
      const h = 1.2 + ((x * 13) % 7) * 0.35;
      const cone = withInkEdges(new THREE.Mesh(new THREE.ConeGeometry(1.4, h, 5), near), 40);
      cone.position.set(x + 0.8, h / 2, 0.6 + ((x * 5) % 3) * 0.3);
      cone.rotation.y = x;
      this.scene.add(cone);
    }
    for (let k = 0; k < 7; k++) {
      const h = 4 + ((k * 7) % 5);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4 + (k % 3), h, 6), far);
      cone.position.set(-4 + k * 5, h / 2 - 0.5, -6 - (k % 2) * 3);
      this.scene.add(cone);
    }
  }

  private addBuilding(id: number): void {
    const b = this.world.grid.buildings.find((v) => v.id === id);
    if (!b) return;
    const group = buildBlockout(b.type);
    group.position.set(b.x, 0, b.y);
    group.userData.buildingId = id;
    group.traverse((o) => {
      o.userData.buildingId = id;
      if (o.name === 'spin') this.spinners.push(o);
    });
    this.scene.add(group);
    this.buildingGroups.set(id, group);

    const url = SPRITE_URL[b.type];
    if (url) {
      const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.userData.buildingId = id;
      sprite.renderOrder = 100 + b.x + b.w + b.y + b.h; // vẽ kiểu họa sĩ: ô gần camera vẽ sau
      sprite.visible = false;
      this.scene.add(sprite);
      this.sprites.set(id, sprite);
      mat.map = loadSpriteTexture(url, (tex) => {
        const img = tex.image as { width: number; height: number };
        fitSpriteToBlockout(sprite, group, this.viewQuat, img.height / img.width);
        mat.needsUpdate = true;
        this.setArtMode(this.artMode);
      });
    }

    // Bong bóng chữ triện "氣" khi thiếu linh khí (GDD 9.4, tầng 1).
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: sealTexture('氣'), depthTest: false }));
    bubble.scale.set(0.6, 0.6, 1);
    bubble.position.set(b.x + b.w / 2, 2.2, b.y + b.h / 2);
    bubble.visible = false;
    bubble.renderOrder = 1000;
    this.scene.add(bubble);
    this.bubbles.set(id, bubble);
  }

  private refreshOverlay(): void {
    this.paintTiles();
    for (const b of this.world.grid.buildings) {
      const v = this.world.linhKhi.building.get(b.id) ?? 0;
      const bubble = this.bubbles.get(b.id);
      if (bubble) bubble.visible = b.type !== 'tuLinhTran' && v < POWERED_THRESHOLD;
    }
  }

  // ---------- camera & input ----------

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.left = (-this.viewHeight * aspect) / 2;
    this.camera.right = (this.viewHeight * aspect) / 2;
    this.camera.top = this.viewHeight / 2;
    this.camera.bottom = -this.viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.placeCamera();
  }

  private placeCamera(): void {
    const off = viewDirection().multiplyScalar(60);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
  }

  private zoom(factor: number): void {
    this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * factor, MIN_VIEW, MAX_VIEW);
    this.resize();
  }

  private pan(dxPx: number, dyPx: number): void {
    const unitsPerPx = this.viewHeight / window.innerHeight;
    const right = new THREE.Vector3(Math.cos(AZIMUTH), 0, -Math.sin(AZIMUTH));
    const fwd = new THREE.Vector3(-Math.sin(AZIMUTH), 0, -Math.cos(AZIMUTH));
    this.target.addScaledVector(right, -dxPx * unitsPerPx);
    this.target.addScaledVector(fwd, (dyPx * unitsPerPx) / Math.sin(ELEVATION));
    const g = this.world.grid;
    this.target.x = THREE.MathUtils.clamp(this.target.x, 0, g.width);
    this.target.z = THREE.MathUtils.clamp(this.target.z, 0, g.height);
    this.placeCamera();
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        this.pan(e.clientX - p.x, e.clientY - p.y);
        moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y);
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.zoom(pinch / dist);
        pinch = dist;
        moved = 99;
      }
    });
    const up = (e: PointerEvent) => {
      if (pts.size === 1 && moved < 8) this.pick(e.clientX, e.clientY);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
  }

  private pick(px: number, py: number): void {
    const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    for (const [id, g] of this.buildingGroups) {
      const sp = this.sprites.get(id);
      targets.push(sp && sp.visible ? sp : g);
    }
    const hits = ray.intersectObjects(targets, true);
    const hit = hits.find((h) => h.object.userData.buildingId !== undefined);
    this.onSelect(hit ? (hit.object.userData.buildingId as number) : null);
  }

  private frame(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.world.update(dt);
    for (const s of this.spinners) s.rotation.z += dt * 0.6;
    this.renderer.render(this.scene, this.camera);
  }
}

/** Hướng từ tâm nhìn tới camera (vector đơn vị). */
function viewDirection(): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(ELEVATION) * Math.sin(AZIMUTH), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(AZIMUTH));
}

/** Ấn triện chu sa với một chữ Hán, vẽ bằng canvas 2D. */
function sealTexture(ch: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = PALETTE.chuSa;
  g.beginPath();
  g.roundRect(10, 10, 108, 108, 16);
  g.fill();
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 76px "Noto Serif SC", "Songti SC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
