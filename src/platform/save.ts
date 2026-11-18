import type { WorldSave } from '../sim/world';

/**
 * Lưu game vào IndexedDB của trình duyệt (GDD 3.3). Một ô lưu duy nhất "auto".
 * Mọi lỗi (chế độ riêng tư, hết dung lượng) đều được nuốt: game vẫn chơi được, chỉ không lưu.
 */
const DB = 'mac-hoa-tien-thanh';
const STORE = 'saves';
const SLOT = 'auto';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export async function saveGame(data: WorldSave): Promise<boolean> {
  try {
    await tx('readwrite', (s) => s.put({ savedAt: Date.now(), data }, SLOT));
    return true;
  } catch {
    return false;
  }
}

export async function loadGame(): Promise<WorldSave | null> {
  try {
    const rec = (await tx('readonly', (s) => s.get(SLOT))) as { data: WorldSave } | undefined;
    return rec?.data ?? null;
  } catch {
    return null;
  }
}

export async function clearGame(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(SLOT));
  } catch {
    /* bỏ qua */
  }
}

/** Tải bản lưu thành file JSON để sao lưu hoặc chuyển máy. */
export function exportGame(data: WorldSave): void {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mac-hoa-tien-thanh-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Đọc file JSON người chơi chọn. */
export function readSaveFile(file: File): Promise<WorldSave> {
  return file.text().then((t) => JSON.parse(t) as WorldSave);
}
