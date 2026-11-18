import * as THREE from 'three';
import { BUILDING_SIZE, Terrain, type Building, type BuildingType } from '../sim/grid';
import { POWERED_THRESHOLD } from '../sim/linhKhi';
import { lPath } from '../sim/path';
import type { ActionFail, World } from '../sim/world';
import { buildBlockout } from './blockout/buildings';
import { inkMaterial, withInkEdges } from './inkMaterial';
import { PALETTE } from './palette';
import { fitSpriteToBlockout, loadSpriteTexture, SPRITE_URL } from './sprites';

/** Góc nhìn isometric 2:1 (GDD 3.3): phương vị 45°, nghiêng 30° ⇒ ô vuông thành hình thoi 2:1. */
const AZIMUTH = Math.PI / 4;
const ELEVATION = Math.PI / 6;
const MIN_VIEW = 6;
const MAX_VIEW = 30;
const MAX_MARKS = 128;

export interface SceneOptions {
  /** Mức đồ họa "Giản" cho máy yếu (iPhone SE 2020): giảm độ phân giải, tắt hiệu ứng phụ. */
  low: boolean;
}

/** Công cụ đang cầm (GDD 9.2). Trạng thái giao diện, không phải luật chơi. */
export type Tool =
  | { kind: 'none' }
  | { kind: 'build'; type: BuildingType }
  | { kind: 'road' }
  | { kind: 'demolish' };

/** Thông tin xem trước gửi lên HUD để hiện thanh Xác nhận/Hủy. */
export interface Preview {
  tool: Tool['kind'];
  /** Đã có gì để xác nhận chưa (vd. đường cần đủ hai điểm). */
  ready: boolean;
  ok: boolean;
  reason?: ActionFail;
  /** Dương = tốn, âm = được hoàn. */
  cost: number;
  /** Với đường: đã chọn điểm đầu chưa. */
  hasStart?: boolean;
}

export type ActionOutcome =
  | { ok: true; kind: Tool['kind']; type?: BuildingType; cost: number }
  | { ok: false; kind: Tool['kind']; reason: ActionFail };

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
  private spinners = new Map<number, THREE.Object3D[]>();
  private sprites = new Map<number, THREE.Sprite>();
  /** true = hiện họa bản AI vẽ; false = khối thô (để so sánh). */
  private artMode = true;
  private readonly viewQuat: THREE.Quaternion;
  private overlay = false;
  private timer = new THREE.Timer();
  private seenRevision = -1;

  // công cụ
  private tool: Tool = { kind: 'none' };
  private marks!: THREE.InstancedMesh;
  private ghost: THREE.Sprite | null = null;
  private ghostType: BuildingType | null = null;
  private buildAt: [number, number] = [0, 0];
  private roadStart: [number, number] | null = null;
  private roadEnd: [number, number] | null = null;
  private demolishTile: [number, number] | null = null;

  private onSelect: (id: number | null) => void = () => {};
  private onPreview: (p: Preview | null) => void = () => {};

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
    this.buildMarks();
    this.sync();

    world.subscribe(() => this.sync());
    this.bindInput(canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setOnSelect(fn: (id: number | null) => void): void {
    this.onSelect = fn;
  }

  setOnPreview(fn: (p: Preview | null) => void): void {
    this.onPreview = fn;
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
    this.paintTiles();
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------- công cụ ----------

  setTool(tool: Tool): void {
    this.tool = tool;
    this.roadStart = this.roadEnd = this.demolishTile = null;
    this.setGhost(tool.kind === 'build' ? tool.type : null);
    this.updateToolPreview();
  }

  /** Thực hiện hành động đang xem trước. Công cụ vẫn được giữ để làm tiếp. */
  confirm(): ActionOutcome | null {
    const t = this.tool;
    if (t.kind === 'build') {
      const [x, y] = this.buildAt;
      const r = this.world.build(t.type, x, y);
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'build', type: t.type, cost: r.cost } : { ok: false, kind: 'build', reason: r.reason };
    }
    if (t.kind === 'road' && this.roadStart && this.roadEnd) {
      const r = this.world.buildRoad(this.roadPath());
      if (r.ok) this.roadStart = this.roadEnd = null;
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'road', cost: r.cost } : { ok: false, kind: 'road', reason: r.reason };
    }
    if (t.kind === 'demolish' && this.demolishTile) {
      const r = this.world.demolishAt(...this.demolishTile);
      this.demolishTile = null;
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'demolish', cost: r.cost } : { ok: false, kind: 'demolish', reason: r.reason };
    }
    return null;
  }

  private roadPath(): Array<[number, number]> {
    const [ax, ay] = this.roadStart!;
    const [bx, by] = this.roadEnd ?? this.roadStart!;
    return lPath(ax, ay, bx, by);
  }

  private setGhost(type: BuildingType | null): void {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.material.dispose();
      this.ghost = null;
    }
    this.ghostType = type;
    const url = type && SPRITE_URL[type];
    if (!type || !url) return;
    const mat = new THREE.SpriteMaterial({ transparent: true, opacity: 0.72, depthTest: false, depthWrite: false });
    const ghost = new THREE.Sprite(mat);
    ghost.renderOrder = 900;
    ghost.visible = false;
    this.scene.add(ghost);
    this.ghost = ghost;
    mat.map = loadSpriteTexture(url, () => {
      mat.needsUpdate = true;
      this.updateToolPreview();
    });
  }

  /** Tính lại vị trí bóng mờ, ô đánh dấu và gửi xem trước lên HUD. */
  private updateToolPreview(): void {
    const marks: Array<[number, number]> = [];
    let preview: Preview | null = null;
    let good = true;
    const t = this.tool;

    if (t.kind === 'build') {
      const center = this.groundAt(0, -0.05);
      const g = this.world.grid;
      const [w, h] = [g.width, g.height];
      const [fw, fh] = BUILDING_SIZE[t.type];
      const x = THREE.MathUtils.clamp(Math.floor(center.x - fw / 2 + 0.5), 0, w - fw);
      const y = THREE.MathUtils.clamp(Math.floor(center.z - fh / 2 + 0.5), 0, h - fh);
      this.buildAt = [x, y];
      const r = this.world.previewBuild(t.type, x, y);
      good = r.ok;
      for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) marks.push([x + dx, y + dy]);
      preview = { tool: 'build', ready: true, ok: r.ok, reason: r.ok ? undefined : r.reason, cost: r.cost };
      this.placeGhost(t.type, x, y, r.ok);
    } else if (t.kind === 'road') {
      if (this.roadStart) {
        const path = this.roadPath();
        marks.push(...path);
        const r = this.world.previewRoad(path);
        good = r.ok;
        preview = { tool: 'road', ready: !!this.roadEnd, ok: r.ok, reason: r.ok ? undefined : r.reason, cost: r.cost, hasStart: true };
      } else {
        preview = { tool: 'road', ready: false, ok: true, cost: 0, hasStart: false };
      }
    } else if (t.kind === 'demolish') {
      if (this.demolishTile) {
        const [x, y] = this.demolishTile;
        const b = this.world.grid.buildingAt(x, y);
        if (b) for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) marks.push([b.x + dx, b.y + dy]);
        else marks.push([x, y]);
        good = false;
        preview = { tool: 'demolish', ready: true, ok: true, cost: 0 };
      } else {
        preview = { tool: 'demolish', ready: false, ok: true, cost: 0 };
      }
    }

    this.showMarks(marks, t.kind === 'demolish' ? 'demolish' : good ? 'good' : 'bad');
    this.onPreview(t.kind === 'none' ? null : preview);
  }

  private placeGhost(type: BuildingType, x: number, y: number, ok: boolean): void {
    const ghost = this.ghost;
    const map = ghost?.material.map;
    if (!ghost || !map?.image || this.ghostType !== type) return;
    const probe = buildBlockout(type);
    probe.position.set(x, 0, y);
    const img = map.image as { width: number; height: number };
    fitSpriteToBlockout(ghost, probe, this.viewQuat, img.height / img.width);
    ghost.material.color.set(ok ? '#FFFFFF' : '#E8A49E');
    ghost.visible = true;
  }

  // ---------- đồng bộ với thế giới ----------

  /** Dựng lại những gì đổi trong sim: công trình thêm/bớt, đường, màu ô, bong bóng. */
  private sync(): void {
    if (this.world.revision !== this.seenRevision) {
      this.seenRevision = this.world.revision;
      const alive = new Set(this.world.grid.buildings.map((b) => b.id));
      for (const id of [...this.buildingGroups.keys()]) if (!alive.has(id)) this.removeBuilding(id);
      for (const b of this.world.grid.buildings) if (!this.buildingGroups.has(b.id)) this.addBuilding(b);
      this.layoutTiles();
      if (this.tool.kind !== 'none') this.updateToolPreview();
    }
    this.paintTiles();
    for (const b of this.world.grid.buildings) {
      const v = this.world.linhKhi.building.get(b.id) ?? 0;
      const bubble = this.bubbles.get(b.id);
      if (bubble) bubble.visible = b.type !== 'tuLinhTran' && v < POWERED_THRESHOLD;
    }
  }

  // ---------- dựng cảnh ----------

  private buildTerrain(): void {
    const g = this.world.grid;
    const geo = new THREE.BoxGeometry(0.98, 0.12, 0.98);
    this.tint = new THREE.InstancedBufferAttribute(new Float32Array(g.width * g.height * 3).fill(1), 3);
    geo.setAttribute('aTint', this.tint);
    this.tiles = new THREE.InstancedMesh(geo, inkMaterial('#FFFFFF', '#C9C0AC', true), g.width * g.height);
    this.scene.add(this.tiles);
  }

  private layoutTiles(): void {
    const g = this.world.grid;
    const m = new THREE.Matrix4();
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const i = g.idx(x, y);
        const h = g.road[i] ? 0.02 : g.terrain[i] === Terrain.Water ? -0.08 : 0;
        m.makeTranslation(x + 0.5, h - 0.06, y + 0.5);
        this.tiles.setMatrixAt(i, m);
      }
    }
    this.tiles.instanceMatrix.needsUpdate = true;
  }

  /** Màu từng ô; khi bật Thiên Nhãn, linh lộ chuyển sang sắc thạch thanh theo lượng linh khí. */
  private paintTiles(): void {
    const g = this.world.grid;
    const lk = this.world.linhKhi.road;
    const c = new THREE.Color();
    const paper = new THREE.Color(PALETTE.paperDeep);
    const qi = new THREE.Color(PALETTE.thachThanh);
    const greenish = new THREE.Color(PALETTE.thanhLuc);
    const dim = new THREE.Color('#D9D4C8');
    for (let i = 0; i < g.width * g.height; i++) {
      if (g.road[i]) {
        if (this.overlay) c.copy(paper).lerp(qi, Math.min(lk[i] / 250, 1));
        else c.set(g.terrain[i] === Terrain.Water ? '#C9BBA0' : '#D6CCB6'); // trên nước = cầu gỗ
      } else if (g.terrain[i] === Terrain.Water) c.set(PALETTE.water);
      else if (g.terrain[i] === Terrain.Rock) c.set(PALETTE.inkThanh);
      else if (this.overlay && g.vein[i]) c.set(PALETTE.dangHoang);
      else c.set(PALETTE.paper).lerp(greenish, ((i * 37) % 11) / 60);
      if (this.overlay && !g.road[i] && g.terrain[i] === Terrain.Grass && !g.vein[i]) c.lerp(dim, 0.6);
      this.tint.setXYZ(i, c.r, c.g, c.b);
    }
    this.tint.needsUpdate = true;
  }

  private buildMarks(): void {
    const geo = new THREE.PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false });
    this.marks = new THREE.InstancedMesh(geo, mat, MAX_MARKS);
    this.marks.count = 0;
    this.marks.renderOrder = 50;
    this.marks.frustumCulled = false; // vị trí đổi liên tục, hộp bao tính một lần sẽ sai
    this.scene.add(this.marks);
  }

  private showMarks(tiles: Array<[number, number]>, kind: 'good' | 'bad' | 'demolish'): void {
    const color = new THREE.Color(kind === 'good' ? PALETTE.dangHoang : kind === 'bad' ? PALETTE.chuSa : PALETTE.inkTrong);
    const m = new THREE.Matrix4();
    const n = Math.min(tiles.length, MAX_MARKS);
    for (let k = 0; k < n; k++) {
      const [x, y] = tiles[k];
      m.makeTranslation(x + 0.5, 0.05, y + 0.5);
      this.marks.setMatrixAt(k, m);
      this.marks.setColorAt(k, color);
    }
    this.marks.count = n;
    this.marks.instanceMatrix.needsUpdate = true;
    if (this.marks.instanceColor) this.marks.instanceColor.needsUpdate = true;
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

  private addBuilding(b: Building): void {
    const id = b.id;
    const group = buildBlockout(b.type);
    group.position.set(b.x, 0, b.y);
    const spin: THREE.Object3D[] = [];
    group.traverse((o) => {
      o.userData.buildingId = id;
      if (o.name === 'spin') spin.push(o);
    });
    this.spinners.set(id, spin);
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
    this.setArtMode(this.artMode);
  }

  private removeBuilding(id: number): void {
    for (const map of [this.buildingGroups, this.sprites, this.bubbles] as Array<Map<number, THREE.Object3D>>) {
      const o = map.get(id);
      if (o) this.scene.remove(o);
      map.delete(id);
    }
    this.spinners.delete(id);
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
    this.camera.position.copy(this.target).add(viewDirection().multiplyScalar(60));
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
    if (this.tool.kind === 'build') this.updateToolPreview();
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

  /** Điểm trên mặt đất (y = 0) dưới một vị trí màn hình (tọa độ NDC). */
  private groundAt(ndcX: number, ndcY: number): THREE.Vector3 {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit);
    return hit;
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
      if (pts.size === 1 && moved < 8) this.tap(e.clientX, e.clientY);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
  }

  private tap(px: number, py: number): void {
    const ndcX = (px / window.innerWidth) * 2 - 1;
    const ndcY = -(py / window.innerHeight) * 2 + 1;
    const t = this.tool;
    if (t.kind === 'road' || t.kind === 'demolish') {
      const p = this.groundAt(ndcX, ndcY);
      const tile: [number, number] = [Math.floor(p.x), Math.floor(p.z)];
      if (!this.world.grid.inBounds(...tile)) return;
      if (t.kind === 'road') {
        if (!this.roadStart || this.roadEnd) {
          this.roadStart = tile;
          this.roadEnd = null;
        } else this.roadEnd = tile;
      } else this.demolishTile = tile;
      this.updateToolPreview();
      return;
    }
    if (t.kind === 'build') return; // đặt bằng nút Đặt, bản đồ chỉ để kéo
    this.pick(ndcX, ndcY);
  }

  private pick(ndcX: number, ndcY: number): void {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
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
    for (const list of this.spinners.values()) for (const s of list) s.rotation.z += dt * 0.6;
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
