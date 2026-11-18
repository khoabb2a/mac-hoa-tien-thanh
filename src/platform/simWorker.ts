/// <reference lib="webworker" />
/**
 * Web Worker chạy mô phỏng (GDD 3.3): giữ luồng chính rảnh cho vẽ và chạm trên máy yếu (iPhone SE 2020).
 * Toàn bộ logic ở sim/simCore.ts; file này chỉ nối với postMessage và đồng hồ của Worker.
 */
import type { ToSim } from '../sim/protocol';
import { SimCore } from '../sim/simCore';

const scope = self as unknown as DedicatedWorkerGlobalScope;
const core = new SimCore((m) => scope.postMessage(m));
scope.onmessage = (e: MessageEvent<ToSim>) => core.handle(e.data);

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  core.tick(Math.min((now - last) / 1000, 1)); // tối đa 1 giây mỗi nhịp nếu tab bị treo
  last = now;
}, 50);
