import * as THREE from 'three';
import type { Grid } from '../sim/grid';
import { ZONE_OF, type ZoneType } from '../sim/zones';
import { curvedRoof } from './blockout/roof';
import { inkMaterial, withInkEdges } from './inkMaterial';
import { PALETTE } from './palette';
import { loadSpriteTexture } from './sprites';

/**
 * Nhà phàm trần tự mọc (GDD 5.1): mỗi ô có vùng và cấp ≥ 1 hiện một ngôi nhà.
 * Có sheet họa bản (public/sprites/houses/<vùng>.json, hàng = cấp, cột = biến thể) thì dùng sprite;
 * chưa có thì dựng khối thô bằng code. Chỉ dựng lại ô đổi vùng/cấp.
 */
interface HouseSheet {
  image: string;
  width: number;
  height: number;
  maxHPx: number;
  maxWPx: number;
  variants: Array<{ cell: number; x: number; y: number; wPx: number; hPx: number; ax: number; ay: number }>;
}

/** Bề ngang (không gian camera) của nhà rộng nhất trong sheet ≈ bề ngang hình thoi một ô (√2 ≈ 1.41). */
const TILE_SCREEN_W = 1.36;

const sheets = new Map<ZoneType, HouseSheet>();

export async function loadHouseSheets(): Promise<boolean> {
  const res = await Promise.all(
    (['cu', 'thi', 'dien'] as ZoneType[]).map(async (z) => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}sprites/houses/${z}.json`);
        if (!r.ok || !r.headers.get('content-type')?.includes('json')) return false;
        sheets.set(z, (await r.json()) as HouseSheet);
        return true;
      } catch {
        return false;
      }
    }),
  );
  return res.some(Boolean);
}

function hash(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- khối thô ----------

const mats = {
  wall: inkMaterial('#F3ECDC', PALETTE.inkDam),
  thatch: inkMaterial('#A89676', '#6E5F48'),
  tile: inkMaterial(PALETTE.inkTrong, PALETTE.inkNung),
  wood: inkMaterial('#9C7A55', '#5E4630'),
  stone: inkMaterial(PALETTE.paperDeep, PALETTE.inkDam),
  red: inkMaterial(PALETTE.chuSa, '#7A2019'),
  field: inkMaterial(PALETTE.thanhLuc, PALETTE.thanhLucDeep),
  soil: inkMaterial('#B8A78A', '#7D6E57'),
  gold: inkMaterial(PALETTE.dangHoang, '#7C6229'),
};

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, edges = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return edges ? withInkEdges(m) : m;
}

/** Nhà dựng sẵn theo (vùng, cấp); gốc ở góc ô, chiếm 1×1. Dùng clone() để chia sẻ hình học. */
const templates = new Map<string, THREE.Group>();

function template(zone: ZoneType, level: number): THREE.Group {
  const key = `${zone}${level}`;
  const hit = templates.get(key);
  if (hit) return hit;
  const g = new THREE.Group();
  const c = 0.5;
  if (zone === 'cu') {
    const roof = level === 1 ? mats.thatch : mats.tile;
    const w = [0, 0.5, 0.62, 0.66][level], d = [0, 0.42, 0.5, 0.54][level], h = [0, 0.3, 0.38, 0.36][level];
    g.add(mesh(new THREE.BoxGeometry(w + 0.12, 0.06, d + 0.12), mats.stone, c, 0.03, c));
    g.add(mesh(new THREE.BoxGeometry(w, h, d), mats.wall, c, 0.06 + h / 2, c));
    g.add(mesh(curvedRoof(w / 2 + 0.1, d / 2 + 0.09, 0.22, level === 1 ? 0.05 : 0.22), roof, c, 0.06 + h, c));
    if (level === 3) {
      g.add(mesh(new THREE.BoxGeometry(w * 0.66, 0.24, d * 0.62), mats.wall, c, 0.06 + h + 0.2, c));
      g.add(mesh(curvedRoof(w * 0.4, d * 0.38, 0.18), mats.tile, c, 0.06 + h + 0.32, c));
    }
  } else if (zone === 'thi') {
    const w = [0, 0.5, 0.66, 0.66][level], d = [0, 0.4, 0.52, 0.54][level], h = [0, 0.26, 0.34, 0.34][level];
    g.add(mesh(new THREE.BoxGeometry(w, h, d), level === 1 ? mats.wood : mats.wall, c, h / 2, c));
    g.add(mesh(curvedRoof(w / 2 + 0.08, d / 2 + 0.08, 0.18), mats.tile, c, h, c));
    g.add(mesh(new THREE.BoxGeometry(w * 0.9, 0.03, 0.18), mats.red, c, h * 0.75, c + d / 2 + 0.08)); // mái hiên vải
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), mats.wood, c - w / 2 - 0.04, 0.27, c + d / 2, false));
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.18, 0.1), mats.red, c - w / 2 - 0.04, 0.45, c + d / 2 + 0.06, false)); // cờ hiệu
    if (level === 3) {
      g.add(mesh(new THREE.BoxGeometry(w * 0.7, 0.24, d * 0.65), mats.wall, c, h + 0.2, c));
      g.add(mesh(curvedRoof(w * 0.42, d * 0.4, 0.16), mats.tile, c, h + 0.32, c));
      g.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), mats.red, c + w / 2, h + 0.05, c + d / 2, false)); // đèn lồng
    }
  } else {
    const rows = [0, 3, 4, 5][level];
    for (let k = 0; k < rows; k++) {
      const z = 0.12 + (k * 0.76) / Math.max(rows - 1, 1);
      g.add(mesh(new THREE.BoxGeometry(0.86, 0.04, 0.1), mats.soil, c, 0.02, z, false));
      g.add(mesh(new THREE.BoxGeometry(0.8, 0.07, 0.06), mats.field, c, 0.07, z, false));
    }
    if (level >= 2) {
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.16, 0.2), mats.wood, 0.82, 0.08, 0.18));
      g.add(mesh(curvedRoof(0.15, 0.13, 0.1, 0.05), mats.thatch, 0.82, 0.16, 0.18));
    }
    if (level === 3) {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.26, 10), mats.wood, 0.2, 0.13, 0.82));
      g.add(mesh(new THREE.ConeGeometry(0.15, 0.14, 10), mats.thatch, 0.2, 0.33, 0.82));
    }
  }
  templates.set(key, g);
  return g;
}

// ---------- lớp nhà ----------

export class HouseLayer {
  private items = new Map<number, { key: string; obj: THREE.Object3D }>();

  constructor(private readonly scene: THREE.Scene) {}

  /** Đồng bộ với lưới: thêm/bớt/đổi nhà ở những ô thay đổi. */
  update(grid: Grid): void {
    const seen = new Set<number>();
    for (let i = 0; i < grid.zone.length; i++) {
      const zone = ZONE_OF[grid.zone[i]];
      const level = grid.level[i];
      if (!zone || level === 0) continue;
      seen.add(i);
      const x = i % grid.width, y = Math.floor(i / grid.width);
      const key = `${zone}${level}${sheets.has(zone) ? 's' : 'b'}`;
      const cur = this.items.get(i);
      if (cur?.key === key) continue;
      if (cur) this.remove(i);
      const obj = sheets.has(zone) ? this.sprite(zone, level, x, y) : this.blockout(zone, level, x, y);
      this.scene.add(obj);
      this.items.set(i, { key, obj });
    }
    for (const i of [...this.items.keys()]) if (!seen.has(i)) this.remove(i);
  }

  /** Bỏ hết để dựng lại (vd. khi vừa tải xong sheet họa bản). */
  reset(): void {
    for (const i of [...this.items.keys()]) this.remove(i);
  }

  private remove(i: number): void {
    const it = this.items.get(i);
    if (!it) return;
    this.scene.remove(it.obj);
    if (it.obj instanceof THREE.Sprite) {
      it.obj.material.map?.dispose();
      it.obj.material.dispose();
    }
    this.items.delete(i);
  }

  private blockout(zone: ZoneType, level: number, x: number, y: number): THREE.Object3D {
    // biến thể rẻ: lật gương và co giãn nhẹ quanh tâm ô để dãy nhà không giống hệt nhau
    const inner = template(zone, level).clone();
    inner.position.set(-0.5, 0, -0.5);
    const g = new THREE.Group();
    g.add(inner);
    const s = 0.92 + 0.14 * hash(x, y, 12);
    g.scale.set(hash(x, y, 11) < 0.5 ? -s : s, s, s);
    g.position.set(x + 0.5, 0, y + 0.5);
    return g;
  }

  private sprite(zone: ZoneType, level: number, x: number, y: number): THREE.Object3D {
    const sheet = sheets.get(zone)!;
    const col = Math.floor(hash(x, y, 13) * 3) % 3;
    const cell = (level - 1) * 3 + col;
    const v = sheet.variants.find((q) => q.cell === cell) ?? sheet.variants[0];
    const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false });
    const sp = new THREE.Sprite(mat);
    const aspect = v.hPx / v.wPx;
    // Nhà rộng nhất phủ kín bề ngang ô; nhà nhỏ (cấp 1) nhỏ theo đúng tỉ lệ trong sheet.
    const k = v.wPx / sheet.maxWPx;
    const w = TILE_SCREEN_W * k;
    const flip = hash(x, y, 14) < 0.5 ? -1 : 1;
    sp.scale.set(w * flip, w * aspect, 1);
    sp.center.set(v.ax, v.ay);
    // Đáy ảnh = góc trước của nền nhà: nhà phủ kín ô thì neo ở góc trước ô, nhà nhỏ lùi dần về tâm ô.
    sp.position.set(x + 0.5 + 0.5 * k, 0, y + 0.5 + 0.5 * k);
    sp.renderOrder = 100 + x + 1 + y + 1;
    sp.visible = false;
    loadSpriteTexture(sheet.image, (base) => {
      const tex = base.clone();
      tex.offset.set(v.x / sheet.width, 1 - (v.y + v.hPx) / sheet.height);
      tex.repeat.set(v.wPx / sheet.width, v.hPx / sheet.height);
      tex.needsUpdate = true;
      mat.map = tex;
      mat.needsUpdate = true;
      sp.visible = true;
    });
    return sp;
  }
}
