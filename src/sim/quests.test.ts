import { describe, expect, it } from 'vitest';
import { BUILD_COST, ROAD_COST } from './economy';
import { fengShuiAt } from './fengShui';
import { lPath } from './path';
import { QUESTS } from './quests';
import { createDemoWorld, World } from './world';

const idx = (id: string) => QUESTS.findIndex((q) => q.id === id);

describe('Thiên Đạo Lệnh', () => {
  it('bản đồ khởi đầu: chưa lệnh nào xong sẵn', () => {
    const w = createDemoWorld();
    expect(w.questIndex).toBe(0);
    expect(QUESTS[0].progress(w)).toBeLessThan(QUESTS[0].target);
  });

  it('lệnh 1: nối linh lộ tới Tĩnh Xá lẻ loi thì xong và được thưởng một lần', () => {
    const w = createDemoWorld();
    const before = w.linhThach;
    const path = lPath(3, 13, 3, 16);
    const r = w.buildRoad(path);
    expect(r.ok).toBe(true);
    expect(w.linhKhi.coverage).toBe(1);
    expect(w.questIndex).toBe(1);
    expect(w.linhThach).toBe(before - path.length * ROAD_COST + QUESTS[0].reward);
    // thay đổi tiếp theo không thưởng lại
    w.buildRoad(lPath(4, 13, 5, 13));
    expect(w.questIndex).toBe(1);
  });

  it('mỗi lần xét chỉ xong một lệnh, dù lệnh sau đã đạt sẵn', () => {
    const w = createDemoWorld();
    w.linhThach = 5000; // lệnh "wealth" đạt sẵn nhưng chưa tới lượt
    w.buildRoad(lPath(3, 13, 3, 16));
    expect(w.questIndex).toBe(1);
  });

  it('lệnh 2: quy hoạch 6 ô Phàm Cư', () => {
    const w = createDemoWorld();
    w.questIndex = idx('zoneCu');
    const [x, y] = QUESTS[idx('zoneCu')].focus.tile!;
    expect(w.zone('cu', x, y, x + 2, y + 1).ok).toBe(true);
    expect(w.questIndex).toBe(idx('zoneCu') + 1);
  });

  it('lệnh mạch: Tụ Linh Trận thứ hai đặt trên mắt linh mạch ở ô gợi ý', () => {
    const w = createDemoWorld();
    w.linhThach = 1000;
    w.questIndex = idx('vein');
    expect(QUESTS[idx('vein')].progress(w)).toBe(1);
    const [x, y] = QUESTS[idx('vein')].focus.tile!;
    expect(w.build('tuLinhTran', x, y - 1).ok).toBe(true);
    expect(w.questIndex).toBe(idx('vein') + 1);
  });

  it('lệnh phong thủy: ô gợi ý đặt được Tĩnh Xá phong thủy ≥ 2', () => {
    const w = createDemoWorld();
    w.questIndex = idx('fengShui');
    const [x, y] = QUESTS[idx('fengShui')].focus.tile!;
    expect(fengShuiAt(w.grid, x, y, 2, 2).score).toBeGreaterThanOrEqual(2);
    expect(w.build('tinhXa', x, y).ok).toBe(true);
    expect(w.linhThach).toBe(500 - BUILD_COST.tinhXa + QUESTS[idx('fengShui')].reward);
  });

  it('bản sao thụ động không tự thưởng (Worker là nguồn chuẩn)', () => {
    const w = createDemoWorld();
    w.passive = true;
    w.buildRoad(lPath(3, 13, 3, 16));
    expect(w.questIndex).toBe(0);
  });

  it('tiến độ lưu và đọc lại; bản lưu cũ thiếu trường thì về 0', () => {
    const w = createDemoWorld();
    w.buildRoad(lPath(3, 13, 3, 16));
    const s = w.toSave();
    expect(World.fromSave(s).questIndex).toBe(1);
    const old = { ...s };
    delete old.questIndex;
    expect(World.fromSave(old).questIndex).toBe(0);
    const m = createDemoWorld();
    m.applySave(s);
    expect(m.questIndex).toBe(1);
  });

  it('xong hết thì không còn lệnh và không lỗi', () => {
    const w = createDemoWorld();
    w.questIndex = QUESTS.length;
    w.buildRoad(lPath(3, 13, 3, 16));
    expect(w.questIndex).toBe(QUESTS.length);
  });
});
