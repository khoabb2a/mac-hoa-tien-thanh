/**
 * Đường linh lộ chữ L giữa hai ô: đi ngang trước rồi dọc (GDD 9.2: chạm điểm đầu, chạm điểm cuối).
 * Trả về danh sách ô, gồm cả hai đầu, không trùng lặp.
 */
export function lPath(ax: number, ay: number, bx: number, by: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const sx = Math.sign(bx - ax);
  const sy = Math.sign(by - ay);
  let x = ax;
  let y = ay;
  out.push([x, y]);
  while (x !== bx) {
    x += sx;
    out.push([x, y]);
  }
  while (y !== by) {
    y += sy;
    out.push([x, y]);
  }
  return out;
}
