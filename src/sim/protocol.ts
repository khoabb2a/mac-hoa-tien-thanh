import type { SquadTarget } from './expedition';
import type { BuildingType } from './grid';
import { SECONDS_PER_TERM, SPEEDS, type SpeedIndex } from './time';
import type { ActionResult, World, WorldSave } from './world';
import type { ZoneType } from './zones';

/** Hành động của người chơi — cùng một kiểu cho chạy tại chỗ và chạy trong Worker. */
export type Action =
  | { k: 'build'; type: BuildingType; x: number; y: number }
  | { k: 'road'; path: Array<[number, number]> }
  | { k: 'demolish'; x: number; y: number }
  | { k: 'zone'; type: ZoneType; ax: number; ay: number; bx: number; by: number }
  | { k: 'speed'; speed: SpeedIndex }
  /** Mốc 1: cử Đạo Đội tới mỏ / đổi đích / gọi về (target home). */
  | { k: 'dispatch'; squad: number; target: SquadTarget }
  /** Chỉ để thử nghiệm (URL có ?debug): tua nhanh n tiết khí. */
  | { k: 'debugAdvance'; terms: number };

/** Luồng chính → Worker. */
export type ToSim =
  | { t: 'init'; save: WorldSave }
  | { t: 'act'; id: number; act: Action }
  | { t: 'save'; id: number };

/** Worker → luồng chính. */
export type FromSim =
  | { t: 'ready' }
  | { t: 'snap'; save: WorldSave; income: number }
  | { t: 'clock'; elapsed: number; speed: SpeedIndex }
  | { t: 'result'; id: number; result: ActionResult }
  | { t: 'saved'; id: number; save: WorldSave };

/** Áp một hành động lên World — dùng chung cho bản sao trên luồng chính và World trong Worker. */
export function applyAction(world: World, a: Action): ActionResult {
  switch (a.k) {
    case 'build':
      return world.build(a.type, a.x, a.y);
    case 'road':
      return world.buildRoad(a.path);
    case 'demolish':
      return world.demolishAt(a.x, a.y);
    case 'zone':
      return world.zone(a.type, a.ax, a.ay, a.bx, a.by);
    case 'dispatch':
      return world.dispatch(a.squad, a.target);
    case 'speed':
      world.clock.speed = a.speed;
      return { ok: true, cost: 0 };
    case 'debugAdvance': {
      const speed = SPEEDS[world.clock.speed] || 1;
      world.update((SECONDS_PER_TERM * a.terms) / speed);
      return { ok: true, cost: 0 };
    }
  }
}
