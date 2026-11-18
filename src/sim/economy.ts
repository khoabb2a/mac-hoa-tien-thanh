import type { BuildingType } from './grid';

/** Giá xây (hạ phẩm linh thạch). Giá trị prototype, sẽ cân bằng lại (GDD mục 6). */
export const BUILD_COST: Record<BuildingType, number> = {
  tuLinhTran: 120,
  chinhDien: 300,
  tinhXa: 80,
  duocVien: 60,
};

export const ROAD_COST = 5;

/** Phá dỡ hoàn lại một nửa giá. */
export const REFUND_RATE = 0.5;

/** Số người mỗi công trình chứa (nhân khẩu). */
export const HOUSING: Partial<Record<BuildingType, number>> = {
  tinhXa: 4,
  chinhDien: 2,
};

/** Dân khởi điểm của Động Phủ. */
export const BASE_POPULATION = 3;

/** Thu nhập mỗi tiết khí: cố định + mỗi công trình có linh khí. */
export const INCOME_BASE = 10;
export const INCOME_PER_POWERED = 5;

/** Thứ tự hiện trong bảng Xây. */
export const BUILD_MENU: BuildingType[] = ['tuLinhTran', 'tinhXa', 'duocVien', 'chinhDien'];
