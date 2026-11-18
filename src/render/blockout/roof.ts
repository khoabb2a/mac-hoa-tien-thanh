import * as THREE from 'three';

/**
 * Mái cong kiểu đình chùa (mái chảy + đầu đao cong vút), dựng thủ tục.
 * Mỗi mặt mái là lưới (rings × cols): độ cao theo t² (thoải ở diềm, dốc ở nóc),
 * góc mái được nâng lên ở vòng diềm để tạo đầu đao.
 */
export function curvedRoof(halfW: number, halfD: number, height: number, flare = 0.22): THREE.BufferGeometry {
  const rings = 8;
  const cols = 10;
  const ridgeHalfW = Math.max(halfW - halfD * 0.95, 0.05);
  const pos: number[] = [];

  const ringCorner = (t: number) => ({
    w: THREE.MathUtils.lerp(halfW, ridgeHalfW, t),
    d: THREE.MathUtils.lerp(halfD, halfD * 0.04, t),
    y: height * t * t,
  });

  // 4 mặt: mỗi mặt đi từ góc A sang góc B theo chiều kim đồng hồ.
  const sides: Array<(r: { w: number; d: number }, u: number) => [number, number]> = [
    (r, u) => [THREE.MathUtils.lerp(-r.w, r.w, u), r.d], // trước (+z)
    (r, u) => [r.w, THREE.MathUtils.lerp(r.d, -r.d, u)], // phải (+x)
    (r, u) => [THREE.MathUtils.lerp(r.w, -r.w, u), -r.d], // sau (-z)
    (r, u) => [-r.w, THREE.MathUtils.lerp(-r.d, r.d, u)], // trái (-x)
  ];

  for (const side of sides) {
    const grid: THREE.Vector3[][] = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const r = ringCorner(t);
      const row: THREE.Vector3[] = [];
      for (let j = 0; j <= cols; j++) {
        const u = j / cols;
        const [x, z] = side(r, u);
        const edge = Math.abs(u * 2 - 1); // 0 giữa cạnh, 1 ở góc
        const lift = flare * height * Math.pow(edge, 3) * Math.pow(1 - t, 2);
        row.push(new THREE.Vector3(x, r.y + lift, z));
      }
      grid.push(row);
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < cols; j++) {
        const a = grid[i][j], b = grid[i][j + 1], c = grid[i + 1][j + 1], d = grid[i + 1][j];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        pos.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
