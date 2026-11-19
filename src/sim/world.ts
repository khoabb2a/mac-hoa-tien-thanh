import { BUILD_COST, BASE_POPULATION, HOUSING, INCOME_BASE, INCOME_PER_POWERED, REFUND_RATE, ROAD_COST } from './economy';
import { FENG_SHUI_BONUS, fengShuiAt } from './fengShui';
import { Grid, Terrain, type BuildingType, type GridSave } from './grid';
import { computeLinhKhi, POWERED_THRESHOLD, type LinhKhiResult } from './linhKhi';
import { checkQuest } from './quests';
import { Rng } from './rng';
import { TietKhiClock, type SpeedIndex } from './time';
import { canZone, growTown, levelCap, lotStatus, TAX, townStats, ZONE_COST, ZONE_ID, type LotStatus, type TownStats, type ZoneType } from './zones';

export type ActionFail = 'blocked' | 'funds' | 'nothing';
export type ActionResult = { ok: true; cost: number } | { ok: false; reason: ActionFail; cost: number };

export const SAVE_VERSION = 2;
/** Xác suất một lô vừa quy hoạch (giáp đường, đang có nhu cầu) dựng nhà ngay. */
export const SPROUT_CHANCE = 0.4;
export interface WorldSave {
  v: number;
  elapsed: number;
  speed: SpeedIndex;
  linhThach: number;
  grid: GridSave;
  /** v2: trạng thái bộ sinh ngẫu nhiên, để nhà mọc giống nhau sau khi tải lại. */
  rng?: number;
  /** Thiên Đạo Lệnh đang làm (chỉ số trong QUESTS); thiếu = 0. */
  questIndex?: number;
}

/** Trạng thái thế giới + luật chơi. Logic thuần (GDD 3.3), sau này chạy trong Web Worker. */
export class World {
  readonly grid: Grid;
  readonly clock: TietKhiClock;
  linhKhi: LinhKhiResult;
  linhThach: number;
  population = 0;
  stats: TownStats;
  /** Thu nhập của tiết khí vừa qua (để HUD hiện). */
  lastIncome = 0;
  readonly rng: Rng;
  /** Chỉ số Thiên Đạo Lệnh hiện tại (sim/quests.ts); = QUESTS.length khi đã xong hết. */
  questIndex = 0;
  /** Bật Thiên Đạo Lệnh (ván chơi thật); World dựng tay trong test để tắt cho luật khác khỏi bị thưởng chen vào. */
  questsOn = false;
  /**
   * Bản sao thụ động trên luồng chính khi mô phỏng chạy trong Worker: chỉ cho đồng hồ trôi
   * để HUD mượt, còn mọi thay đổi thật đến từ applySave() theo ảnh chụp của Worker.
   */
  passive = false;
  /** Tăng mỗi khi lưới thay đổi, để phần vẽ biết cần dựng lại. */
  revision = 0;
  private listeners = new Set<() => void>();

  constructor(grid: Grid, linhThach = 500, clock = new TietKhiClock(), rng = new Rng()) {
    this.grid = grid;
    this.linhThach = linhThach;
    this.clock = clock;
    this.rng = rng;
    this.linhKhi = computeLinhKhi(grid);
    this.stats = townStats(grid, this.sectCount());
    this.population = this.computePopulation();
  }

  // ---------- thời gian ----------

  /** Gọi mỗi khung hình với thời gian thực đã trôi (giây). */
  update(realSeconds: number): void {
    const changed = this.clock.advance(realSeconds);
    if (this.passive) return;
    for (let i = 0; i < changed; i++) this.onNewTerm();
  }

  /** Mỗi tiết khí: phàm trần mọc/suy, rồi thu cống phẩm và sản lượng tông môn. */
  private onNewTerm(): void {
    growTown(this.grid, this.linhKhi.road, this.stats.demand, this.rng);
    this.changed(false);
    let income = INCOME_BASE;
    for (const b of this.grid.buildings) {
      if ((this.linhKhi.building.get(b.id) ?? 0) < POWERED_THRESHOLD) continue;
      income += INCOME_PER_POWERED * (1 + FENG_SHUI_BONUS * fengShuiAt(this.grid, b.x, b.y, b.w, b.h).score);
    }
    income += this.stats.residents * TAX.resident + this.stats.thiJobs * TAX.thi + this.stats.dienJobs * TAX.dien;
    this.lastIncome = Math.floor(income);
    this.linhThach += this.lastIncome;
    if (this.questsOn) checkQuest(this);
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

  /** Các ô trong hình chữ nhật (hai góc bất kỳ) có thể quy hoạch thành `type`. */
  zoneTiles(type: ZoneType, ax: number, ay: number, bx: number, by: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    const id = ZONE_ID[type];
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++)
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
        if (canZone(this.grid, x, y) && this.grid.zone[this.grid.idx(x, y)] !== id) out.push([x, y]);
    return out;
  }

  previewZone(type: ZoneType, ax: number, ay: number, bx: number, by: number): ActionResult & { tiles: number } {
    const tiles = this.zoneTiles(type, ax, ay, bx, by).length;
    const cost = tiles * ZONE_COST;
    if (tiles === 0) return { ok: false, reason: 'nothing', cost, tiles };
    if (this.linhThach < cost) return { ok: false, reason: 'funds', cost, tiles };
    return { ok: true, cost, tiles };
  }

  /**
   * Quy hoạch vùng; đổi loại vùng thì nhà cũ trên ô bị dỡ (cấp về 0).
   * Khi đang có nhu cầu, một phần lô giáp đường dựng nhà ngay (SPROUT_CHANCE) để người chơi
   * thấy tác dụng tức thì thay vì chờ hết tiết khí.
   */
  zone(type: ZoneType, ax: number, ay: number, bx: number, by: number): ActionResult {
    const r = this.previewZone(type, ax, ay, bx, by);
    if (!r.ok) return r;
    const wanted = this.stats.demand[type] > 0.05;
    for (const [x, y] of this.zoneTiles(type, ax, ay, bx, by)) {
      const i = this.grid.idx(x, y);
      this.grid.zone[i] = ZONE_ID[type];
      this.grid.level[i] = 0;
      if (wanted && levelCap(this.grid, this.linhKhi.road, x, y) >= 1 && this.rng.next() < SPROUT_CHANCE) this.grid.level[i] = 1;
    }
    this.linhThach -= r.cost;
    this.changed();
    return { ok: true, cost: r.cost };
  }

  /** Phá công trình, đường hoặc xóa vùng ở ô (x, y); hoàn lại một phần giá công trình/đường. */
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
    if (this.grid.inBounds(x, y) && this.grid.zone[this.grid.idx(x, y)]) {
      const i = this.grid.idx(x, y);
      this.grid.zone[i] = 0;
      this.grid.level[i] = 0;
      this.changed();
      return { ok: true, cost: 0 };
    }
    return { ok: false, reason: 'nothing', cost: 0 };
  }

  /** Tình trạng lô quy hoạch ở (x, y), hoặc null nếu không phải lô. */
  lotAt(x: number, y: number): LotStatus | null {
    return lotStatus(this.grid, this.linhKhi.road, this.stats.demand, x, y);
  }

  // ---------- lưu / khôi phục ----------

  toSave(): WorldSave {
    return {
      v: SAVE_VERSION,
      elapsed: this.clock.elapsed,
      speed: this.clock.speed,
      linhThach: this.linhThach,
      grid: this.grid.toJSON(),
      rng: this.rng.state,
      questIndex: this.questIndex,
    };
  }

  /** Đọc bản lưu v1 (chưa có vùng) hoặc v2. */
  static fromSave(s: WorldSave): World {
    if (s.v !== 1 && s.v !== SAVE_VERSION) throw new Error(`save version ${s.v} not supported`);
    const clock = new TietKhiClock(s.elapsed);
    clock.speed = s.speed;
    const w = new World(Grid.fromJSON(s.grid), s.linhThach, clock, new Rng(s.rng));
    w.questIndex = s.questIndex ?? 0;
    w.questsOn = true;
    return w;
  }

  /** Thay toàn bộ trạng thái bằng bản lưu (cùng kích thước bản đồ), giữ nguyên các tham chiếu. */
  applySave(s: WorldSave): void {
    this.grid.loadFrom(s.grid);
    this.clock.elapsed = s.elapsed;
    this.clock.speed = s.speed;
    this.linhThach = s.linhThach;
    if (s.rng !== undefined) this.rng.state = s.rng;
    this.questIndex = s.questIndex ?? 0;
    this.changed();
  }

  // ---------- nội bộ ----------

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private sectCount(): number {
    return this.grid.buildings.length;
  }

  private computePopulation(): number {
    let p = BASE_POPULATION + this.stats.residents;
    for (const b of this.grid.buildings) p += HOUSING[b.type] ?? 0;
    return p;
  }

  private changed(notify = true): void {
    this.revision++;
    this.linhKhi = computeLinhKhi(this.grid);
    this.stats = townStats(this.grid, this.sectCount());
    this.population = this.computePopulation();
    // Worker là nguồn chuẩn: bản sao thụ động không tự thưởng, đợi ảnh chụp.
    if (this.questsOn && !this.passive) checkQuest(this);
    if (notify) this.emit();
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
  const w = new World(g);
  w.questsOn = true;
  return w;
}
