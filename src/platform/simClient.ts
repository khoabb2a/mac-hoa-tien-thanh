import { applyAction, type Action, type FromSim, type ToSim } from '../sim/protocol';
import { World, type ActionResult, type WorldSave } from '../sim/world';

/**
 * Cầu nối luồng chính ↔ mô phỏng.
 * - Chế độ "worker": World thật chạy trong Web Worker; `world` ở đây là bản sao thụ động để vẽ và xem trước.
 *   Hành động áp ngay lên bản sao (phản hồi tức thì) rồi gửi sang Worker; ảnh chụp từ Worker thay bản sao.
 * - Chế độ "local": không tạo được Worker → chạy World ngay trên luồng chính như trước.
 */
export interface SimHandle {
  world: World;
  mode: 'worker' | 'local';
  act(a: Action): ActionResult;
}

const READY_TIMEOUT_MS = 4000;

export async function startSim(save: WorldSave): Promise<SimHandle> {
  const world = World.fromSave(save);
  try {
    if (typeof Worker === 'undefined') throw new Error('no worker');
    const worker = new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('worker timeout')), READY_TIMEOUT_MS);
      worker.onerror = (e) => {
        clearTimeout(timer);
        reject(e);
      };
      worker.onmessage = (e: MessageEvent<FromSim>) => {
        if (e.data.t === 'ready') {
          clearTimeout(timer);
          resolve();
        }
      };
      worker.postMessage({ t: 'init', save } satisfies ToSim);
    });

    world.passive = true;
    worker.onmessage = (e: MessageEvent<FromSim>) => {
      const m = e.data;
      if (m.t === 'snap') {
        world.lastIncome = m.income;
        world.applySave(m.save);
      } else if (m.t === 'clock') {
        world.clock.elapsed = m.elapsed;
        world.clock.speed = m.speed;
      }
    };
    let nextId = 1;
    return {
      world,
      mode: 'worker',
      act(a) {
        const r = applyAction(world, a);
        worker.postMessage({ t: 'act', id: nextId++, act: a } satisfies ToSim);
        return r;
      },
    };
  } catch {
    return { world, mode: 'local', act: (a) => applyAction(world, a) };
  }
}
