import { fengShuiAt } from './fengShui';
import { Grid, Terrain } from './grid';
import type { Rng } from './rng';

/**
 * Vùng phàm trần tự mọc nhà (GDD 5.1) — tương đương R/C/I của SimCity:
 *  Cư (Phàm Cư) = dân ở · Thị (Phường Thị) = việc buôn bán · Điền (Linh Điền) = việc ruộng nương.
 * Mỗi ô có vùng là một lô 1×1, mọc dần Thảo Xá → Trạch Viện → Lâu Các theo nhu cầu Tam Tài Khí.
 */
export type ZoneType = 'cu' | 'thi' | 'dien';
export const ZONES: ZoneType[] = ['cu', 'thi', 'dien'];
export const ZONE_ID: Record<ZoneType, number> = { cu: 1, thi: 2, dien: 3 };
export const ZONE_OF: Record<number, ZoneType | undefined> = { 1: 'cu', 2: 'thi', 3: 'dien' };

export const ZONE_COST = 2; // linh thạch mỗi ô
export const MAX_LEVEL = 3;

/** Sức chứa theo cấp 0..3: Cư = số dân, Thị/Điền = số việc. */
export const CAPACITY: Record<ZoneType, readonly number[]> = {
  cu: [0, 3, 8, 16],
  thi: [0, 2, 5, 10],
  dien: [0, 3, 6, 10],
};

/** Cống phẩm mỗi tiết khí cho mỗi dân / mỗi việc. */
export const TAX = { resident: 0.3, thi: 0.8, dien: 0.4 };

export interface Demand {
  cu: number;
  thi: number;
  dien: number;
}

export interface TownStats {
  residents: number;
  thiJobs: number;
  dienJobs: number;
  zoned: number;
  /** Nhu cầu Tam Tài Khí, mỗi cột -1..1 (dương = đang thiếu, cần quy hoạch thêm). */
  demand: Demand;
}

/** Linh khí cao nhất trên linh lộ kề ô (4 hướng); 0 nếu không giáp đường. */
export function roadQi(grid: Grid, roadQiMap: Float32Array, x: number, y: number): { access: boolean; qi: number } {
  let access = false;
  let qi = 0;
  for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
    if (!grid.inBounds(nx, ny)) continue;
    const j = grid.idx(nx, ny);
    if (grid.road[j]) {
      access = true;
      qi = Math.max(qi, roadQiMap[j]);
    }
  }
  return { access, qi };
}

/** Cấp tối đa của lô: theo linh khí đường bên cạnh (giá trị đất), phong thủy tốt nâng thêm một bậc. */
export function levelCap(grid: Grid, roadQiMap: Float32Array, x: number, y: number): number {
  const { access, qi } = roadQi(grid, roadQiMap, x, y);
  if (!access) return 0;
  let cap = qi >= 120 ? 3 : qi >= 40 ? 2 : 1;
  if (fengShuiAt(grid, x, y).score >= 2) cap += 1;
  return Math.min(cap, MAX_LEVEL);
}

export function townStats(grid: Grid, sectBuildings: number): TownStats {
  let residents = 0, thiJobs = 0, dienJobs = 0, zoned = 0;
  for (let i = 0; i < grid.zone.length; i++) {
    const z = ZONE_OF[grid.zone[i]];
    if (!z) continue;
    zoned++;
    const cap = CAPACITY[z][grid.level[i]];
    if (z === 'cu') residents += cap;
    else if (z === 'thi') thiJobs += cap;
    else dienJobs += cap;
  }
  // Người kéo đến khi có việc làm; tông môn và một mức nền giúp trấn nhỏ khởi đầu.
  const rawCu = (thiJobs + dienJobs) * 1.1 + 12 + sectBuildings * 2 - residents;
  const rawThi = residents * 0.35 - thiJobs;
  const rawDien = residents * 0.55 + sectBuildings * 2 - dienJobs;
  const d = (v: number) => Math.round(Math.tanh(v / 10) * 100) / 100;
  return { residents, thiJobs, dienJobs, zoned, demand: { cu: d(rawCu), thi: d(rawThi), dien: d(rawDien) } };
}

/** Lý do một lô đang (không) mọc nhà — để người chơi chạm vào lô và hiểu ngay. */
export type LotReason = 'noAccess' | 'declining' | 'full' | 'noDemand' | 'surplus' | 'growing';
export interface LotStatus {
  zone: ZoneType;
  level: number;
  cap: number;
  qi: number;
  fengShui: number;
  reason: LotReason;
}

export function lotStatus(grid: Grid, roadQiMap: Float32Array, demand: Demand, x: number, y: number): LotStatus | null {
  if (!grid.inBounds(x, y)) return null;
  const i = grid.idx(x, y);
  const zone = ZONE_OF[grid.zone[i]];
  if (!zone) return null;
  const level = grid.level[i];
  const { access, qi } = roadQi(grid, roadQiMap, x, y);
  const cap = levelCap(grid, roadQiMap, x, y);
  const d = demand[zone];
  const reason: LotReason = !access
    ? 'noAccess'
    : level > cap
      ? 'declining'
      : level >= cap
        ? 'full'
        : d < -0.35
          ? 'surplus'
          : d <= 0.05
            ? 'noDemand'
            : 'growing';
  return { zone, level, cap, qi: Math.round(qi), fengShui: fengShuiAt(grid, x, y).score, reason };
}

/** Một bước mọc/suy của vùng phàm trần, chạy mỗi tiết khí. Trả về số ô đổi cấp. */
export function growTown(grid: Grid, roadQiMap: Float32Array, demand: Demand, rng: Rng): number {
  let changed = 0;
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const i = grid.idx(x, y);
      const z = ZONE_OF[grid.zone[i]];
      if (!z) continue;
      const lv = grid.level[i];
      const cap = levelCap(grid, roadQiMap, x, y);
      const d = demand[z];
      const roll = rng.next();
      if (lv > cap) {
        grid.level[i] = lv - 1; // mất đường hoặc linh khí: nhà xuống cấp dần
        changed++;
      } else if (d > 0.05 && lv < cap && roll < 0.15 + 0.5 * d) {
        grid.level[i] = lv + 1;
        changed++;
      } else if (d < -0.35 && lv > 0 && roll < 0.12) {
        grid.level[i] = lv - 1; // thừa cung: một ít nhà bỏ trống
        changed++;
      }
    }
  return changed;
}

/** Ô có thể quy hoạch: cỏ, không đường, không công trình. */
export function canZone(grid: Grid, x: number, y: number): boolean {
  if (!grid.inBounds(x, y)) return false;
  const i = grid.idx(x, y);
  return grid.terrain[i] === Terrain.Grass && !grid.road[i] && grid.occupant[i] === -1;
}
