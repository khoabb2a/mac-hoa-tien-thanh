/** Lưới ô của bản đồ. Logic thuần, không phụ thuộc Three.js (GDD mục 3). */

export const enum Terrain {
  Grass = 0,
  Water = 1,
  Rock = 2,
}

export type BuildingType = 'tuLinhTran' | 'chinhDien' | 'tinhXa' | 'duocVien';

export interface Building {
  id: number;
  type: BuildingType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridSave {
  width: number;
  height: number;
  terrain: number[];
  road: number[];
  vein: number[];
  buildings: Building[];
  nextId: number;
}

export const BUILDING_SIZE: Record<BuildingType, [number, number]> = {
  tuLinhTran: [2, 2],
  chinhDien: [3, 3],
  tinhXa: [2, 2],
  duocVien: [2, 2],
};

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly terrain: Uint8Array;
  /** 1 = có linh lộ. */
  readonly road: Uint8Array;
  /** 1 = mắt linh mạch tự nhiên. */
  readonly vein: Uint8Array;
  /** Chỉ số công trình chiếm ô, -1 nếu trống. */
  readonly occupant: Int32Array;
  readonly buildings: Building[] = [];
  private nextId = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const n = width * height;
    this.terrain = new Uint8Array(n);
    this.road = new Uint8Array(n);
    this.vein = new Uint8Array(n);
    this.occupant = new Int32Array(n).fill(-1);
  }

  idx(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isFree(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    return this.terrain[i] === Terrain.Grass && this.road[i] === 0 && this.occupant[i] === -1;
  }

  canPlace(type: BuildingType, x: number, y: number): boolean {
    const [w, h] = BUILDING_SIZE[type];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (!this.isFree(x + dx, y + dy)) return false;
    return true;
  }

  place(type: BuildingType, x: number, y: number): Building | null {
    if (!this.canPlace(type, x, y)) return null;
    const [w, h] = BUILDING_SIZE[type];
    const b: Building = { id: this.nextId++, type, x, y, w, h };
    this.buildings.push(b);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.occupant[this.idx(x + dx, y + dy)] = b.id;
    return b;
  }

  setRoad(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    if (this.terrain[i] === Terrain.Rock || this.occupant[i] !== -1) return false;
    this.road[i] = 1; // linh lộ đi qua nước = cầu
    return true;
  }

  buildingAt(x: number, y: number): Building | undefined {
    if (!this.inBounds(x, y)) return undefined;
    const id = this.occupant[this.idx(x, y)];
    return id === -1 ? undefined : this.buildings.find((b) => b.id === id);
  }

  removeBuilding(id: number): Building | undefined {
    const k = this.buildings.findIndex((b) => b.id === id);
    if (k === -1) return undefined;
    const [b] = this.buildings.splice(k, 1);
    for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) this.occupant[this.idx(b.x + dx, b.y + dy)] = -1;
    return b;
  }

  clearRoad(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    if (!this.road[i]) return false;
    this.road[i] = 0;
    return true;
  }

  canRoad(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    return this.terrain[i] !== Terrain.Rock && this.occupant[i] === -1;
  }

  toJSON(): GridSave {
    return {
      width: this.width,
      height: this.height,
      terrain: Array.from(this.terrain),
      road: Array.from(this.road),
      vein: Array.from(this.vein),
      buildings: this.buildings.map((b) => ({ ...b })),
      nextId: this.nextId,
    };
  }

  static fromJSON(s: GridSave): Grid {
    const g = new Grid(s.width, s.height);
    g.terrain.set(s.terrain);
    g.road.set(s.road);
    g.vein.set(s.vein);
    for (const b of s.buildings) {
      g.buildings.push({ ...b });
      for (let dy = 0; dy < b.h; dy++) for (let dx = 0; dx < b.w; dx++) g.occupant[g.idx(b.x + dx, b.y + dy)] = b.id;
    }
    g.nextId = s.nextId;
    return g;
  }

  /** Các ô kề cạnh (4 hướng) quanh chu vi một công trình. */
  *perimeter(b: Building): Generator<[number, number]> {
    for (let dx = 0; dx < b.w; dx++) {
      yield [b.x + dx, b.y - 1];
      yield [b.x + dx, b.y + b.h];
    }
    for (let dy = 0; dy < b.h; dy++) {
      yield [b.x - 1, b.y + dy];
      yield [b.x + b.w, b.y + dy];
    }
  }
}
