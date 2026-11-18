import * as THREE from 'three';
import type { BuildingType } from '../../sim/grid';
import { inkMaterial, withInkEdges } from '../inkMaterial';
import { PALETTE } from '../palette';
import { curvedRoof } from './roof';

/**
 * Khối thô (blockout) dựng bằng code. Vai trò kép:
 *  1. Hiển thị tạm trong prototype.
 *  2. Đầu vào cho pipeline AI (GDD 3.4): render nét + độ sâu → ControlNet → sprite thủy mặc.
 * Gốc tọa độ: góc (0,0) của footprint, mỗi ô = 1 đơn vị.
 */
const M = {
  stone: () => inkMaterial(PALETTE.paperDeep, PALETTE.inkDam),
  wall: () => inkMaterial('#F3ECDC', PALETTE.inkDam),
  roof: () => inkMaterial(PALETTE.inkTrong, PALETTE.inkNung),
  pillar: () => inkMaterial(PALETTE.chuSa, '#7A2019'),
  jade: () => inkMaterial(PALETTE.thanhLuc, PALETTE.thanhLucDeep),
  gold: () => inkMaterial(PALETTE.dangHoang, '#7C6229'),
};

function part(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, edges = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return edges ? withInkEdges(m) : m;
}

function pillars(group: THREE.Group, cx: number, cz: number, halfW: number, z: number, y0: number, h: number, n: number) {
  const geo = new THREE.CylinderGeometry(0.045, 0.05, h, 8);
  const mat = M.pillar();
  for (let i = 0; i < n; i++) {
    const x = cx - halfW + (2 * halfW * i) / (n - 1);
    group.add(part(geo, mat, x, y0 + h / 2, cz + z, false));
  }
}

function hall(): THREE.Group {
  const g = new THREE.Group();
  const c = 1.5;
  g.add(part(new THREE.BoxGeometry(2.7, 0.28, 2.5), M.stone(), c, 0.14, c));
  g.add(part(new THREE.BoxGeometry(0.9, 0.14, 0.35), M.stone(), c, 0.07, c + 1.4));
  g.add(part(new THREE.BoxGeometry(2.0, 0.85, 1.5), M.wall(), c, 0.28 + 0.425, c - 0.1));
  pillars(g, c, c, 0.95, 0.72, 0.28, 0.85, 6);
  const roof1 = part(curvedRoof(1.5, 1.12, 0.5), M.roof(), c, 1.13, c - 0.05);
  g.add(roof1);
  g.add(part(new THREE.BoxGeometry(1.15, 0.35, 0.8), M.wall(), c, 1.5, c - 0.05));
  g.add(part(curvedRoof(0.95, 0.68, 0.42), M.roof(), c, 1.67, c - 0.05));
  g.add(part(new THREE.SphereGeometry(0.06, 8, 6), M.gold(), c, 2.12, c - 0.05, false));
  return g;
}

function quarters(): THREE.Group {
  const g = new THREE.Group();
  const c = 1;
  g.add(part(new THREE.BoxGeometry(1.7, 0.16, 1.5), M.stone(), c, 0.08, c));
  g.add(part(new THREE.BoxGeometry(1.25, 0.6, 1.0), M.wall(), c, 0.16 + 0.3, c));
  pillars(g, c, c, 0.6, 0.55, 0.16, 0.6, 4);
  g.add(part(curvedRoof(0.95, 0.78, 0.42, 0.25), M.roof(), c, 0.76, c));
  return g;
}

function qiArray(): THREE.Group {
  const g = new THREE.Group();
  const c = 1;
  g.add(part(new THREE.CylinderGeometry(0.92, 0.95, 0.1, 32), M.stone(), c, 0.05, c));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 6, 48), M.jade());
  ring.rotation.x = Math.PI / 2;
  ring.position.set(c, 0.12, c);
  ring.name = 'spin';
  g.add(ring);
  g.add(part(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 6), M.jade(), c, 0.45, c));
  g.add(part(new THREE.OctahedronGeometry(0.12), M.gold(), c, 0.95, c));
  return g;
}

function herbGarden(): THREE.Group {
  const g = new THREE.Group();
  const bed = new THREE.BoxGeometry(1.6, 0.08, 0.32);
  const soil = inkMaterial(PALETTE.inkDam, PALETTE.inkTrong);
  const leaf = M.jade();
  for (let i = 0; i < 4; i++) {
    const z = 0.3 + i * 0.45;
    g.add(part(bed, soil, 1, 0.04, z, false));
    for (let k = 0; k < 6; k++) {
      g.add(part(new THREE.ConeGeometry(0.07, 0.18, 5), leaf, 0.35 + k * 0.26, 0.17, z, false));
    }
  }
  return g;
}

export function buildBlockout(type: BuildingType): THREE.Group {
  switch (type) {
    case 'chinhDien':
      return hall();
    case 'tinhXa':
      return quarters();
    case 'tuLinhTran':
      return qiArray();
    case 'duocVien':
      return herbGarden();
  }
}
