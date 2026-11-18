import vi from './vi.json';
import en from './en.json';

export type Lang = 'vi' | 'en';
type Dict = Record<string, string>;
const DICTS: Record<Lang, Dict> = { vi, en };
const STORAGE_KEY = 'mhtt.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    /* storage có thể bị chặn */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

let current: Lang = initialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* bỏ qua */
  }
  for (const fn of listeners) fn();
}

export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Tra chữ theo khóa; thiếu bản dịch thì rơi về tiếng Việt, rồi về chính khóa. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? DICTS.vi[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Dùng trong test/CI: liệt kê khóa có ở tiếng Việt mà thiếu ở tiếng Anh. */
export function missingKeys(): string[] {
  return Object.keys(DICTS.vi).filter((k) => !(k in DICTS.en));
}
