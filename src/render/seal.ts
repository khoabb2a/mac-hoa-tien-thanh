import * as THREE from 'three';
import { PALETTE } from './palette';

const cache = new Map<string, THREE.CanvasTexture>();

/** Ấn triện với một chữ Hán, vẽ bằng canvas 2D (mặc định chu sa). Dùng chung theo chữ + màu. */
export function sealTexture(ch: string, color: string = PALETTE.chuSa): THREE.CanvasTexture {
  const key = ch + color;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(10, 10, 108, 108, 16);
  g.fill();
  g.fillStyle = PALETTE.paper;
  g.font = 'bold 76px "Noto Serif SC", "Songti SC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
