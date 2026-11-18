/**
 * Bộ sinh số ngẫu nhiên có trạng thái lưu được (mulberry32). Luật chơi chỉ dùng cái này,
 * không dùng Math.random, để: test lặp lại được, và Worker với bản lưu cho cùng một kết quả.
 */
export class Rng {
  state: number;

  constructor(seed = 0x9e3779b9) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
