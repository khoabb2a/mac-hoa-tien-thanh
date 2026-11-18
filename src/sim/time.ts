/**
 * Thời gian trong game đo bằng 24 tiết khí (GDD mục 4).
 * Ở tốc độ x1, mỗi tiết khí kéo dài 4 phút thực; một năm ≈ 1,6 giờ.
 */
export const SECONDS_PER_TERM = 240;
export const TERMS_PER_YEAR = 24;

/** Khóa i18n của 24 tiết khí, bắt đầu từ Lập Xuân. */
export const TERM_KEYS = [
  'lapXuan', 'vuThuy', 'kinhTrap', 'xuanPhan', 'thanhMinh', 'cocVu',
  'lapHa', 'tieuMan', 'mangChung', 'haChi', 'tieuThu', 'daiThu',
  'lapThu', 'xuThu', 'bachLo', 'thuPhan', 'hanLo', 'suongGiang',
  'lapDong', 'tieuTuyet', 'daiTuyet', 'dongChi', 'tieuHan', 'daiHan',
] as const;
export type TermKey = (typeof TERM_KEYS)[number];

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Tĩnh tọa (dừng) · Triển (x1) · Ngự phong (x3). */
export const SPEEDS = [0, 1, 3] as const;
export type SpeedIndex = 0 | 1 | 2;

export class TietKhiClock {
  /** Tổng số giây trong game đã trôi qua. */
  elapsed = 0;
  speed: SpeedIndex = 1;

  constructor(elapsed = 0) {
    this.elapsed = elapsed;
  }

  /** Tiến đồng hồ theo thời gian thực; trả về số tiết khí vừa chuyển qua. */
  advance(realSeconds: number): number {
    const before = this.termCount;
    this.elapsed += realSeconds * SPEEDS[this.speed];
    return this.termCount - before;
  }

  get termCount(): number {
    return Math.floor(this.elapsed / SECONDS_PER_TERM);
  }

  get termIndex(): number {
    return this.termCount % TERMS_PER_YEAR;
  }

  get termKey(): TermKey {
    return TERM_KEYS[this.termIndex];
  }

  /** Năm bắt đầu từ 1. */
  get year(): number {
    return Math.floor(this.termCount / TERMS_PER_YEAR) + 1;
  }

  /** Tiến độ trong tiết khí hiện tại, 0..1. */
  get termProgress(): number {
    return (this.elapsed % SECONDS_PER_TERM) / SECONDS_PER_TERM;
  }

  get season(): Season {
    const q = Math.floor(this.termIndex / 6);
    return (['spring', 'summer', 'autumn', 'winter'] as const)[q];
  }
}
