import { describe, expect, it } from 'vitest';
import { BUILD_COST, REFUND_RATE, ROAD_COST } from './economy';
import { Grid } from './grid';
import { lPath } from './path';
import { createDemoWorld, World } from './world';

function emptyWorld(money = 1000): World {
  return new World(new Grid(10, 10), money);
}

describe('lPath', () => {
  it('đi ngang rồi dọc, gồm hai đầu', () => {
    expect(lPath(1, 1, 3, 2)).toEqual([[1, 1], [2, 1], [3, 1], [3, 2]]);
    expect(lPath(2, 2, 2, 2)).toEqual([[2, 2]]);
    expect(lPath(3, 3, 1, 1)).toEqual([[3, 3], [2, 3], [1, 3], [1, 2], [1, 1]]);
  });
});

describe('xây dựng', () => {
  it('xây trừ linh thạch và tăng nhân khẩu', () => {
    const w = emptyWorld();
    const pop = w.population;
    const r = w.build('tinhXa', 2, 2);
    expect(r.ok).toBe(true);
    expect(w.linhThach).toBe(1000 - BUILD_COST.tinhXa);
    expect(w.population).toBe(pop + 4);
  });

  it('không xây chồng lên công trình khác', () => {
    const w = emptyWorld();
    w.build('tinhXa', 2, 2);
    expect(w.build('tinhXa', 3, 3)).toMatchObject({ ok: false, reason: 'blocked' });
  });

  it('thiếu linh thạch thì không xây và không trừ tiền', () => {
    const w = emptyWorld(50);
    expect(w.build('chinhDien', 1, 1)).toMatchObject({ ok: false, reason: 'funds' });
    expect(w.linhThach).toBe(50);
  });

  it('linh lộ chỉ tính tiền ô mới', () => {
    const w = emptyWorld();
    w.buildRoad(lPath(0, 0, 4, 0));
    expect(w.linhThach).toBe(1000 - 5 * ROAD_COST);
    const r = w.previewRoad(lPath(0, 0, 4, 1));
    expect(r).toMatchObject({ ok: true, newTiles: 1, cost: ROAD_COST });
    expect(w.previewRoad(lPath(0, 0, 2, 0))).toMatchObject({ ok: false, reason: 'nothing' });
  });

  it('linh lộ không đi xuyên công trình', () => {
    const w = emptyWorld();
    w.build('tinhXa', 3, 0);
    expect(w.previewRoad(lPath(0, 0, 6, 0))).toMatchObject({ ok: false, reason: 'blocked' });
  });

  it('phá dỡ hoàn một nửa và trả ô trống', () => {
    const w = emptyWorld();
    w.build('duocVien', 4, 4);
    const before = w.linhThach;
    const r = w.demolishAt(5, 5);
    expect(r.ok).toBe(true);
    expect(w.linhThach).toBe(before + Math.floor(BUILD_COST.duocVien * REFUND_RATE));
    expect(w.grid.canPlace('duocVien', 4, 4)).toBe(true);
    expect(w.demolishAt(5, 5)).toMatchObject({ ok: false, reason: 'nothing' });
  });

  it('nối linh lộ tới Tĩnh Xá đơn độc thì nó có linh khí', () => {
    const w = createDemoWorld();
    const lonely = w.grid.buildingAt(3, 17)!;
    expect(w.linhKhi.building.get(lonely.id)).toBe(0);
    // từ đường ngang y=12 kéo xuống cạnh trên của Tĩnh Xá (3..4, 16)
    const r = w.buildRoad(lPath(3, 13, 3, 16));
    expect(r.ok).toBe(true);
    expect(w.linhKhi.building.get(lonely.id)!).toBeGreaterThan(20);
    expect(w.linhKhi.coverage).toBe(1);
  });
});

describe('lưu game', () => {
  it('lưu rồi khôi phục giữ nguyên trạng thái', () => {
    const w = createDemoWorld();
    w.build('tinhXa', 15, 15);
    w.clock.speed = 2;
    w.update(1000);
    const json = JSON.parse(JSON.stringify(w.toSave()));
    const w2 = World.fromSave(json);
    expect(w2.linhThach).toBe(w.linhThach);
    expect(w2.clock.termKey).toBe(w.clock.termKey);
    expect(w2.clock.speed).toBe(2);
    expect(w2.grid.buildings).toEqual(w.grid.buildings);
    expect(Array.from(w2.grid.road)).toEqual(Array.from(w.grid.road));
    // id mới không trùng sau khi khôi phục
    const b = w2.grid.place('duocVien', 15, 18)!;
    expect(w.grid.buildings.some((x) => x.id === b.id)).toBe(false);
  });

  it('từ chối bản lưu khác phiên bản', () => {
    const s = createDemoWorld().toSave();
    expect(() => World.fromSave({ ...s, v: 999 })).toThrow();
  });
});
