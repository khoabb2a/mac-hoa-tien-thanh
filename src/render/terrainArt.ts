import * as THREE from 'three';
import { Terrain, type Grid } from '../sim/grid';
import { loadSpriteTexture } from './sprites';

/**
 * Cây, đá, vách núi trang trí bằng họa bản AI (GDD 3.4). Chỉ để nhìn — không phải luật chơi:
 * vị trí suy ra từ lưới bằng hàm băm cố định, nên mỗi lần dựng lại đều ra cùng một cảnh;
 * ô nào có đường hay công trình thì vật trang trí tự biến mất.
 */
export type DecorKind = 'tung' | 'truc' | 'dao' | 'ky_thach' | 'lau_say' | 'vach_da';

interface DecorSpec {
  url: string;
  /** Chiều cao trong không gian camera (đơn vị thế giới), hoặc bề ngang nếu `byWidth`. */
  size: number;
  byWidth?: boolean;
  /** Điểm neo trên sprite (0..1), y nhỏ = đáy ảnh. */
  anchorY: number;
  footprint: 1 | 2;
}

export const DECOR: Record<DecorKind, DecorSpec> = {
  tung: { url: 'sprites/tung.webp', size: 2.1, anchorY: 0.04, footprint: 1 },
  truc: { url: 'sprites/truc.webp', size: 2.0, anchorY: 0.04, footprint: 1 },
  dao: { url: 'sprites/dao.webp', size: 1.85, anchorY: 0.05, footprint: 1 },
  ky_thach: { url: 'sprites/ky_thach.webp', size: 0.85, anchorY: 0.1, footprint: 1 },
  lau_say: { url: 'sprites/lau_say.webp', size: 0.9, anchorY: 0.08, footprint: 1 },
  vach_da: { url: 'sprites/vach_da.webp', size: 2.75, byWidth: true, anchorY: 0.02, footprint: 2 },
};

export interface DecorItem {
  kind: DecorKind;
  x: number;
  y: number;
}

/** Băm số nguyên → 0..1, cố định theo ô. */
function hash(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function near(grid: Grid, x: number, y: number, test: (i: number) => boolean): boolean {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (grid.inBounds(nx, ny) && test(grid.idx(nx, ny))) return true;
    }
  return false;
}

/** Danh sách vật trang trí cho lưới hiện tại. */
export function decorFor(grid: Grid): DecorItem[] {
  const out: DecorItem[] = [];
  const isRock = (x: number, y: number) => grid.inBounds(x, y) && grid.terrain[grid.idx(x, y)] === Terrain.Rock;
  const usedRock = new Set<number>();

  // Vách đá phủ các khối 2×2 toàn ô Đá (rìa sau bản đồ); ô Đá lẻ còn lại thành kỳ thạch.
  for (let y = 0; y < grid.height - 1; y += 2)
    for (let x = 0; x < grid.width - 1; x += 2)
      if (isRock(x, y) && isRock(x + 1, y) && isRock(x, y + 1) && isRock(x + 1, y + 1)) {
        out.push({ kind: 'vach_da', x, y });
        for (const [a, b] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) usedRock.add(grid.idx(a, b));
      }
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const i = grid.idx(x, y);
      if (grid.terrain[i] === Terrain.Rock && !usedRock.has(i)) out.push({ kind: 'ky_thach', x, y });
    }

  // Cỏ trống: cây thưa, tránh sát đường và công trình để không che khuất.
  const blocked = (i: number) => grid.road[i] === 1 || grid.occupant[i] !== -1;
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++) {
      const i = grid.idx(x, y);
      if (grid.terrain[i] !== Terrain.Grass || blocked(i) || grid.vein[i]) continue;
      const nearWater = near(grid, x, y, (j) => grid.terrain[j] === Terrain.Water);
      const r = hash(x, y, 1);
      if (nearWater) {
        if (r < 0.35) out.push({ kind: 'lau_say', x, y });
        continue;
      }
      if (near(grid, x, y, blocked) || r > 0.11) continue;
      const k = hash(x, y, 2);
      out.push({ kind: k < 0.42 ? 'tung' : k < 0.72 ? 'truc' : k < 0.9 ? 'dao' : 'ky_thach', x, y });
    }
  return out;
}

/** Tạo sprite cho một vật trang trí, neo vào ô theo hướng camera. */
export function makeDecorSprite(item: DecorItem): THREE.Sprite {
  const spec = DECOR[item.kind];
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(mat);
  const f = spec.footprint;
  // Neo: vật 1×1 đứng ở tâm ô; vách 2×2 lấy góc trước (gần camera) của khối làm đáy ảnh.
  const ground = f === 1 ? new THREE.Vector3(item.x + 0.5, 0, item.y + 0.5) : new THREE.Vector3(item.x + f, 0, item.y + f);
  sprite.position.copy(ground);
  sprite.renderOrder = 100 + item.x + f + item.y + f; // cùng thứ tự họa sĩ với công trình
  sprite.visible = false;
  mat.map = loadSpriteTexture(spec.url, (tex) => {
    const img = tex.image as { width: number; height: number };
    const aspect = img.height / img.width;
    const w = spec.byWidth ? spec.size : spec.size / aspect;
    sprite.scale.set(w, w * aspect, 1);
    sprite.center.set(0.5, spec.anchorY);
    mat.needsUpdate = true;
    sprite.visible = true;
  });
  return sprite;
}

/**
 * Phông núi xa: một sprite lớn neo ở góc sau bản đồ trên màn hình, nhưng lùi sâu ra sau theo hướng nhìn
 * (`toCamera` = vector đơn vị từ cảnh tới camera) để mặt ô che nó bằng độ sâu thật.
 * Cần vậy vì three.js luôn vẽ vật trong suốt sau vật đục, renderOrder không đưa nó ra sau được.
 */
export function makeBackdrop(grid: Grid, toCamera: THREE.Vector3): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: true, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(mat);
  sprite.center.set(0.5, 0.4); // phần sương ở chân ảnh nằm sau mặt bản đồ, chỉ lộ ra hai bên
  sprite.position.set(-1, 0, -1).addScaledVector(toCamera, -45); // cùng chỗ trên màn hình, sâu hơn mọi ô
  sprite.visible = false;
  mat.map = loadSpriteTexture('sprites/nui_xa.webp', (tex) => {
    const img = tex.image as { width: number; height: number };
    const w = Math.max(grid.width, grid.height) * 2.1;
    sprite.scale.set(w, (w * img.height) / img.width, 1);
    mat.needsUpdate = true;
    sprite.visible = true;
  });
  return sprite;
}
