import { describe, expect, it } from 'vitest';
import { fengShuiAt } from './fengShui';
import { Grid, Terrain } from './grid';
import { lPath } from './path';
import { Rng } from './rng';
import { SECONDS_PER_TERM } from './time';
import { createDemoWorld, World } from './world';
import { CAPACITY, levelCap, townStats, ZONE_COST, ZONE_ID } from './zones';

/** Bản đồ 16×16: đường ngang y=5 nối Tụ Linh Trận, đủ chỗ quy hoạch hai bên. */
function townWorld(money = 2000): World {
  const g = new Grid(16, 16);
  for (let x = 0; x < 16; x++) g.setRoad(x, 5);
  g.place('tuLinhTran', 0, 3); // kề đường ở (0..1, 5)
  return new World(g, money);
}

const passTerms = (w: World, n: number) => w.update(SECONDS_PER_TERM * n);

describe('Rng', () => {
  it('cùng hạt giống cho cùng dãy số', () => {
    const a = new Rng(42), b = new Rng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    for (const v of xs) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThan(1);
  });
});

describe('quy hoạch', () => {
  it('tô vùng tính tiền theo số ô và bỏ qua đường, công trình', () => {
    const w = townWorld();
    const r = w.zone('cu', 2, 4, 5, 6); // 4×3 ô, trong đó hàng y=5 là đường
    expect(r.ok).toBe(true);
    expect(r.cost).toBe(8 * ZONE_COST);
    expect(w.grid.zone[w.grid.idx(3, 5)]).toBe(0);
    expect(w.grid.zone[w.grid.idx(3, 4)]).toBe(ZONE_ID.cu);
    expect(w.previewZone('cu', 2, 4, 5, 6)).toMatchObject({ ok: false, reason: 'nothing' });
  });

  it('không đặt công trình lên ô đã quy hoạch; phá dỡ thì xóa vùng', () => {
    const w = townWorld();
    w.zone('thi', 6, 6, 7, 7);
    expect(w.previewBuild('tinhXa', 6, 6)).toMatchObject({ ok: false, reason: 'blocked' });
    expect(w.demolishAt(6, 6)).toMatchObject({ ok: true, cost: 0 });
    expect(w.grid.zone[w.grid.idx(6, 6)]).toBe(0);
  });

  it('làm đường xuyên vùng thì xóa vùng trên ô đó', () => {
    const w = townWorld();
    w.zone('cu', 8, 6, 8, 8);
    w.buildRoad(lPath(8, 6, 8, 8));
    expect(w.grid.zone[w.grid.idx(8, 7)]).toBe(0);
  });
});

describe('Tam Tài Khí và nhà tự mọc', () => {
  it('trấn trống: thiếu dân (Cư dương)', () => {
    const w = townWorld();
    expect(w.stats.demand.cu).toBeGreaterThan(0);
  });

  it('nhà mọc dần trên ô giáp đường, ô không giáp đường đứng yên', () => {
    const w = townWorld();
    w.zone('cu', 2, 6, 9, 6); // giáp đường y=5
    w.zone('cu', 2, 12, 9, 12); // xa đường
    passTerms(w, 12);
    let near = 0, far = 0;
    for (let x = 2; x <= 9; x++) {
      near += w.grid.level[w.grid.idx(x, 6)];
      far += w.grid.level[w.grid.idx(x, 12)];
    }
    expect(near).toBeGreaterThan(0);
    expect(far).toBe(0);
    expect(w.stats.residents).toBeGreaterThan(0);
  });

  it('nhiều dân mà không có việc thì Thị và Điền thành nhu cầu dương, Cư giảm', () => {
    const g = new Grid(10, 10);
    for (let i = 0; i < 30; i++) {
      g.zone[i] = ZONE_ID.cu;
      g.level[i] = 3;
    }
    const s = townStats(g, 0);
    expect(s.residents).toBe(30 * CAPACITY.cu[3]);
    expect(s.demand.thi).toBeGreaterThan(0.5);
    expect(s.demand.dien).toBeGreaterThan(0.5);
    expect(s.demand.cu).toBeLessThan(0);
  });

  it('cống phẩm phàm trần cộng vào thu nhập mỗi tiết khí', () => {
    const empty = townWorld();
    const town = townWorld();
    town.zone('cu', 2, 6, 9, 6);
    town.zone('thi', 2, 4, 5, 4);
    passTerms(empty, 10);
    passTerms(town, 10);
    // trừ tiền quy hoạch ra, trấn có dân phải thu nhiều hơn
    expect(town.linhThach + 12 * ZONE_COST).toBeGreaterThan(empty.linhThach);
  });

  it('mọc giống hệt nhau khi chạy lại từ cùng bản lưu (Worker và bản lưu đồng bộ)', () => {
    const a = townWorld();
    a.zone('cu', 2, 6, 12, 7);
    const save = JSON.parse(JSON.stringify(a.toSave()));
    const b = World.fromSave(save);
    passTerms(a, 8);
    passTerms(b, 8);
    expect(Array.from(b.grid.level)).toEqual(Array.from(a.grid.level));
  });
});

describe('phong thủy', () => {
  it('tựa núi, nhìn nước, gần linh mạch — mỗi thứ một điểm', () => {
    const g = new Grid(12, 12);
    for (let x = 0; x < 12; x++) g.terrain[g.idx(x, 0)] = Terrain.Rock;
    for (let y = 0; y < 12; y++) g.terrain[g.idx(10, y)] = Terrain.Water;
    g.vein[g.idx(7, 3)] = 1;
    expect(fengShuiAt(g, 7, 2)).toMatchObject({ back: true, water: true, vein: true, score: 3 });
    expect(fengShuiAt(g, 1, 10)).toMatchObject({ back: false, water: false, vein: false, score: 0 });
    expect(fengShuiAt(g, 1, 3).score).toBe(1); // chỉ tựa núi
  });

  it('phong thủy tốt nâng cấp tối đa của lô thêm một bậc', () => {
    const g = new Grid(12, 12);
    for (let x = 0; x < 12; x++) g.setRoad(x, 6);
    const qi = new Float32Array(144).fill(10); // linh khí thấp → cấp 1
    expect(levelCap(g, qi, 3, 7)).toBe(1);
    for (let x = 0; x < 12; x++) g.terrain[g.idx(x, 2)] = Terrain.Rock;
    g.vein[g.idx(3, 8)] = 1;
    expect(levelCap(g, qi, 3, 7)).toBe(2);
  });
});

describe('bản lưu v2', () => {
  it('đọc được bản lưu v1 (chưa có vùng)', () => {
    const s = createDemoWorld().toSave();
    const v1 = { ...s, v: 1, rng: undefined, grid: { ...s.grid, zone: undefined, level: undefined } };
    const w = World.fromSave(JSON.parse(JSON.stringify(v1)));
    expect(w.stats.zoned).toBe(0);
  });

  it('applySave giữ nguyên tham chiếu lưới và đồng bộ trạng thái', () => {
    const a = townWorld();
    const b = townWorld();
    const gridRef = b.grid;
    const zoneRef = b.grid.zone;
    a.zone('dien', 3, 7, 6, 9);
    passTerms(a, 6);
    b.applySave(JSON.parse(JSON.stringify(a.toSave())));
    expect(b.grid).toBe(gridRef);
    expect(b.grid.zone).toBe(zoneRef);
    expect(Array.from(b.grid.level)).toEqual(Array.from(a.grid.level));
    expect(b.linhThach).toBe(a.linhThach);
    expect(b.clock.termKey).toBe(a.clock.termKey);
  });

  it('bản sao thụ động chỉ chạy đồng hồ, không tự mọc nhà', () => {
    const w = townWorld();
    w.zone('cu', 2, 6, 9, 6);
    w.passive = true;
    const money = w.linhThach;
    const residents = w.stats.residents; // vài nhà có thể đã mọc ngay lúc quy hoạch
    passTerms(w, 10);
    expect(w.linhThach).toBe(money);
    expect(w.stats.residents).toBe(residents);
  });
});

describe('lô quy hoạch: mọc ngay và lý do', () => {
  it('quy hoạch khi đang có nhu cầu: vài lô giáp đường dựng nhà ngay', () => {
    const w = createDemoWorld();
    expect(w.stats.demand.cu).toBeGreaterThan(0.05);
    w.zone('cu', 13, 16, 17, 16); // không giáp đường: không mọc
    w.zone('cu', 12, 13, 17, 13); // hàng sát đường y=12
    let built = 0;
    for (let x = 12; x <= 17; x++) if (w.grid.level[w.grid.idx(x, 13)] > 0) built++;
    expect(built).toBeGreaterThan(0);
    for (let x = 13; x <= 17; x++) expect(w.grid.level[w.grid.idx(x, 16)]).toBe(0); // không giáp đường
  });

  it('lotAt cho biết vì sao lô chưa mọc', () => {
    const w = createDemoWorld();
    w.zone('cu', 15, 16, 15, 16);
    expect(w.lotAt(15, 16)?.reason).toBe('noAccess');
    expect(w.lotAt(0, 23)).toBeNull();
    w.zone('cu', 15, 13, 15, 13);
    const lot = w.lotAt(15, 13)!;
    expect(lot.zone).toBe('cu');
    expect(['growing', 'full']).toContain(lot.reason);
    expect(lot.cap).toBeGreaterThanOrEqual(1);
  });
});
