import * as THREE from 'three';
import { isOut, remainingPath, stateAt } from '../sim/expedition';
import { Grid, Terrain } from '../sim/grid';
import type { Pt } from '../sim/region';
import type { World } from '../sim/world';
import { buildBlockout } from './blockout/buildings';
import { PALETTE } from './palette';
import { AZIMUTH, ELEVATION, MAX_VIEW, MIN_VIEW, viewDirection } from './scene';
import { sealTexture } from './seal';
import { fitSpriteToBlockout, loadSpriteTexture, SPRITE_URL } from './sprites';
import { decorFor, loadDecorSheets, makeBackdrop, makeDecorSprite } from './terrainArt';
import { LAYER, terrainMaterial } from './terrainMaterial';

/** Thứ người chơi chạm vào trên bản đồ vùng. */
export type RegionPick = { k: 'squad'; id: number } | { k: 'node'; id: number } | { k: 'home' } | null;

const SQUAD_GLYPH = ['甲', '乙', '丙', '丁'];

/**
 * Cảnh bản đồ vùng (mốc 1). Dùng chung renderer với Động Phủ (IsoScene.setExternal),
 * chỉ đọc World: địa hình, mỏ, Động Phủ, Đạo Đội vẽ theo lịch trình, đường đi nét liền / xem trước nét đứt.
 */
export class RegionScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private target = new THREE.Vector3();
  private viewHeight = 30;
  private readonly viewQuat: THREE.Quaternion;
  private nodeObjs = new Map<number, THREE.Object3D[]>();
  private squadObjs = new Map<number, { seal: THREE.Sprite; ring: THREE.Mesh }>();
  private lines: THREE.Mesh[] = [];
  private previewLine: THREE.Mesh | null = null;
  private lineClock = 0;
  private selected: number | null = null;
  private onPick: (p: RegionPick) => void = () => {};
  active = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    canvas: HTMLCanvasElement,
    private readonly world: World,
  ) {
    const probe = new THREE.OrthographicCamera();
    probe.position.copy(viewDirection());
    probe.lookAt(0, 0, 0);
    this.viewQuat = probe.quaternion.clone();
    this.scene.fog = new THREE.Fog(PALETTE.paper, 62, 105);
    const r = world.region;
    this.target.set(r.home.x + 8, 0, r.home.y - 5);

    this.buildTerrain();
    this.scene.add(makeBackdrop(r.grid, viewDirection()));
    void loadDecorSheets().then(() => this.buildDecor());
    this.buildHome();
    this.buildNodes();
    this.bindInput(canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setOnPick(fn: (p: RegionPick) => void): void {
    this.onPick = fn;
  }

  setSelected(id: number | null): void {
    this.selected = id;
  }

  /** Đường xem trước (nét đứt) khi chọn mỏ cho đội đang chọn; null = bỏ. */
  setPreview(pts: Pt[] | null): void {
    if (this.previewLine) this.scene.remove(this.previewLine);
    this.previewLine = pts && pts.length > 1 ? ribbon(pts, 0.13, 0.45, PALETTE.chuSa, 0.85) : null;
    if (this.previewLine) this.scene.add(this.previewLine);
  }

  /** Lướt camera tới ô. */
  focus(x: number, y: number): void {
    this.target.set(x + 0.5, 0, y + 0.5);
    this.placeCamera();
  }

  tileToScreen(x: number, y: number): [number, number] {
    const v = new THREE.Vector3(x + 0.5, 0, y + 0.5).project(this.camera);
    return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
  }

  frame(dt: number): void {
    const t = this.world.clock.elapsed;
    const r = this.world.region;
    for (const n of r.nodes) for (const o of this.nodeObjs.get(n.id) ?? []) o.visible = n.amount > 0;
    for (const sq of this.world.squads) {
      let o = this.squadObjs.get(sq.id);
      if (!o) o = this.addSquad(sq.id);
      const st = stateAt(sq, r, t);
      const out = isOut(sq);
      o.seal.position.set(st.pos[0] + 0.5, 1.1, st.pos[1] + 0.5);
      // ở nhà: xếp các triện cạnh cổng cho khỏi chồng nhau
      if (!out) o.seal.position.x += (sq.id - 1) * 1.1 - 0.55;
      o.ring.position.set(o.seal.position.x, 0.05, o.seal.position.z);
      const sel = sq.id === this.selected;
      o.seal.scale.setScalar(sel ? 1.2 : 0.95);
      o.ring.visible = sel;
      o.seal.renderOrder = 3000 + Math.round(st.pos[0] + st.pos[1]);
    }
    this.lineClock -= dt;
    if (this.lineClock <= 0) {
      this.lineClock = 0.2;
      for (const l of this.lines) this.scene.remove(l);
      this.lines = [];
      for (const sq of this.world.squads) {
        if (!isOut(sq)) continue;
        const pts = remainingPath(sq, r, t);
        if (pts.length < 2) continue;
        const l = ribbon(pts, sq.id === this.selected ? 0.13 : 0.09, 0, sq.id === this.selected ? PALETTE.thanhLucDeep : PALETTE.inkTrong, 0.8);
        this.lines.push(l);
        this.scene.add(l);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- dựng cảnh ----------

  private buildTerrain(): void {
    const g = this.world.region.grid;
    const n = g.width * g.height;
    const geo = new THREE.BoxGeometry(1, 0.12, 1);
    const tint = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const layer = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    geo.setAttribute('aTint', tint);
    geo.setAttribute('aLayer', layer);
    const tiles = new THREE.InstancedMesh(geo, terrainMaterial(), n);
    tiles.frustumCulled = false;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const r = this.world.region;
    for (let y = 0; y < g.height; y++)
      for (let x = 0; x < g.width; x++) {
        const i = g.idx(x, y);
        const t = g.terrain[i];
        m.makeTranslation(x + 0.5, (t === Terrain.Water ? -0.08 : 0) - 0.06, y + 0.5);
        tiles.setMatrixAt(i, m);
        if (t === Terrain.Water) c.set('#C8DAE0');
        else if (t === Terrain.Rock) c.set('#C4BFB5');
        else if (r.isHome(x, y)) c.set('#E8DCC4');
        else c.setRGB(1, 1, 1).multiplyScalar(0.97 + 0.03 * (((i * 37) % 11) / 10));
        tint.setXYZ(i, c.r, c.g, c.b);
        layer.setX(i, t === Terrain.Water ? LAYER.water : LAYER.ground);
      }
    this.scene.add(tiles);
  }

  /** Cây, đá, vách: dùng lại luật trang trí của Động Phủ trên bản sao lưới (chừa mỏ, Động Phủ, cổng). */
  private buildDecor(): void {
    const src = this.world.region.grid;
    const g = new Grid(src.width, src.height);
    g.terrain.set(src.terrain);
    const r = this.world.region;
    const keep = (x: number, y: number) => g.inBounds(x, y) && (g.occupant[g.idx(x, y)] = -2);
    for (const n of r.nodes) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) keep(n.x + dx, n.y + dy);
    for (let y = r.home.y - 1; y <= r.home.y + r.home.h; y++) for (let x = r.home.x - 1; x <= r.home.x + r.home.w + 1; x++) keep(x, y);
    for (const item of decorFor(g)) this.scene.add(makeDecorSprite(item));
  }

  private buildHome(): void {
    const h = this.world.region.home;
    const url = SPRITE_URL.chinhDien;
    if (!url) return;
    const group = buildBlockout('chinhDien');
    group.position.set(h.x, 0, h.y);
    const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 100 + h.x + h.w + h.y + h.h;
    sprite.visible = false;
    this.scene.add(sprite);
    mat.map = loadSpriteTexture(url, (tex) => {
      const img = tex.image as { width: number; height: number };
      fitSpriteToBlockout(sprite, group, this.viewQuat, img.height / img.width);
      mat.needsUpdate = true;
      sprite.visible = true;
    });
    const flag = new THREE.Sprite(new THREE.SpriteMaterial({ map: sealTexture('府', PALETTE.inkNung), depthTest: false }));
    flag.scale.setScalar(0.7);
    flag.position.set(h.x + h.w / 2, 3.2, h.y + h.h / 2);
    flag.renderOrder = 2500;
    this.scene.add(flag);
  }

  private buildNodes(): void {
    for (const n of this.world.region.nodes) {
      // nhóm bọc sprite để ẩn khi mỏ cạn mà không đè cờ "đã tải ảnh" của makeDecorSprite
      const rock = new THREE.Group();
      rock.add(makeDecorSprite({ kind: 'ky_thach', x: n.x, y: n.y }));
      const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: sealTexture('石'), depthTest: false }));
      seal.scale.setScalar(0.95);
      seal.position.set(n.x + 0.5, 1.7, n.y + 0.5);
      seal.renderOrder = 2400;
      this.scene.add(rock, seal);
      this.nodeObjs.set(n.id, [rock, seal]);
    }
  }

  private addSquad(id: number): { seal: THREE.Sprite; ring: THREE.Mesh } {
    const seal = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sealTexture(SQUAD_GLYPH[(id - 1) % SQUAD_GLYPH.length], PALETTE.thanhLucDeep), depthTest: false }),
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.52, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: PALETTE.thanhLucDeep, transparent: true, opacity: 0.9, depthTest: false }),
    );
    ring.renderOrder = 2001;
    this.scene.add(seal, ring);
    const o = { seal, ring };
    this.squadObjs.set(id, o);
    return o;
  }

  // ---------- camera & thao tác (cùng cách với Động Phủ) ----------

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
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
  }

  private pan(dxPx: number, dyPx: number): void {
    const unitsPerPx = this.viewHeight / window.innerHeight;
    const right = new THREE.Vector3(Math.cos(AZIMUTH), 0, -Math.sin(AZIMUTH));
    const fwd = new THREE.Vector3(-Math.sin(AZIMUTH), 0, -Math.cos(AZIMUTH));
    this.target.addScaledVector(right, -dxPx * unitsPerPx);
    this.target.addScaledVector(fwd, (dyPx * unitsPerPx) / Math.sin(ELEVATION));
    const g = this.world.region.grid;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -5, g.width);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -5, g.height);
    this.placeCamera();
  }

  private zoom(f: number): void {
    this.viewHeight = THREE.MathUtils.clamp(this.viewHeight * f, MIN_VIEW, MAX_VIEW + 8);
    this.resize();
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p || !this.active) return;
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
      if (this.active && pts.size === 1 && moved < 8) this.tap(e.clientX, e.clientY);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => this.active && this.zoom(e.deltaY > 0 ? 1.1 : 0.9), { passive: true });
  }

  /** Chạm: ưu tiên Đạo Đội (theo khoảng cách trên màn hình), rồi mỏ, rồi Động Phủ. */
  private tap(px: number, py: number): void {
    const r = this.world.region;
    const near = (wx: number, wy: number, lift: number) => {
      const v = new THREE.Vector3(wx + 0.5, lift, wy + 0.5).project(this.camera);
      const sx = ((v.x + 1) / 2) * window.innerWidth, sy = ((1 - v.y) / 2) * window.innerHeight;
      return Math.hypot(sx - px, sy - py);
    };
    let best: RegionPick = null;
    let bestD = 34;
    for (const sq of this.world.squads) {
      const o = this.squadObjs.get(sq.id);
      if (!o) continue;
      const p = o.seal.position;
      const d = near(p.x - 0.5, p.z - 0.5, p.y);
      if (d < bestD) (bestD = d), (best = { k: 'squad', id: sq.id });
    }
    if (!best) {
      bestD = 40;
      for (const n of r.nodes) {
        if (n.amount <= 0) continue;
        const d = Math.min(near(n.x, n.y, 0.4), near(n.x, n.y, 1.7));
        if (d < bestD) (bestD = d), (best = { k: 'node', id: n.id });
      }
    }
    if (!best) {
      const h = r.home;
      if (near(h.x + 1, h.y + 1, 1) < 60) best = { k: 'home' };
    }
    this.onPick(best);
  }
}

/**
 * Dải phẳng trên mặt đất dọc đường gấp khúc (nét WebGL 1 px quá mảnh trên điện thoại).
 * dash > 0: nét đứt, mỗi đoạn dài `dash` ô, cách `dash * 0.7`.
 */
function ribbon(pts: Pt[], width: number, dash: number, color: string, opacity: number): THREE.Mesh {
  const pos: number[] = [];
  const quad = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * (width / 2), ny = ((bx - ax) / len) * (width / 2);
    const A = [ax + nx + 0.5, ay + ny + 0.5], B = [ax - nx + 0.5, ay - ny + 0.5];
    const C = [bx - nx + 0.5, by - ny + 0.5], D = [bx + nx + 0.5, by + ny + 0.5];
    for (const [x, z] of [A, B, C, A, C, D]) pos.push(x, 0.04, z);
  };
  let on = true;
  let left = dash;
  for (let i = 1; i < pts.length; i++) {
    let [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    let segLen = Math.hypot(bx - ax, by - ay);
    if (!dash) {
      quad(ax, ay, bx, by);
      continue;
    }
    while (segLen > 0) {
      const step = Math.min(left, segLen);
      const k = step / segLen;
      const cx = ax + (bx - ax) * k, cy = ay + (by - ay) * k;
      if (on) quad(ax, ay, cx, cy);
      ax = cx;
      ay = cy;
      segLen -= step;
      left -= step;
      if (left <= 1e-6) {
        on = !on;
        left = on ? dash : dash * 0.7;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 90; // dưới cây, công trình và triện
  return mesh;
}
