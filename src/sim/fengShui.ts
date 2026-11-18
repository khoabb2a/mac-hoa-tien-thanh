import { Grid, Terrain } from './grid';

/**
 * Phong thủy lớp 1 — địa thế, tự động (GDD 5.4). Mỗi điều kiện đạt được 1 điểm, tối đa 3:
 *  - Tựa núi (Huyền Vũ): có ô Đá trong 5 hàng phía sau (phía y nhỏ, nơi dãy núi).
 *  - Nhìn nước (Chu Tước): có ô Nước trong 4 ô quanh nền.
 *  - Linh mạch: mắt linh mạch nằm trên nền hoặc sát nền.
 * Phong thủy chỉ cộng thêm, không phạt (trụ cột "thất bại nhẹ").
 */
export const FENG_SHUI_BONUS = 0.1; // +10% sản lượng mỗi điểm
const BACK_ROWS = 5;
const WATER_RADIUS = 4;

export interface FengShui {
  score: number;
  back: boolean;
  water: boolean;
  vein: boolean;
}

export function fengShuiAt(grid: Grid, x: number, y: number, w = 1, h = 1): FengShui {
  const any = (x0: number, y0: number, x1: number, y1: number, test: (i: number) => boolean): boolean => {
    for (let yy = Math.max(0, y0); yy <= Math.min(grid.height - 1, y1); yy++)
      for (let xx = Math.max(0, x0); xx <= Math.min(grid.width - 1, x1); xx++) if (test(grid.idx(xx, yy))) return true;
    return false;
  };
  const back = any(x - 1, y - BACK_ROWS, x + w, y - 1, (i) => grid.terrain[i] === Terrain.Rock);
  const water = any(x - WATER_RADIUS, y - WATER_RADIUS, x + w - 1 + WATER_RADIUS, y + h - 1 + WATER_RADIUS, (i) => grid.terrain[i] === Terrain.Water);
  const vein = any(x - 1, y - 1, x + w, y + h, (i) => grid.vein[i] === 1);
  return { score: Number(back) + Number(water) + Number(vein), back, water, vein };
}

/** Điểm phong thủy cho cả bản đồ (1×1), dùng để vẽ chấm khi cầm công trình. */
export function fengShuiMap(grid: Grid): Uint8Array {
  const out = new Uint8Array(grid.width * grid.height);
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) out[grid.idx(x, y)] = fengShuiAt(grid, x, y).score;
  return out;
}
