import { pathLength, type Pt, type Region } from './region';

/**
 * Đạo Đội và lịch trình (đặc tả mốc 1). Khi ra lệnh, lịch trình được tính trọn:
 * đi → khai thác → về. Vị trí và hành trang ở thời điểm t là hàm của lịch trình,
 * nên bản sao thụ động, bản lưu và (sau này) máy chủ đều cho cùng kết quả.
 * Thời gian là thời gian game (`clock.elapsed`, giây).
 */

export interface MovePhase {
  k: 'move';
  t0: number;
  t1: number;
  /** Đường gấp khúc theo tọa độ ô; điểm đầu có thể là vị trí lẻ (đang giữa hai ô). */
  pts: Pt[];
}

export interface GatherPhase {
  k: 'gather';
  t0: number;
  t1: number;
  node: number;
  /** Lượng sẽ khai khi xong chặng. */
  amount: number;
  /** Đã trừ vào trữ lượng điểm (World làm khi chặng xong hoặc bị cắt ngang). */
  applied: boolean;
}

export type Phase = MovePhase | GatherPhase;

export type SquadTarget = { k: 'node'; node: number } | { k: 'home' };

export interface Squad {
  id: number;
  /** Ô mỗi giây (thời gian game). */
  speed: number;
  /** Sức chở tối đa. */
  capacity: number;
  /** Lượng khai thác mỗi giây. */
  rate: number;
  /** Hành trang mang theo từ trước lịch trình hiện tại (vd. khai dở rồi đổi đích). */
  cargo: number;
  plan: Phase[];
  target: SquadTarget | null;
  /** Số chuyến đã về tới Động Phủ — HUD dựa vào đây để báo "+N linh thạch". */
  trips: number;
  /** Lượng mang về ở chuyến gần nhất. */
  lastHaul: number;
}

export type ExpeditionFail = 'noPath' | 'depleted' | 'busy' | 'full' | 'nothing';

export function newSquad(id: number): Squad {
  return { id, speed: 0.6, capacity: 300, rate: 6, cargo: 0, plan: [], target: null, trips: 0, lastHaul: 0 };
}

export function isOut(s: Squad): boolean {
  return s.plan.length > 0;
}

export function endTime(s: Squad): number {
  return s.plan.length ? s.plan[s.plan.length - 1].t1 : 0;
}

/** Lượng đã khai trong một chặng tính tới thời điểm t (làm tròn xuống). */
export function gatheredAt(p: GatherPhase, t: number): number {
  if (t >= p.t1) return p.amount;
  if (t <= p.t0) return 0;
  return Math.min(p.amount, Math.floor(((t - p.t0) / (p.t1 - p.t0)) * p.amount));
}

/** Hành trang tại thời điểm t. */
export function cargoAt(s: Squad, t: number): number {
  let c = s.cargo;
  for (const p of s.plan) if (p.k === 'gather') c += gatheredAt(p, t);
  return c;
}

/** Điểm trên đường gấp khúc sau khi đi được quãng d; kèm ô đầu mút gần nhất của đoạn đang đi. */
function along(pts: Pt[], d: number): { pos: Pt; anchor: Pt; seg: number } {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (d <= len || i === pts.length - 1) {
      const k = len ? Math.min(1, Math.max(0, d / len)) : 1;
      const pos: Pt = [ax + (bx - ax) * k, ay + (by - ay) * k];
      // ô đầu mút gần hơn; điểm đầu lẻ (không phải ô) thì luôn lấy ô phía trước
      const aIsTile = Number.isInteger(ax) && Number.isInteger(ay);
      const anchor: Pt = aIsTile && k < 0.5 ? [ax, ay] : [bx, by];
      return { pos, anchor, seg: i };
    }
    d -= len;
  }
  return { pos: pts[pts.length - 1], anchor: pts[pts.length - 1], seg: pts.length - 1 };
}

export interface SquadState {
  pos: Pt;
  /** Ô đi được gần nhất để tính đường mới từ đây. */
  anchor: Pt;
  phase: Phase | null;
  cargo: number;
}

/** Trạng thái Đạo Đội tại thời điểm t. Đội ở nhà đứng tại cổng Động Phủ. */
export function stateAt(s: Squad, region: Region, t: number): SquadState {
  const cargo = cargoAt(s, t);
  for (const p of s.plan) {
    if (t >= p.t1 && p !== s.plan[s.plan.length - 1]) continue;
    if (p.k === 'gather') {
      const n = region.node(p.node)!;
      return { pos: [n.x, n.y], anchor: [n.x, n.y], phase: p, cargo };
    }
    const d = p.t1 > p.t0 ? (Math.min(Math.max(t, p.t0), p.t1) - p.t0) * s.speed : pathLength(p.pts);
    const a = along(p.pts, d);
    return { pos: a.pos, anchor: a.anchor, phase: p, cargo };
  }
  return { pos: [...region.gate], anchor: [...region.gate], phase: null, cargo };
}

/** Phần đường còn phải đi của chặng di chuyển hiện tại (để vẽ nét liền). */
export function remainingPath(s: Squad, region: Region, t: number): Pt[] {
  const out: Pt[] = [];
  const st = stateAt(s, region, t);
  out.push(st.pos);
  for (const p of s.plan) {
    if (p.k !== 'move' || p.t1 <= t) continue;
    if (p === st.phase) {
      const d = (Math.max(t, p.t0) - p.t0) * s.speed;
      const { seg } = along(p.pts, d);
      out.push(...p.pts.slice(seg));
    } else out.push(...p.pts);
  }
  return out;
}

export interface TripPlan {
  ok: true;
  phases: Phase[];
  /** Thời điểm tới đích (mỏ hoặc Động Phủ). */
  arrive: number;
  /** Thời điểm về tới Động Phủ. */
  home: number;
  /** Lượng sẽ khai (0 nếu đích là Động Phủ). */
  amount: number;
}

/**
 * Tính lịch trình mới cho đội từ vị trí `from` (điểm lẻ) qua ô `anchor`, bắt đầu lúc `now`.
 * `carried` = hành trang đang mang. `busy` = mỏ đang có đội khác nhắm tới.
 */
export function planTrip(
  region: Region,
  s: Squad,
  from: Pt,
  anchor: Pt,
  now: number,
  target: SquadTarget,
  carried: number,
  busy: (node: number) => boolean,
): TripPlan | { ok: false; reason: ExpeditionFail } {
  const lead: Pt[] = from[0] === anchor[0] && from[1] === anchor[1] ? [] : [from];
  const move = (pts: Pt[], t0: number): MovePhase => ({ k: 'move', t0, t1: t0 + pathLength(pts) / s.speed, pts });

  if (target.k === 'home') {
    const path = region.findPath(anchor, region.gate);
    if (!path) return { ok: false, reason: 'noPath' };
    const m = move([...lead, ...path], now);
    return { ok: true, phases: [m], arrive: m.t1, home: m.t1, amount: 0 };
  }

  const node = region.node(target.node);
  if (!node || node.amount <= 0) return { ok: false, reason: 'depleted' };
  if (busy(node.id)) return { ok: false, reason: 'busy' };
  const room = s.capacity - carried;
  if (room <= 0) return { ok: false, reason: 'full' };
  const there = region.findPath(anchor, [node.x, node.y]);
  const back = region.findPath([node.x, node.y], region.gate);
  if (!there || !back) return { ok: false, reason: 'noPath' };
  const go = move([...lead, ...there], now);
  const amount = Math.min(room, node.amount);
  const gather: GatherPhase = { k: 'gather', t0: go.t1, t1: go.t1 + amount / s.rate, node: node.id, amount, applied: false };
  const ret = move(back, gather.t1);
  return { ok: true, phases: [go, gather, ret], arrive: go.t1, home: ret.t1, amount };
}
