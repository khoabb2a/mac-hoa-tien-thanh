import { Grid, Terrain } from './grid';

/**
 * Bản đồ vùng (docs/THIET-KE-BAN-DO-VUNG.md, đặc tả mốc 1): địa hình ngoài Động Phủ,
 * nơi Đạo Đội hành quân và khai thác. Logic thuần, có test.
 */

/** Loại tài nguyên thu trên bản đồ. Mốc 1 chỉ dùng linhThach; các loại khác để sẵn cho bản lưu. */
export type ResourceKind = 'linhThach' | 'linhThao' | 'linhMoc' | 'linhKhoang';

export interface ResourceNode {
  id: number;
  x: number;
  y: number;
  kind: ResourceKind;
  /** Trữ lượng còn lại; 0 = đã cạn (không vẽ, không cử đội tới được). */
  amount: number;
}

export interface RegionSave {
  nodes: Array<{ id: number; amount: number }>;
}

/** Tọa độ trong đơn vị ô; số nguyên = ô, số lẻ = đang đi giữa hai ô. */
export type Pt = [number, number];

export const REGION_SIZE = 40;

export class Region {
  readonly grid: Grid;
  /** Động Phủ chiếm khối ô này; đội ra vào qua `gate`. */
  readonly home = { x: 5, y: 29, w: 3, h: 3 };
  readonly gate: Pt = [8, 30];
  readonly nodes: ResourceNode[];

  constructor(grid: Grid, nodes: ResourceNode[]) {
    this.grid = grid;
    this.nodes = nodes;
  }

  node(id: number): ResourceNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  isHome(x: number, y: number): boolean {
    const h = this.home;
    return x >= h.x && y >= h.y && x < h.x + h.w && y < h.y + h.h;
  }

  /** Ô đi được: trong biên, không phải núi đá, suối hay khối Động Phủ. */
  passable(x: number, y: number): boolean {
    if (!this.grid.inBounds(x, y) || this.isHome(x, y)) return false;
    const t = this.grid.terrain[this.grid.idx(x, y)];
    return t === Terrain.Grass;
  }

  toSave(): RegionSave {
    return { nodes: this.nodes.map((n) => ({ id: n.id, amount: n.amount })) };
  }

  /** Áp trữ lượng từ bản lưu (bố cục bản đồ luôn dựng lại từ createRegion). */
  loadFrom(s: RegionSave | undefined): void {
    if (!s) return;
    for (const { id, amount } of s.nodes) {
      const n = this.node(id);
      if (n) n.amount = amount;
    }
  }

  /**
   * Đường đi 8 hướng (A*) giữa hai ô đi được; đi chéo không được cắt góc núi/suối.
   * Trả về các ô từ `from` tới `to` (gồm cả hai đầu), hoặc null nếu không có đường.
   */
  findPath(from: Pt, to: Pt): Pt[] | null {
    const g = this.grid;
    const [fx, fy] = from;
    const [tx, ty] = to;
    if (!this.passable(fx, fy) || !this.passable(tx, ty)) return null;
    const n = g.width * g.height;
    const gScore = new Float64Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const start = g.idx(fx, fy);
    const goal = g.idx(tx, ty);
    gScore[start] = 0;
    const h = (x: number, y: number) => {
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); // octile
    };
    // hàng đợi ưu tiên nhỏ gọn (bản đồ 40×40 nên mảng + quét là đủ nhanh)
    const open: number[] = [start];
    const f = new Float64Array(n).fill(Infinity);
    f[start] = h(fx, fy);
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % g.width, cy = (cur - cx) / g.width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!this.passable(nx, ny)) continue;
          if (dx && dy && (!this.passable(cx + dx, cy) || !this.passable(cx, cy + dy))) continue; // không cắt góc
          const ni = g.idx(nx, ny);
          if (closed[ni]) continue;
          const cand = gScore[cur] + (dx && dy ? Math.SQRT2 : 1);
          if (cand < gScore[ni]) {
            gScore[ni] = cand;
            came[ni] = cur;
            f[ni] = cand + h(nx, ny);
            open.push(ni);
          }
        }
    }
    if (start !== goal && came[goal] === -1) return null;
    const out: Pt[] = [];
    for (let c = goal; c !== -1; c = c === start ? -1 : came[c]) out.push([c % g.width, Math.floor(c / g.width)]);
    return out.reverse();
  }
}

/** Độ dài đường gấp khúc (đơn vị ô). */
export function pathLength(pts: Pt[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Bản đồ vùng đầu tiên (40×40), dựng cố định để ai chơi cũng cùng địa thế:
 *  - Núi phía sau (hàng y < 3) làm phông.
 *  - Dãy núi dọc x = 18–19 chia đôi vùng, chỉ có **khe núi** hẹp ở y = 24–25.
 *  - Suối ngang y = 14–15 phía tây dãy núi, có **chỗ cạn** ở x = 9–10.
 *  - Động Phủ góc tây nam; bốn mỏ linh thạch xa gần khác nhau.
 */
export function createRegion(): Region {
  const n = REGION_SIZE;
  const g = new Grid(n, n);
  const set = (x: number, y: number, t: Terrain) => g.inBounds(x, y) && (g.terrain[g.idx(x, y)] = t);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (y < 3 || (y < 5 && hash(x, y) < 0.35)) set(x, y, Terrain.Rock);
      // đá lẻ rải rác cho có địa thế, tránh vùng quanh Động Phủ
      else if (hash(x + 101, y + 37) < 0.035 && !(x < 12 && y > 25)) set(x, y, Terrain.Rock);
    }
  // dãy núi giữa, khe núi ở y 24–25
  for (let y = 3; y < n; y++) if (y !== 24 && y !== 25) for (const x of [18, 19]) set(x, y, Terrain.Rock);
  // suối phía tây, chỗ cạn x 9–10
  for (let x = 0; x < 18; x++) if (x !== 9 && x !== 10) for (const y of [14, 15]) set(x, y, Terrain.Water);
  // hồ nhỏ phía đông
  for (let y = 30; y < 34; y++) for (let x = 25; x < 29; x++) set(x, y, Terrain.Water);
  // mắt linh mạch (mốc 2: điểm tiếp tế)
  for (const [x, y] of [[13, 21], [30, 12]]) g.vein[g.idx(x, y)] = 1;

  const nodes: ResourceNode[] = [
    { id: 1, x: 13, y: 27, kind: 'linhThach', amount: 600 }, // gần nhà
    { id: 2, x: 7, y: 8, kind: 'linhThach', amount: 1200 }, // qua chỗ cạn của suối
    { id: 3, x: 26, y: 22, kind: 'linhThach', amount: 1500 }, // qua khe núi
    { id: 4, x: 33, y: 36, kind: 'linhThach', amount: 2500 }, // xa nhất, sau hồ
  ];
  for (const nd of nodes) set(nd.x, nd.y, Terrain.Grass);
  // chừa đất trống quanh Động Phủ và cổng
  const r = new Region(g, nodes);
  for (let y = r.home.y - 1; y <= r.home.y + r.home.h; y++)
    for (let x = r.home.x - 1; x <= r.home.x + r.home.w + 1; x++) set(x, y, Terrain.Grass);
  return r;
}
