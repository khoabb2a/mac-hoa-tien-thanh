/**
 * Render khối thô một công trình thành ảnh đầu vào cho AI (GDD 3.4).
 * Mở: /tools/art/blockout.html?b=chinhDien&mode=line|shade
 *  - line:  nền trắng, mặt trắng, chỉ có nét viền đen → giữ hình khối
 *  - shade: shader mực 5 nấc → gợi ý sáng tối
 * Cùng góc isometric 2:1 với game (phương vị 45°, nghiêng 30°), camera trực giao, khung vuông.
 */
import * as THREE from 'three';
import { buildBlockout } from '../../src/render/blockout/buildings';
import type { BuildingType } from '../../src/sim/grid';

const params = new URLSearchParams(location.search);
const type = (params.get('b') ?? 'chinhDien') as BuildingType;
const mode = params.get('mode') ?? 'line';
const SIZE = 1024;

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE, false);
renderer.setClearColor(0xffffff, 1);

const scene = new THREE.Scene();
const group = buildBlockout(type);
scene.add(group);

if (mode === 'line') {
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const black = new THREE.LineBasicMaterial({ color: 0x000000 });
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = white;
      if (!o.children.some((c) => c instanceof THREE.LineSegments)) {
        o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), black));
      }
    }
    if (o instanceof THREE.LineSegments) o.material = black;
  });
}

// Khung camera ôm vừa công trình, chừa lề 12%.
const box = new THREE.Box3().setFromObject(group);
const center = box.getCenter(new THREE.Vector3());
const az = Math.PI / 4;
const el = Math.PI / 6;
const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
cam.position.copy(center).addScaledVector(dir, 30);
cam.lookAt(center);
cam.updateMatrixWorld();

const corners: THREE.Vector3[] = [];
for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
const inv = cam.matrixWorldInverse;
let half = 0;
for (const c of corners) {
  const p = c.clone().applyMatrix4(inv);
  half = Math.max(half, Math.abs(p.x), Math.abs(p.y));
}
half *= 1.12;
cam.left = -half;
cam.right = half;
cam.top = half;
cam.bottom = -half;
cam.updateProjectionMatrix();

renderer.render(scene, cam);
document.body.dataset.ready = '1';
