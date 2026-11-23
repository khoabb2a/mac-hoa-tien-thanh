import { describe, expect, it } from 'vitest';
import { cargoAt, endTime, stateAt } from './expedition';
import { applyAction } from './protocol';
import { QUESTS } from './quests';
import { createRegion, pathLength } from './region';
import { SECONDS_PER_TERM, SPEEDS } from './time';
import { createDemoWorld, World } from './world';

/** Tua thời gian game đúng `sec` giây (bất kể tốc độ đang chọn). */
function advance(w: World, sec: number): void {
  w.update(sec / (SPEEDS[w.clock.speed] || 1));
}

describe('bản đồ vùng', () => {
  const r = createRegion();

  it('núi và suối chặn đường; khe núi và chỗ cạn đi qua được', () => {
    expect(r.passable(18, 10)).toBe(false); // dãy núi
    expect(r.passable(18, 24)).toBe(true); // khe núi
    expect(r.passable(5, 14)).toBe(false); // suối
    expect(r.passable(9, 14)).toBe(true); // chỗ cạn
    expect(r.passable(6, 30)).toBe(false); // khối Động Phủ
  });

  it('mọi mỏ đều có đường về cổng Động Phủ', () => {
    for (const n of r.nodes) expect(r.findPath([n.x, n.y], r.gate)).not.toBeNull();
  });

  it('sang bên kia dãy núi phải qua khe núi', () => {
    const p = r.findPath(r.gate, [26, 22])!;
    expect(p.some(([x, y]) => x >= 18 && x <= 19 && (y === 24 || y === 25))).toBe(true);
    for (const [x, y] of p) expect(r.passable(x, y)).toBe(true);
  });

  it('đi chéo không cắt góc ô chặn', () => {
    const p = r.findPath(r.gate, [7, 8])!;
    for (let i = 1; i < p.length; i++) {
      const [ax, ay] = p[i - 1], [bx, by] = p[i];
      if (ax !== bx && ay !== by) {
        expect(r.passable(bx, ay)).toBe(true);
        expect(r.passable(ax, by)).toBe(true);
      }
    }
  });

  it('không có đường tới ô chặn', () => {
    expect(r.findPath(r.gate, [18, 10])).toBeNull();
  });
});

describe('Đạo Đội xuất hành', () => {
  it('đi, khai thác, về: thưởng đúng lượng và đúng một lần khi về tới cổng', () => {
    const w = createDemoWorld();
    const money = w.linhThach;
    const node = w.region.node(1)!;
    const before = node.amount;
    expect(applyAction(w, { k: 'dispatch', squad: 1, target: { k: 'node', node: 1 } }).ok).toBe(true);
    const sq = w.squads[0];
    const [go, gather, back] = sq.plan;
    expect(go.k).toBe('move');
    expect(gather.k).toBe('gather');
    expect(back.k).toBe('move');

    advance(w, go.t1 - w.clock.elapsed + 1); // đang khai thác
    expect(stateAt(sq, w.region, w.clock.elapsed).pos).toEqual([node.x, node.y]);
    expect(w.linhThach).toBe(money); // chưa về thì chưa cộng

    advance(w, gather.t1 - w.clock.elapsed + 0.5); // khai xong, đang về
    expect(node.amount).toBe(before - sq.capacity);
    expect(w.linhThach).toBe(money);

    advance(w, endTime(sq) - w.clock.elapsed + 0.5);
    expect(w.linhThach).toBe(money + 300); // lệnh 'expedition' chưa tới lượt nên không có thưởng lệnh
    expect(sq.plan).toEqual([]);
    expect(sq.trips).toBe(1);
    expect(sq.lastHaul).toBe(300);

    expect(w.clock.elapsed).toBeLessThan(SECONDS_PER_TERM - 60); // chưa sang tiết khí (không lẫn cống phẩm)
    advance(w, 50);
    expect(w.linhThach).toBe(money + 300); // không cộng lần hai
  });

  it('thời gian đi khớp quãng đường và tốc độ', () => {
    const w = createDemoWorld();
    w.dispatch(1, { k: 'node', node: 3 });
    const go = w.squads[0].plan[0];
    if (go.k !== 'move') throw new Error();
    expect(go.t1 - go.t0).toBeCloseTo(pathLength(go.pts) / w.squads[0].speed, 6);
  });

  it('đổi đích giữa đường: đi tiếp từ đúng vị trí đang đứng, giữ danh tính đội', () => {
    const w = createDemoWorld();
    w.dispatch(1, { k: 'node', node: 3 });
    advance(w, 7.3);
    const sq = w.squads[0];
    const here = stateAt(sq, w.region, w.clock.elapsed).pos;
    expect(w.dispatch(1, { k: 'node', node: 1 }).ok).toBe(true);
    expect(w.squads[0]).toBe(sq);
    const first = sq.plan[0];
    if (first.k !== 'move') throw new Error();
    expect(first.pts[0][0]).toBeCloseTo(here[0], 6);
    expect(first.pts[0][1]).toBeCloseTo(here[1], 6);
    expect(stateAt(sq, w.region, w.clock.elapsed).pos[0]).toBeCloseTo(here[0], 6);
    expect(sq.plan[1]).toMatchObject({ k: 'gather', node: 1 });
  });

  it('gọi về giữa lúc khai thác: giữ phần đã khai, trừ vào mỏ, về thì cộng đúng phần đó', () => {
    const w = createDemoWorld();
    const money = w.linhThach;
    const node = w.region.node(1)!;
    const before = node.amount;
    w.dispatch(1, { k: 'node', node: 1 });
    const sq = w.squads[0];
    const gather = sq.plan[1];
    advance(w, gather.t0 - w.clock.elapsed + 10); // khai 10 giây
    const got = cargoAt(sq, w.clock.elapsed);
    expect(got).toBeGreaterThan(0);
    expect(got).toBeLessThan(sq.capacity);
    expect(w.dispatch(1, { k: 'home' }).ok).toBe(true);
    expect(node.amount).toBe(before - got);
    expect(sq.cargo).toBe(got);
    advance(w, endTime(sq) - w.clock.elapsed + 0.5);
    expect(w.linhThach).toBe(money + got);
  });

  it('lệnh không hợp lệ có lý do', () => {
    const w = createDemoWorld();
    expect(w.dispatch(1, { k: 'home' })).toMatchObject({ ok: false, reason: 'nothing' }); // đã ở nhà
    expect(w.dispatch(1, { k: 'node', node: 99 })).toMatchObject({ ok: false, reason: 'depleted' });
    w.dispatch(1, { k: 'node', node: 2 });
    expect(w.dispatch(2, { k: 'node', node: 2 })).toMatchObject({ ok: false, reason: 'busy' });
    w.region.node(3)!.amount = 0;
    expect(w.dispatch(2, { k: 'node', node: 3 })).toMatchObject({ ok: false, reason: 'depleted' });
  });

  it('hành trang đầy thì không nhận lệnh khai thác mới', () => {
    const w = createDemoWorld();
    w.dispatch(1, { k: 'node', node: 1 });
    const sq = w.squads[0];
    advance(w, sq.plan[1].t1 - w.clock.elapsed + 1); // khai đầy, đang về
    expect(w.dispatch(1, { k: 'node', node: 2 })).toMatchObject({ ok: false, reason: 'full' });
  });

  it('tạm dừng thì đội đứng yên', () => {
    const w = createDemoWorld();
    w.dispatch(1, { k: 'node', node: 2 });
    advance(w, 5);
    const a = stateAt(w.squads[0], w.region, w.clock.elapsed).pos;
    w.clock.speed = 0;
    w.update(60);
    expect(stateAt(w.squads[0], w.region, w.clock.elapsed).pos).toEqual(a);
  });

  it('bản sao thụ động không trừ mỏ, không cộng thưởng', () => {
    const w = createDemoWorld();
    w.passive = true;
    const money = w.linhThach;
    w.dispatch(1, { k: 'node', node: 1 });
    w.update(SECONDS_PER_TERM * 2);
    expect(w.linhThach).toBe(money);
    expect(w.region.node(1)!.amount).toBe(600);
  });
});

describe('lưu và tải', () => {
  it('tải lại giữa chuyến: cùng vị trí, cùng kết quả', () => {
    const a = createDemoWorld();
    a.dispatch(1, { k: 'node', node: 3 });
    advance(a, 20);
    const b = World.fromSave(JSON.parse(JSON.stringify(a.toSave())));
    const t = a.clock.elapsed;
    expect(stateAt(b.squads[0], b.region, t).pos).toEqual(stateAt(a.squads[0], a.region, t).pos);
    const rest = endTime(a.squads[0]) - t + 1;
    advance(a, rest);
    advance(b, rest);
    expect(b.linhThach).toBe(a.linhThach);
    expect(b.region.node(3)!.amount).toBe(a.region.node(3)!.amount);
  });

  it('bản lưu trước mốc 1 vẫn đọc được: bản đồ và đội mặc định, giữ đúng lệnh đang làm', () => {
    const s = createDemoWorld().toSave();
    delete s.squads;
    delete s.region;
    s.questIndex = 2; // đang làm "Đón 20 phàm nhân" theo danh sách cũ (chỉ số 2)
    const w = World.fromSave(s);
    expect(w.squads.length).toBe(2);
    expect(w.squads.every((q) => q.plan.length === 0)).toBe(true);
    expect(QUESTS[w.questIndex].id).toBe('residents');
  });

  it('applySave thay đội và trữ lượng của bản sao', () => {
    const a = createDemoWorld();
    a.dispatch(2, { k: 'node', node: 2 });
    const m = createDemoWorld();
    m.applySave(a.toSave());
    expect(m.squads[1].plan.length).toBe(3);
  });
});

describe('Thiên Đạo Lệnh: chuyến xuất hành đầu tiên', () => {
  it('xong khi một đội về tới Động Phủ', () => {
    const w = createDemoWorld();
    w.questIndex = QUESTS.findIndex((q) => q.id === 'expedition');
    const money = w.linhThach;
    w.dispatch(1, { k: 'node', node: 1 });
    advance(w, endTime(w.squads[0]) - w.clock.elapsed + 0.5);
    expect(QUESTS[w.questIndex - 1].id).toBe('expedition');
    expect(w.linhThach).toBe(money + 300 + 100);
  });
});
