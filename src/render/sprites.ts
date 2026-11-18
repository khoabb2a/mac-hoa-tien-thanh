import * as THREE from 'three';
import type { BuildingType } from '../sim/grid';

/** Sprite họa bản do AI vẽ (GDD 3.4), đã tách nền bằng tools/art/cutout.py. */
export const SPRITE_URL: Partial<Record<BuildingType, string>> = {
  chinhDien: 'sprites/chinhDien.webp',
  tinhXa: 'sprites/tinhXa.webp',
  tuLinhTran: 'sprites/tuLinhTran.webp',
  duocVien: 'sprites/duocVien.webp',
};

const loader = new THREE.TextureLoader();
const cache = new Map<string, { tex: THREE.Texture; ready: boolean; waiting: Array<(t: THREE.Texture) => void> }>();

/** Tải texture một lần, dùng chung cho mọi công trình cùng loại; gọi onReady khi ảnh đã có kích thước. */
export function loadSpriteTexture(url: string, onReady: (tex: THREE.Texture) => void): THREE.Texture {
  const full = import.meta.env.BASE_URL + url;
  let entry = cache.get(full);
  if (!entry) {
    const e = { tex: undefined as unknown as THREE.Texture, ready: false, waiting: [onReady] };
    e.tex = loader.load(full, (t) => {
      e.ready = true;
      for (const fn of e.waiting) fn(t);
      e.waiting = [];
    });
    e.tex.colorSpace = THREE.SRGBColorSpace;
    e.tex.anisotropy = 4;
    cache.set(full, e);
    return e.tex;
  }
  if (entry.ready) onReady(entry.tex);
  else entry.waiting.push(onReady);
  return entry.tex;
}

/**
 * Đặt sprite khớp với khối thô: lấy hộp bao của khối thô trong không gian camera
 * (camera trực giao, hướng cố định), rồi neo đáy-giữa sprite vào đáy-giữa hộp đó và
 * cho bề ngang sprite bằng bề ngang hộp. AI vẽ theo đúng ảnh nét của khối thô nên hai bên khớp.
 */
export function fitSpriteToBlockout(sprite: THREE.Sprite, blockout: THREE.Object3D, cameraQuat: THREE.Quaternion, aspect: number): void {
  blockout.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(blockout);
  const inv = cameraQuat.clone().invert();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, sumZ = 0;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyQuaternion(inv);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        sumZ += p.z;
      }
  const width = maxX - minX;
  const anchor = new THREE.Vector3((minX + maxX) / 2, minY, sumZ / 8).applyQuaternion(cameraQuat);
  sprite.center.set(0.5, 0);
  sprite.position.copy(anchor);
  sprite.scale.set(width, width * aspect, 1);
}
