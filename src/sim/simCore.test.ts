import { describe, expect, it } from 'vitest';
import { applyAction, type FromSim } from './protocol';
import { SimCore } from './simCore';
import { SECONDS_PER_TERM } from './time';
import { createDemoWorld, World } from './world';

function setup() {
  const out: FromSim[] = [];
  let t = 0;
  const core = new SimCore((m) => out.push(JSON.parse(JSON.stringify(m))), () => t);
  core.handle({ t: 'init', save: createDemoWorld().toSave() });
  return { core, out, advance: (ms: number) => (t += ms) };
}

describe('SimCore (lõi Worker)', () => {
  it('khởi tạo rồi báo sẵn sàng', () => {
    const { out } = setup();
    expect(out[0]).toEqual({ t: 'ready' });
  });

  it('hành động trả kết quả kèm ảnh chụp ngay', () => {
    const { core, out } = setup();
    core.handle({ t: 'act', id: 7, act: { k: 'build', type: 'tinhXa', x: 15, y: 15 } });
    const result = out.find((m) => m.t === 'result');
    expect(result).toMatchObject({ t: 'result', id: 7, result: { ok: true } });
    const snap = out.find((m) => m.t === 'snap');
    expect(snap && snap.t === 'snap' && snap.save.grid.buildings.some((b) => b.x === 15 && b.y === 15)).toBe(true);
  });

  it('bản sao áp ảnh chụp thì khớp World trong Worker', () => {
    const { core, out, advance } = setup();
    const mirror = createDemoWorld();
    mirror.passive = true;
    const act = { k: 'zone', type: 'cu', ax: 12, ay: 13, bx: 16, by: 13 } as const;
    applyAction(mirror, act); // áp trước trên bản sao cho giao diện phản hồi tức thì
    core.handle({ t: 'act', id: 1, act });
    core.tick(SECONDS_PER_TERM * 6); // nhà mọc trong Worker
    advance(150);
    core.tick(0); // hết nhịp gom 100 ms → gửi ảnh chụp mới nhất
    const snaps = out.filter((m): m is Extract<FromSim, { t: 'snap' }> => m.t === 'snap');
    mirror.applySave(snaps.at(-1)!.save);
    expect(Array.from(mirror.grid.level)).toEqual(Array.from(core.world!.grid.level));
    expect(mirror.linhThach).toBe(core.world!.linhThach);
    expect(mirror.stats.residents).toBeGreaterThan(0);
  });

  it('gom ảnh chụp: không gửi quá một lần mỗi 100 ms khi chỉ có thời gian trôi', () => {
    const { core, out, advance } = setup();
    core.handle({ t: 'act', id: 1, act: { k: 'zone', type: 'cu', ax: 12, ay: 13, bx: 16, by: 13 } });
    const before = out.filter((m) => m.t === 'snap').length;
    for (let i = 0; i < 5; i++) core.tick(SECONDS_PER_TERM); // 5 tiết khí trong cùng một thời điểm
    expect(out.filter((m) => m.t === 'snap').length - before).toBeLessThanOrEqual(1);
    advance(150);
    core.tick(SECONDS_PER_TERM);
    expect(out.filter((m) => m.t === 'snap').length - before).toBeLessThanOrEqual(2);
  });

  it('đổi tốc độ và trả bản lưu theo yêu cầu', () => {
    const { core, out } = setup();
    core.handle({ t: 'act', id: 2, act: { k: 'speed', speed: 2 } });
    expect(out.find((m) => m.t === 'clock')).toMatchObject({ speed: 2 });
    core.handle({ t: 'save', id: 3 });
    const saved = out.find((m) => m.t === 'saved');
    expect(saved && saved.t === 'saved' && World.fromSave(saved.save).clock.speed).toBe(2);
  });
});
