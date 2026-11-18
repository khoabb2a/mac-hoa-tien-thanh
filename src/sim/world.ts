import { Grid, Terrain } from './grid';
import { computeLinhKhi, type LinhKhiResult } from './linhKhi';
import { TietKhiClock } from './time';

/** Trạng thái thế giới + vòng tick. Sau này chuyển vào Web Worker (GDD mục 3.3). */
export class World {
  readonly grid: Grid;
  readonly clock = new TietKhiClock();
  linhKhi: LinhKhiResult;
  linhThach = 500;
  population = 5;
  private listeners = new Set<() => void>();

  constructor(grid: Grid) {
    this.grid = grid;
    this.linhKhi = computeLinhKhi(grid);
  }

  /** Gọi mỗi khung hình với thời gian thực đã trôi (giây). */
  update(realSeconds: number): void {
    const changed = this.clock.advance(realSeconds);
    for (let i = 0; i < changed; i++) this.onNewTerm();
  }

  recompute(): void {
    this.linhKhi = computeLinhKhi(this.grid);
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  /** Mỗi tiết khí: thu cống phẩm theo công trình có linh khí (giá trị tạm, sẽ cân bằng sau). */
  private onNewTerm(): void {
    const powered = [...this.linhKhi.building.values()].filter((v) => v >= 20).length;
    this.linhThach += 10 + powered * 5;
    this.emit();
  }
}

/** Bản đồ mẫu 24×24 cho cấp Động Phủ. */
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
  g.vein[g.idx(9, 10)] = 1;
  g.vein[g.idx(10, 10)] = 1;

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
