import { applyAction, type FromSim, type ToSim } from './protocol';
import { World } from './world';

/** Gửi ảnh chụp trạng thái tối đa mỗi SNAP_MS (gom các thay đổi liên tiếp). */
export const SNAP_MS = 100;
/** Báo đồng hồ cho luồng chính mỗi CLOCK_MS để HUD khớp. */
export const CLOCK_MS = 250;

/**
 * Lõi mô phỏng chạy trong Web Worker (GDD 3.3) — tách khỏi `self`/postMessage để test được.
 * Nhận tin nhắn, giữ World "thật", tự chạy thời gian, gửi ảnh chụp khi có thay đổi.
 */
export class SimCore {
  world: World | null = null;
  private dirty = false;
  private lastSnap = -Infinity;
  private lastClock = -Infinity;

  constructor(
    private readonly post: (m: FromSim) => void,
    private readonly now: () => number = () => Date.now(),
  ) {}

  handle(m: ToSim): void {
    if (m.t === 'init') {
      this.world = World.fromSave(m.save);
      this.world.subscribe(() => (this.dirty = true));
      this.post({ t: 'ready' });
      return;
    }
    const w = this.world;
    if (!w) return;
    if (m.t === 'act') {
      const result = applyAction(w, m.act);
      this.post({ t: 'result', id: m.id, result });
      if (m.act.k === 'speed') this.postClock();
      this.flush(true);
    } else if (m.t === 'save') {
      this.post({ t: 'saved', id: m.id, save: w.toSave() });
    }
  }

  /** Gọi định kỳ với thời gian thực đã trôi (giây). */
  tick(realSeconds: number): void {
    if (!this.world) return;
    this.world.update(realSeconds);
    this.flush(false);
    if (this.now() - this.lastClock >= CLOCK_MS) this.postClock();
  }

  private flush(force: boolean): void {
    const w = this.world;
    if (!w || !this.dirty) return;
    if (!force && this.now() - this.lastSnap < SNAP_MS) return;
    this.dirty = false;
    this.lastSnap = this.now();
    this.post({ t: 'snap', save: w.toSave(), income: w.lastIncome });
  }

  private postClock(): void {
    const w = this.world;
    if (!w) return;
    this.lastClock = this.now();
    this.post({ t: 'clock', elapsed: w.clock.elapsed, speed: w.clock.speed });
  }
}
