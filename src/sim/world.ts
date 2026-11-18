import { BUILD_COST, BASE_POPULATION, HOUSING, INCOME_BASE, INCOME_PER_POWERED, REFUND_RATE, ROAD_COST } from './economy';
import { Grid, Terrain, type BuildingType, type GridSave } from './grid';
import { computeLinhKhi, POWERED_THRESHOLD, type LinhKhiResult } from './linhKhi';
import { TietKhiClock, type SpeedIndex } from './time';

export type ActionFail = 'blocked' | 'funds' | 'nothing';
export type ActionResult = { ok: true; cost: number } | { ok: false; reason: ActionFail; cost: number };

export const SAVE_VERSION = 1;
export interface WorldSave {
  v: number;
  elapsed: number;
  speed: SpeedIndex;
  linhThach: number;
  grid: GridSave;
}

/** Trạng thái thế giới + luật chơi. Logic thuần (GDD 3.3), sau này chạy trong Web Worker. */
export class World {
  readonly grid: Grid;
  readonly clock: TietKhiClock;
  linhKhi: LinhKhiResult;
  linhThach: number;
  population = 0;
  /** Tăng mỗi khi lưới thay đổi, để phần vẽ biết cần dựng lại. */
  revision = 0;
  private listeners = new Set<() => void>();

  constructor(grid: Grid, linhThach = 500, clock = new TietKhiClock()) {
    this.grid = grid;
    this.linhThach = linhThach;
    this.clock = clock;
    this.linhKhi = computeLinhKhi(grid);
    this.population = this.computePopulation();
  }

  // ---------- thời gian ----------

  /** Gọi mỗi khung hình với thời gian thực đã trôi (giây). */
  update(realSeconds: number): void {
    const changed = this.clock.advance(realSeconds);
    for (let i = 0; i < changed; i++) this.onNewTerm();
  }

  private onNewTerm(): void {
    const powered = [...this.linhKhi.building.values()].filter((v) => v >= POWERED_THRESHOLD).length;
    this.linhThach += INCOME_BASE + powered * INCOME_PER_POWERED;
    this.emit();
  }

  // ---------- hành động của người chơi ----------

  previewBuild(type: BuildingType, x: number, y: number): ActionResult {
    const cost = BUILD_COST[type];
    if (!this.grid.canPlace(type, x, y)) return { ok: false, reason: 'blocked', cost };
    if (this.linhThach < cost) return { ok: false, reason: 'funds', cost };
    return { ok: true, cost };
  }

  build(type: BuildingType, x: number, y: number): ActionResult {
    const r = this.previewBuild(type, x, y);
    if (!r.ok) return r;
    this.grid.place(type, x, y);
    this.linhThach -= r.cost;
    this.changed();
    return r;
  }

  /** Chỉ tính tiền những ô chưa có đường; ô không làm đường được thì chặn cả tuyến. */
  previewRoad(path: Array<[number, number]>): ActionResult & { newTiles: number } {
    let newTiles = 0;
    for (const [x, y] of path) {
      if (!this.grid.canRoad(x, y)) return { ok: false, reason: 'blocked', cost: 0, newTiles: 0 };
      if (!this.grid.road[this.grid.idx(x, y)]) newTiles++;
    }
    const cost = newTiles * ROAD_COST;
    if (newTiles === 0) return { ok: false, reason: 'nothing', cost, newTiles };
    if (this.linhThach < cost) return { ok: false, reason: 'funds', cost, newTiles };
    return { ok: true, cost, newTiles };
  }

  buildRoad(path: Array<[number, number]>): ActionResult {
    const r = this.previewRoad(path);
    if (!r.ok) return r;
    for (const [x, y] of path) this.grid.setRoad(x, y);
    this.linhThach -= r.cost;
    this.changed();
    return r;
  }

  /** Phá công trình hoặc đường ở ô (x, y); hoàn lại một phần giá. Trả về số linh thạch hoàn (âm = không có gì). */
  demolishAt(x: number, y: number): ActionResult {
    const b = this.grid.buildingAt(x, y);
    if (b) {
      this.grid.removeBuilding(b.id);
      const refund = Math.floor(BUILD_COST[b.type] * REFUND_RATE);
      this.linhThach += refund;
      this.changed();
      return { ok: true, cost: -refund };
    }
    if (this.grid.clearRoad(x, y)) {
      const refund = Math.floor(ROAD_COST * REFUND_RATE);
      this.linhThach += refund;
      this.changed();
      return { ok: true, cost: -refund };
    }
    return { ok: false, reason: 'nothing', cost: 0 };
  }

  // ---------- lưu / khôi phục ----------

  toSave(): WorldSave {
    return { v: SAVE_VERSION, elapsed: this.clock.elapsed, speed: this.clock.speed, linhThach: this.linhThach, grid: this.grid.toJSON() };
  }

  static fromSave(s: WorldSave): World {
    if (s.v !== SAVE_VERSION) throw new Error(`save version ${s.v} not supported`);
    const clock = new TietKhiClock(s.elapsed);
    clock.speed = s.speed;
    return new World(Grid.fromJSON(s.grid), s.linhThach, clock);
  }

  // ---------- nội bộ ----------

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private computePopulation(): number {
    let p = BASE_POPULATION;
    for (const b of this.grid.buildings) p += HOUSING[b.type] ?? 0;
    return p;
  }

  private changed(): void {
    this.revision++;
    this.linhKhi = computeLinhKhi(this.grid);
    this.population = this.computePopulation();
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

/** Bản đồ khởi đầu 24×24 cho cấp Động Phủ. */
export function createDemoWorld(): World {
  const g = new Grid(24, 24);
  // Núi đá phía sau (Huyền Vũ), suối phía trước (Chu Tước).
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const i = g.idx(x, y);
      if (y < 2 || (y < 4 && (x * 7 + y * 3) % 5 === 0)) g.terrain[i] = Terrain.Rock;
      if (x === 18 || (x === 19 && y % 3 !== 0)) g.terrain[i] = Terrain.Water;
    }
  }
  // Hai mắt linh mạch: một đã có trận, một để người chơi tìm bằng Thiên Nhãn.
  g.vein[g.idx(9, 10)] = 1;
  g.vein[g.idx(10, 10)] = 1;
  g.vein[g.idx(5, 18)] = 1;
  g.vein[g.idx(6, 18)] = 1;

  for (let x = 3; x <= 21; x++) g.setRoad(x, 12);
  for (let y = 5; y <= 20; y++) g.setRoad(11, y);

  g.place('tuLinhTran', 9, 10); // trên mắt linh mạch, kề hai linh lộ
  g.place('chinhDien', 8, 5);
  g.place('tinhXa', 12, 9);
  g.place('tinhXa', 13, 13);
  g.place('duocVien', 6, 13);
  g.place('tinhXa', 3, 17); // không nối linh lộ → thiếu linh khí, để thử Thiên Nhãn
  return new World(g);
}
