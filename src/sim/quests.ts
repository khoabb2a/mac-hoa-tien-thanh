import { fengShuiAt } from './fengShui';
import { POWERED_THRESHOLD } from './linhKhi';
import type { World } from './world';
import { ZONE_ID } from './zones';

/**
 * Thiên Đạo Lệnh — chuỗi nhiệm vụ dẫn dắt (GDD 9.4). Mỗi lệnh đo trực tiếp từ trạng thái World,
 * nên tự hoàn thành khi người chơi làm đúng việc, dù làm theo cách nào.
 * Chữ hiển thị: `quest.<id>.title|desc|hint` trong i18n.
 */

/** Nơi "Chỉ cho tôi" đưa người chơi tới: một nút trên HUD và/hoặc một ô trên bản đồ. */
export type QuestUi = 'build' | 'zone' | 'eye' | 'speed' | 'demand' | 'region';
export interface QuestFocus {
  ui?: QuestUi;
  tile?: [number, number];
  /** Thực hành có dẫn: "Chỉ cho tôi" cầm sẵn công cụ này... */
  tool?: 'road' | 'cu' | 'thi' | 'dien';
  /** ...và khoanh các ô cần chạm, theo thứ tự (điểm đầu, điểm cuối / hai góc vùng). */
  guide?: Array<[number, number]>;
}

export interface QuestDef {
  id: string;
  /** Tiến độ hiện tại; xong khi ≥ target. */
  progress: (w: World) => number;
  target: number;
  reward: number;
  focus: QuestFocus;
}

function zoneCount(w: World, id: number): number {
  let n = 0;
  for (let i = 0; i < w.grid.zone.length; i++) if (w.grid.zone[i] === id) n++;
  return n;
}

export const QUESTS: readonly QuestDef[] = [
  {
    // Theo dõi đúng Tĩnh Xá ở góc tây nam (ô 3,17): phải còn đứng đó và nhận đủ linh khí.
    // Phá đi thì không tính; dựng lại đúng chỗ rồi nối đường vẫn hoàn thành được.
    id: 'connect',
    progress: (w) => {
      const b = w.grid.buildings.find((b) => b.type === 'tinhXa' && b.x <= 4 && b.x + b.w > 3 && b.y <= 18 && b.y + b.h > 17);
      return b && (w.linhKhi.building.get(b.id) ?? 0) >= POWERED_THRESHOLD ? 1 : 0;
    },
    target: 1,
    reward: 100,
    focus: { ui: 'build', tile: [3, 15], tool: 'road', guide: [[3, 13], [3, 16]] },
  },
  {
    id: 'zoneCu',
    progress: (w) => zoneCount(w, ZONE_ID.cu),
    target: 6,
    reward: 60,
    focus: { ui: 'zone', tile: [14, 11], tool: 'cu', guide: [[12, 11], [17, 11]] },
  },
  {
    id: 'expedition',
    progress: (w) => w.squads.reduce((a, q) => a + q.trips, 0),
    target: 1,
    reward: 100,
    focus: { ui: 'region' },
  },
  { id: 'residents', progress: (w) => w.stats.residents, target: 20, reward: 80, focus: { ui: 'speed' } },
  { id: 'thi', progress: (w) => w.stats.thiJobs, target: 6, reward: 80, focus: { ui: 'demand' } },
  { id: 'dien', progress: (w) => w.stats.dienJobs, target: 6, reward: 80, focus: { ui: 'zone' } },
  {
    id: 'vein',
    progress: (w) =>
      w.grid.buildings.filter((b) => {
        if (b.type !== 'tuLinhTran') return false;
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (w.grid.vein[w.grid.idx(x, y)]) return true;
        return false;
      }).length,
    target: 2,
    reward: 150,
    focus: { ui: 'eye', tile: [5, 18] },
  },
  {
    id: 'fengShui',
    progress: (w) => Math.max(0, ...w.grid.buildings.filter((b) => b.type === 'tinhXa').map((b) => fengShuiAt(w.grid, b.x, b.y, b.w, b.h).score)),
    target: 2,
    reward: 120,
    focus: { ui: 'build', tile: [15, 6] },
  },
  { id: 'population', progress: (w) => w.population, target: 100, reward: 200, focus: { ui: 'demand' } },
  { id: 'wealth', progress: (w) => w.linhThach, target: 2000, reward: 500, focus: {} },
];

/**
 * Xét lệnh hiện tại; xong thì thưởng và chuyển lệnh kế. Mỗi lần gọi chỉ hoàn thành tối đa một lệnh,
 * để người chơi kịp thấy từng lệnh dù điều kiện lệnh sau đã đạt sẵn.
 * Trả về lệnh vừa xong (hoặc null).
 */
export function checkQuest(w: World): QuestDef | null {
  const q = QUESTS[w.questIndex];
  if (!q || q.progress(w) < q.target) return null;
  w.questIndex++;
  w.linhThach += q.reward;
  return q;
}
