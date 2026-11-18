import { Grid, type Building } from './grid';

/**
 * Linh khí lan theo linh lộ (GDD mục 5.3): Tụ Linh Trận phát linh khí vào các ô đường kề nó,
 * linh khí đi dọc linh lộ và giảm dần theo số bước. Công trình nhận linh khí cao nhất
 * trong các ô đường kề chu vi của nó. Đặt trận trên mắt linh mạch thì nguồn mạnh gấp 2,5 lần.
 * Tính bằng lan tỏa theo ô (BFS), không mô phỏng dòng chảy.
 */
export const SOURCE_BASE = 100;
export const VEIN_MULTIPLIER = 2.5;
export const DECAY_PER_STEP = 6;
/** Ngưỡng tối thiểu để công trình được coi là có linh khí. */
export const POWERED_THRESHOLD = 20;

export interface LinhKhiResult {
  /** Linh khí trên từng ô đường (0 nếu không phải đường hoặc không tới). */
  road: Float32Array;
  /** Linh khí từng công trình nhận được, theo id. */
  building: Map<number, number>;
  /** Tỉ lệ công trình (trừ Tụ Linh Trận) có linh khí ≥ ngưỡng, 0..1. */
  coverage: number;
}

export function sourceStrength(grid: Grid, b: Building): number {
  for (let dy = 0; dy < b.h; dy++)
    for (let dx = 0; dx < b.w; dx++) if (grid.vein[grid.idx(b.x + dx, b.y + dy)]) return SOURCE_BASE * VEIN_MULTIPLIER;
  return SOURCE_BASE;
}

export function computeLinhKhi(grid: Grid): LinhKhiResult {
  const road = new Float32Array(grid.width * grid.height);
  // Hàng đợi ưu tiên đơn giản: vì mọi bước giảm đều nhau, xử lý theo thứ tự giá trị giảm dần.
  const queue: Array<[number, number, number]> = [];

  for (const b of grid.buildings) {
    if (b.type !== 'tuLinhTran') continue;
    const s = sourceStrength(grid, b);
    for (const [x, y] of grid.perimeter(b)) {
      if (!grid.inBounds(x, y)) continue;
      const i = grid.idx(x, y);
      if (grid.road[i] && road[i] < s) {
        road[i] = s;
        queue.push([x, y, s]);
      }
    }
  }

  queue.sort((a, b) => b[2] - a[2]);
  while (queue.length) {
    const [x, y, v] = queue.shift()!;
    if (v < road[grid.idx(x, y)]) continue;
    const next = v - DECAY_PER_STEP;
    if (next <= 0) continue;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (!grid.inBounds(nx, ny)) continue;
      const j = grid.idx(nx, ny);
      if (grid.road[j] && road[j] < next) {
        road[j] = next;
        // chèn giữ thứ tự giảm dần
        let k = queue.findIndex((q) => q[2] < next);
        if (k === -1) k = queue.length;
        queue.splice(k, 0, [nx, ny, next]);
      }
    }
  }

  const building = new Map<number, number>();
  let consumers = 0;
  let powered = 0;
  for (const b of grid.buildings) {
    if (b.type === 'tuLinhTran') {
      building.set(b.id, sourceStrength(grid, b));
      continue;
    }
    let best = 0;
    for (const [x, y] of grid.perimeter(b)) {
      if (grid.inBounds(x, y)) best = Math.max(best, road[grid.idx(x, y)]);
    }
    building.set(b.id, best);
    consumers++;
    if (best >= POWERED_THRESHOLD) powered++;
  }

  return { road, building, coverage: consumers ? powered / consumers : 1 };
}
