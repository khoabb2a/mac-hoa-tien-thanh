import { describe, expect, it } from 'vitest';
import { Grid } from './grid';
import { computeLinhKhi, DECAY_PER_STEP, POWERED_THRESHOLD, SOURCE_BASE, VEIN_MULTIPLIER } from './linhKhi';
import { SECONDS_PER_TERM, TERMS_PER_YEAR, TietKhiClock } from './time';
import { createDemoWorld } from './world';

describe('TietKhiClock', () => {
  it('chuyển tiết khí sau mỗi 240 giây ở x1', () => {
    const c = new TietKhiClock();
    expect(c.termKey).toBe('lapXuan');
    expect(c.advance(SECONDS_PER_TERM)).toBe(1);
    expect(c.termKey).toBe('vuThuy');
  });

  it('tốc độ x3 nhanh gấp ba, tốc độ 0 đứng yên', () => {
    const c = new TietKhiClock();
    c.speed = 2;
    expect(c.advance(SECONDS_PER_TERM)).toBe(3);
    c.speed = 0;
    expect(c.advance(10_000)).toBe(0);
  });

  it('sang năm mới sau 24 tiết khí và quay về Lập Xuân', () => {
    const c = new TietKhiClock(SECONDS_PER_TERM * TERMS_PER_YEAR);
    expect(c.year).toBe(2);
    expect(c.termKey).toBe('lapXuan');
    expect(c.season).toBe('spring');
  });
});

describe('computeLinhKhi', () => {
  it('không đặt được công trình vượt biên bản đồ', () => {
    const g = new Grid(12, 3);
    expect(g.place('tuLinhTran', 0, 2)).toBeNull();
  });

  it('linh khí giảm dần theo số bước dọc linh lộ', () => {
    const g2 = new Grid(12, 4);
    for (let x = 0; x < 12; x++) g2.setRoad(x, 2);
    g2.place('tuLinhTran', 0, 0); // chiếm (0..1, 0..1), kề đường ở (0,2),(1,2)
    const r = computeLinhKhi(g2);
    expect(r.road[g2.idx(1, 2)]).toBe(SOURCE_BASE);
    expect(r.road[g2.idx(5, 2)]).toBe(SOURCE_BASE - 4 * DECAY_PER_STEP);
  });

  it('đặt trận trên mắt linh mạch thì nguồn mạnh hơn', () => {
    const g = new Grid(6, 4);
    for (let x = 0; x < 6; x++) g.setRoad(x, 2);
    g.vein[g.idx(0, 0)] = 1;
    g.place('tuLinhTran', 0, 0);
    const r = computeLinhKhi(g);
    expect(r.road[g.idx(0, 2)]).toBe(SOURCE_BASE * VEIN_MULTIPLIER);
  });

  it('công trình không nối linh lộ thì không có linh khí', () => {
    const w = createDemoWorld();
    const lonely = w.grid.buildings.find((b) => b.x === 3 && b.y === 17)!;
    expect(w.linhKhi.building.get(lonely.id)).toBe(0);
    expect(w.linhKhi.coverage).toBeLessThan(1);
    const connected = w.grid.buildings.filter((b) => b.type !== 'tuLinhTran' && b !== lonely);
    for (const b of connected) expect(w.linhKhi.building.get(b.id)!).toBeGreaterThanOrEqual(POWERED_THRESHOLD);
  });
});
