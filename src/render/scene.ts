import * as THREE from 'three';
import { fengShuiAt, fengShuiMap, type FengShui } from '../sim/fengShui';
import { BUILDING_SIZE, Terrain, type Building, type BuildingType } from '../sim/grid';
import { POWERED_THRESHOLD } from '../sim/linhKhi';
import { lPath } from '../sim/path';
import type { Action } from '../sim/protocol';
import type { ActionFail, ActionResult, World } from '../sim/world';
import type { ZoneType } from '../sim/zones';
import { buildBlockout } from './blockout/buildings';
import { HouseLayer, loadHouseSheets } from './houses';
import { PALETTE } from './palette';
import { sealTexture } from './seal';
import { fitSpriteToBlockout, loadSpriteTexture, SPRITE_URL } from './sprites';
import { decorFor, loadDecorSheets, makeBackdrop, makeDecorSprite } from './terrainArt';
import { LAYER, terrainMaterial } from './terrainMaterial';

/** Góc nhìn isometric 2:1 (GDD 3.3): phương vị 45°, nghiêng 30° ⇒ ô vuông thành hình thoi 2:1. */
export const AZIMUTH = Math.PI / 4;
export const ELEVATION = Math.PI / 6;
export const MIN_VIEW = 6;
export const MAX_VIEW = 30;
const MAX_MARKS = 600; // vùng quy hoạch lớn cần nhiều ô đánh dấu

export interface SceneOptions {
  /** Mức đồ họa "Giản" cho máy yếu (iPhone SE 2020): giảm độ phân giải, tắt hiệu ứng phụ. */
  low: boolean;
}

/** Công cụ đang cầm (GDD 9.2). Trạng thái giao diện, không phải luật chơi. */
export type Tool =
  | { kind: 'none' }
  | { kind: 'build'; type: BuildingType }
  | { kind: 'road' }
  | { kind: 'zone'; type: ZoneType }
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
  /** Với đường/quy hoạch: đã chọn điểm đầu (góc đầu) chưa. */
  hasStart?: boolean;
  /** Với xây công trình: phong thủy chỗ đang đặt. */
  fengShui?: FengShui;
  /** Với quy hoạch: số ô sẽ tô. */
  tiles?: number;
}

export type ActionOutcome =
  | { ok: true; kind: Tool['kind']; type?: BuildingType; zone?: ZoneType; tiles?: number; cost: number }
  | { ok: false; kind: Tool['kind']; reason: ActionFail };

export class IsoScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  private target = new THREE.Vector3();
  private glide: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private focusRing: THREE.Mesh | null = null;
  private viewHeight = 22;
  private world: World;
  private tiles!: THREE.InstancedMesh;
  private tint!: THREE.InstancedBufferAttribute;
  private layer!: THREE.InstancedBufferAttribute;
  private terrainMat!: THREE.ShaderMaterial;
  private decor: THREE.Sprite[] = [];
  private decorKey = '';
  private houses: HouseLayer;
  private fsDots!: THREE.InstancedMesh;
  private fsMap: Uint8Array = new Uint8Array(0);
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
  private zoneA: [number, number] | null = null;
  private zoneB: [number, number] | null = null;
  /** Mọi hành động đi qua đây: chạy tại chỗ hoặc gửi sang Web Worker (platform/simClient.ts). */
  private act: (a: Action) => ActionResult;

  private onSelect: (id: number | null) => void = () => {};
  private onLot: (tile: [number, number] | null) => void = () => {};
  private guide: THREE.Group[] = [];
  private guideClock = 0;
  private external: { frame(dt: number): void } | null = null;
  private onPreview: (p: Preview | null) => void = () => {};

  constructor(canvas: HTMLCanvasElement, world: World, act: (a: Action) => ActionResult, opts: SceneOptions) {
    this.world = world;
    this.act = act;
    this.houses = new HouseLayer(this.scene);
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
    this.scene.add(makeBackdrop(world.grid, viewDirection()));
    this.buildMarks();
    this.buildFengShuiDots();
    this.sync();

    world.subscribe(() => this.sync());
    void loadDecorSheets().then((any) => any && this.rebuildDecor(true));
    void loadHouseSheets().then((any) => {
      if (!any) return;
      this.houses.reset();
      this.houses.update(this.world.grid);
    });
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

  /** Tọa độ màn hình (px CSS) của tâm một ô — dùng cho thử nghiệm tự động (?debug). */
  tileToScreen(x: number, y: number): [number, number] {
    const v = new THREE.Vector3(x + 0.5, 0, y + 0.5).project(this.camera);
    return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /**
   * "Chỉ cho tôi" (Thiên Đạo Lệnh): lướt camera tới ô (x, y) rồi khoanh vòng chu sa nhấp nháy vài giây.
   * w/h: bề rộng vùng cần khoanh (ô).
   */
  focusTile(x: number, y: number, ring = true, w = 2, h = 2): void {
    const to = new THREE.Vector3(x + w / 2, 0, y + h / 2);
    this.glide = { from: this.target.clone(), to, t: 0 };
    if (!ring) {
      if (this.focusRing) this.focusRing.visible = false;
      return;
    }
    if (!this.focusRing) {
      const m = new THREE.MeshBasicMaterial({ color: PALETTE.chuSa, transparent: true, depthTest: false });
      this.focusRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48), m);
      this.focusRing.rotation.x = -Math.PI / 2;
      this.focusRing.renderOrder = 2000;
      this.scene.add(this.focusRing);
    }
    this.focusRing.position.set(to.x, 0.05, to.z);
    this.focusRing.userData.size = Math.max(w, h);
    this.focusRing.userData.life = 4.5;
    this.focusRing.visible = true;
  }

  // ---------- công cụ ----------

  setTool(tool: Tool): void {
    this.tool = tool;
    this.roadStart = this.roadEnd = this.demolishTile = this.zoneA = this.zoneB = null;
    this.setGhost(tool.kind === 'build' ? tool.type : null);
    this.fsDots.visible = tool.kind === 'build' || tool.kind === 'zone';
    this.updateToolPreview();
  }

  /** Thực hiện hành động đang xem trước. Công cụ vẫn được giữ để làm tiếp. */
  confirm(): ActionOutcome | null {
    const t = this.tool;
    if (t.kind === 'build') {
      const [x, y] = this.buildAt;
      const r = this.act({ k: 'build', type: t.type, x, y });
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'build', type: t.type, cost: r.cost } : { ok: false, kind: 'build', reason: r.reason };
    }
    if (t.kind === 'road' && this.roadStart && this.roadEnd) {
      const r = this.act({ k: 'road', path: this.roadPath() });
      if (r.ok) this.roadStart = this.roadEnd = null;
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'road', cost: r.cost } : { ok: false, kind: 'road', reason: r.reason };
    }
    if (t.kind === 'demolish' && this.demolishTile) {
      const [dx, dy] = this.demolishTile;
      const r = this.act({ k: 'demolish', x: dx, y: dy });
      this.demolishTile = null;
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'demolish', cost: r.cost } : { ok: false, kind: 'demolish', reason: r.reason };
    }
    if (t.kind === 'zone' && this.zoneA && this.zoneB) {
      const [ax, ay] = this.zoneA;
      const [bx, by] = this.zoneB;
      const tiles = this.world.zoneTiles(t.type, ax, ay, bx, by).length;
      const r = this.act({ k: 'zone', type: t.type, ax, ay, bx, by });
      if (r.ok) this.zoneA = this.zoneB = null;
      this.updateToolPreview();
      return r.ok ? { ok: true, kind: 'zone', zone: t.type, tiles, cost: r.cost } : { ok: false, kind: 'zone', reason: r.reason };
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
      const fengShui = fengShuiAt(g, x, y, fw, fh);
      preview = { tool: 'build', ready: true, ok: r.ok, reason: r.ok ? undefined : r.reason, cost: r.cost, fengShui };
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
    } else if (t.kind === 'zone') {
      if (this.zoneA) {
        const [ax, ay] = this.zoneA;
        const [bx, by] = this.zoneB ?? this.zoneA;
        marks.push(...this.world.zoneTiles(t.type, ax, ay, bx, by));
        const r = this.world.previewZone(t.type, ax, ay, bx, by);
        good = r.ok || !this.zoneB;
        preview = { tool: 'zone', ready: !!this.zoneB, ok: r.ok, reason: r.ok ? undefined : r.reason, cost: r.cost, hasStart: true, tiles: r.tiles };
      } else {
        preview = { tool: 'zone', ready: false, ok: true, cost: 0, hasStart: false };
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

    const kind = t.kind === 'demolish' ? 'demolish' : !good ? 'bad' : t.kind === 'zone' ? t.type : 'good';
    this.showMarks(marks, kind);
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
      this.rebuildDecor();
      this.houses.update(this.world.grid);
      this.updateFengShuiDots();
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
    const n = g.width * g.height;
    const geo = new THREE.BoxGeometry(1, 0.12, 1); // không chừa khe: texture họa bản liền mạch giữa các ô
    this.tint = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    this.layer = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    geo.setAttribute('aTint', this.tint);
    geo.setAttribute('aLayer', this.layer);
    this.terrainMat = terrainMaterial();
    this.tiles = new THREE.InstancedMesh(geo, this.terrainMat, n);
    this.tiles.frustumCulled = false;
    this.scene.add(this.tiles);
  }

  /**
   * Dựng lại cây, đá, vách theo lưới (ô vừa làm đường/xây/quy hoạch thì vật trang trí biến mất).
   * Chỉ dựng lại khi đường, công trình hoặc vùng đổi — không phải mỗi lần nhà mọc.
   */
  private rebuildDecor(force = false): void {
    const g = this.world.grid;
    let h = 0;
    for (let i = 0; i < g.road.length; i++) h = (Math.imul(h, 31) + g.road[i] * 7 + (g.occupant[i] >= 0 ? 3 : 0) + (g.zone[i] ? 1 : 0)) | 0;
    const key = String(h);
    if (!force && key === this.decorKey) return;
    this.decorKey = key;
    for (const s of this.decor) {
      this.scene.remove(s);
      if (s.material.map?.userData.sheetClone) s.material.map.dispose(); // chỉ bản cắt riêng; ảnh gốc dùng chung vẫn trong cache
      s.material.dispose();
    }
    this.decor = decorFor(this.world.grid).map((item) => makeDecorSprite(item));
    for (const s of this.decor) this.scene.add(s);
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

  /**
   * Chọn texture (lớp) và màu nhân cho từng ô. Màu nhân trắng = giữ nguyên họa bản.
   * Thiên Nhãn: đất mờ đi, linh lộ ngả sắc thạch thanh theo lượng linh khí, mắt linh mạch ánh vàng.
   */
  private paintTiles(): void {
    const g = this.world.grid;
    const lk = this.world.linhKhi.road;
    const c = new THREE.Color();
    const white = new THREE.Color(1, 1, 1);
    const qi = new THREE.Color('#6E9DBF');
    const dim = new THREE.Color('#BDB8AE');
    const rock = new THREE.Color('#C4BFB5');
    const water = new THREE.Color('#C8DAE0');
    const bridge = new THREE.Color('#D9C3A0');
    const vein = new THREE.Color(PALETTE.dangHoang);
    for (let i = 0; i < g.width * g.height; i++) {
      let layer: number = LAYER.ground;
      if (g.road[i]) {
        layer = LAYER.road;
        if (this.overlay) c.copy(white).lerp(qi, Math.min(lk[i] / 200, 1));
        else if (g.terrain[i] === Terrain.Water) c.copy(bridge); // linh lộ trên nước = cầu gỗ
        else c.copy(white);
      } else if (g.terrain[i] === Terrain.Water) {
        layer = LAYER.water;
        c.copy(water);
      } else if (g.terrain[i] === Terrain.Rock) {
        c.copy(rock);
      } else if (this.overlay && g.vein[i]) {
        c.copy(vein);
      } else if (g.zone[i]) {
        // vùng phàm trần: loang một sắc nhạt theo loại vùng (ô chưa có nhà đậm hơn để dễ thấy)
        c.copy(ZONE_TINT[g.zone[i]]);
        if (g.level[i] > 0) c.lerp(white, 0.5);
        if (this.overlay) c.lerp(dim, 0.5);
      } else {
        c.copy(white).multiplyScalar(0.97 + 0.03 * (((i * 37) % 11) / 10));
        if (this.overlay) c.lerp(dim, 0.7);
      }
      this.tint.setXYZ(i, c.r, c.g, c.b);
      this.layer.setX(i, layer);
    }
    this.tint.needsUpdate = true;
    this.layer.needsUpdate = true;
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

  private showMarks(tiles: Array<[number, number]>, kind: 'good' | 'bad' | 'demolish' | ZoneType): void {
    const color =
      kind === 'good' ? new THREE.Color(PALETTE.dangHoang)
      : kind === 'bad' ? new THREE.Color(PALETTE.chuSa)
      : kind === 'demolish' ? new THREE.Color(PALETTE.inkTrong)
      : new THREE.Color(ZONE_MARK[kind]);
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

  /** Chấm phong thủy (GDD 5.4): hiện khi cầm công trình hoặc quy hoạch; chấm càng to, càng vàng = càng cát. */
  private buildFengShuiDots(): void {
    const g = this.world.grid;
    const geo = new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false });
    this.fsDots = new THREE.InstancedMesh(geo, mat, g.width * g.height);
    this.fsDots.count = 0;
    this.fsDots.renderOrder = 60;
    this.fsDots.frustumCulled = false;
    this.fsDots.visible = false;
    this.scene.add(this.fsDots);
  }

  private updateFengShuiDots(): void {
    const g = this.world.grid;
    this.fsMap = fengShuiMap(g);
    const m = new THREE.Matrix4();
    const colors = [new THREE.Color('#B9B2A4'), new THREE.Color('#D2B97A'), new THREE.Color(PALETTE.dangHoang), new THREE.Color('#A8761C')];
    let n = 0;
    for (let y = 0; y < g.height; y++)
      for (let x = 0; x < g.width; x++) {
        const i = g.idx(x, y);
        const score = this.fsMap[i];
        if (!g.isFree(x, y)) continue;
        const r = [0.06, 0.13, 0.19, 0.26][score]; // điểm 0: chấm xám nhỏ để vẫn thấy lưới chỗ trống
        m.makeScale(r, 1, r).setPosition(x + 0.5, 0.06, y + 0.5);
        this.fsDots.setMatrixAt(n, m);
        this.fsDots.setColorAt(n, colors[score]);
        n++;
      }
    this.fsDots.count = n;
    this.fsDots.instanceMatrix.needsUpdate = true;
    if (this.fsDots.instanceColor) this.fsDots.instanceColor.needsUpdate = true;
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
    // cho lùi quá rìa sau vài ô để ngắm phông núi
    this.target.x = THREE.MathUtils.clamp(this.target.x, -5, g.width);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -5, g.height);
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
      if (this.external) return;
      this.glide = null; // người chơi kéo thì thôi lướt
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
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (!this.external) this.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
  }

  private tap(px: number, py: number): void {
    const ndcX = (px / window.innerWidth) * 2 - 1;
    const ndcY = -(py / window.innerHeight) * 2 + 1;
    const t = this.tool;
    if (t.kind === 'road' || t.kind === 'demolish' || t.kind === 'zone') {
      const p = this.groundAt(ndcX, ndcY);
      const tile: [number, number] = [Math.floor(p.x), Math.floor(p.z)];
      if (!this.world.grid.inBounds(...tile)) return;
      if (t.kind === 'road') {
        if (!this.roadStart || this.roadEnd) {
          this.roadStart = tile;
          this.roadEnd = null;
        } else this.roadEnd = tile;
      } else if (t.kind === 'zone') {
        if (!this.zoneA || this.zoneB) {
          this.zoneA = tile;
          this.zoneB = null;
        } else this.zoneB = tile;
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
    if (hit) return this.onLot(null);
    const p = this.groundAt(ndcX, ndcY);
    const [x, y] = [Math.floor(p.x), Math.floor(p.z)];
    const g = this.world.grid;
    this.onLot(g.inBounds(x, y) && g.zone[g.idx(x, y)] ? [x, y] : null);
  }

  setOnLot(fn: (tile: [number, number] | null) => void): void {
    this.onLot = fn;
  }

  /**
   * Thực hành có dẫn: khoanh các ô cần chạm, đánh số 一 二 bằng triện chu sa.
   * Ô đã chạm (điểm đầu / góc thứ nhất) mờ đi; null = xóa.
   */
  setGuide(tiles: Array<[number, number]> | null): void {
    for (const o of this.guide) this.scene.remove(o);
    this.guide = [];
    if (!tiles) return;
    const numerals = ['一', '二', '三', '四'];
    tiles.forEach(([x, y], k) => {
      const grp = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.36, 0.48, 40),
        new THREE.MeshBasicMaterial({ color: PALETTE.chuSa, transparent: true, depthTest: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: sealTexture(numerals[k] ?? '・'), depthTest: false }));
      seal.scale.set(0.95, 0.95, 1);
      seal.position.y = 1.05;
      grp.add(ring, seal);
      grp.position.set(x + 0.5, 0, y + 0.5);
      grp.renderOrder = 2001;
      ring.renderOrder = seal.renderOrder = 2001;
      grp.userData.tile = [x, y];
      this.scene.add(grp);
      this.guide.push(grp);
    });
  }

  /**
   * Cảnh khác dùng chung renderer (bản đồ vùng): khi đặt, IsoScene vẫn cho đồng hồ chạy
   * nhưng nhường việc vẽ và thao tác cho cảnh đó.
   */
  setExternal(view: { frame(dt: number): void } | null): void {
    this.external = view;
    this.onLot(null);
    this.onSelect(null);
  }

  private frame(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.world.update(dt);
    if (this.external) return this.external.frame(dt);
    this.terrainMat.uniforms.uTime.value += dt;
    for (const list of this.spinners.values()) for (const s of list) s.rotation.z += dt * 0.6;
    if (this.glide) {
      this.glide.t = Math.min(1, this.glide.t + dt / 0.7);
      const k = 1 - Math.pow(1 - this.glide.t, 3); // chậm dần
      this.target.lerpVectors(this.glide.from, this.glide.to, k);
      this.placeCamera();
      if (this.glide.t >= 1) this.glide = null;
    }
    if (this.guide.length) {
      this.guideClock += dt;
      // ô đầu tiên đã chạm (đầu đường / góc vùng) thì mờ đi, nhấp nháy ô kế tiếp
      const [a, b] = this.tool.kind === 'road' ? [this.roadStart, this.roadEnd] : this.tool.kind === 'zone' ? [this.zoneA, this.zoneB] : [null, null];
      const next = a && b ? -1 : a ? 1 : 0;
      this.guide.forEach((g, k) => {
        const active = k === next;
        g.scale.setScalar(active ? 1 + 0.15 * Math.sin(this.guideClock * 6) : 0.85);
        g.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (m) m.opacity = active ? 1 : 0.45;
        });
      });
    }
    if (this.focusRing?.visible) {
      const u = this.focusRing.userData as { size: number; life: number };
      u.life -= dt;
      const pulse = 1 + 0.12 * Math.sin(u.life * 6);
      this.focusRing.scale.setScalar(u.size * 1.5 * pulse);
      (this.focusRing.material as THREE.MeshBasicMaterial).opacity = Math.min(1, u.life) * 0.9;
      if (u.life <= 0) this.focusRing.visible = false;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

/** Sắc loang mặt ô theo vùng: Cư thanh lục, Thị đằng hoàng, Điền thạch thanh (đều rất nhạt). */
const ZONE_TINT: Record<number, THREE.Color> = {
  1: new THREE.Color('#D3E2D2'),
  2: new THREE.Color('#F0DDB2'),
  3: new THREE.Color('#C9D9E2'),
};
const ZONE_MARK: Record<ZoneType, string> = { cu: PALETTE.thanhLuc, thi: PALETTE.dangHoang, dien: PALETTE.thachThanh };

/** Hướng từ tâm nhìn tới camera (vector đơn vị). */
export function viewDirection(): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(ELEVATION) * Math.sin(AZIMUTH), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(AZIMUTH));
}

