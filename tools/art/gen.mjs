#!/usr/bin/env node
/**
 * Pipeline đồ họa AI — bước "AI vẽ" (GDD 3.4).
 * Đưa ảnh nét viền + ảnh sáng tối của khối thô cho Gemini (Nano Banana) vẽ lại thành công trình thủy mặc.
 *
 * Chuẩn bị: tạo file .env ở gốc repo:  GEMINI_API_KEY=...   (file .env đã nằm trong .gitignore)
 * Chạy:
 *   npm run art:gen -- --b chinhDien --n 4
 *   npm run art:gen -- --b chinhDien --model gemini-3.1-flash-image
 *   npm run art:gen -- --list          # liệt kê model ảnh mà khóa của bạn dùng được
 * Kết quả: art/generated/<loai>/<thoi-gian>-<i>.png và trang so sánh art/generated/index.html
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3-pro-image-preview'; // Nano Banana Pro; bản nhanh/rẻ: gemini-3.1-flash-image

// ---------- tham số ----------
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const type = arg('b', 'chinhDien');
const count = Number(arg('n', '4'));
const model = arg('model', process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL);

// ---------- khóa API từ .env ----------
function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv();
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('Thiếu GEMINI_API_KEY. Tạo file .env ở gốc repo với dòng: GEMINI_API_KEY=khoa_cua_ban');
  process.exit(1);
}
const headers = { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' };

/** Đọc JSON; nếu máy chủ/proxy trả về chữ thường thì gói lại thành lỗi dễ đọc. */
async function readJson(r) {
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 300) } };
  }
}

if (args.includes('--list')) {
  const r = await fetch(`${API}/models?pageSize=500`, { headers });
  const j = await readJson(r);
  if (!r.ok) { console.error(j); process.exit(1); }
  const names = j.models.map((m) => m.name.replace('models/', '')).filter((n) => /image|banana/i.test(n));
  console.log(names.join('\n') || '(không thấy model ảnh nào)');
  process.exit(0);
}

// ---------- prompt ----------
const STYLE = fs.readFileSync(path.join(ROOT, 'tools/art/style-prompt.md'), 'utf8');
const SUBJECTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/art/subjects.json'), 'utf8'));
const subject = SUBJECTS[type];
if (!subject) {
  console.error(`Không có mô tả cho "${type}" trong tools/art/subjects.json`);
  process.exit(1);
}
const prompt = `${STYLE}\n\n## Subject\n${subject}`;

const img = (file) => ({
  inline_data: { mime_type: 'image/png', data: fs.readFileSync(path.join(ROOT, 'art/blockout', file)).toString('base64') },
});

// ---------- gọi API ----------
async function generateOnce() {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { text: 'Image 1 — LINE DRAWING (follow this silhouette, proportions and camera angle exactly):' },
          img(`${type}_line.png`),
          { text: 'Image 2 — TONAL REFERENCE (light and shadow only, do NOT copy its flat colors):' },
          img(`${type}_shade.png`),
        ],
      },
    ],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
  };
  const r = await fetch(`${API}/models/${model}:generateContent`, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await readJson(r);
  if (!r.ok) {
    const msg = j?.error?.message ?? JSON.stringify(j);
    throw new Error(`HTTP ${r.status}: ${msg}${r.status === 404 ? '\n→ Thử: npm run art:gen -- --list' : ''}`);
  }
  const parts = j.candidates?.[0]?.content?.parts ?? [];
  const data = parts.find((p) => p.inlineData || p.inline_data);
  if (!data) throw new Error('Không nhận được ảnh. Phản hồi: ' + JSON.stringify(j).slice(0, 400));
  return Buffer.from((data.inlineData ?? data.inline_data).data, 'base64');
}

const outDir = path.join(ROOT, 'art/generated', type);
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
console.log(`Model: ${model} · ${type} · ${count} ảnh`);
for (let i = 1; i <= count; i++) {
  try {
    const buf = await generateOnce();
    const file = path.join(outDir, `${stamp}-${i}.png`);
    fs.writeFileSync(file, buf);
    console.log(`  ✓ ${path.relative(ROOT, file)}`);
  } catch (e) {
    console.error(`  ✗ ảnh ${i}: ${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ''}`);
    if (String(e.message).includes('HTTP 4')) break;
  }
}

// ---------- trang so sánh ----------
const gen = path.join(ROOT, 'art/generated');
const rows = fs
  .readdirSync(gen, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const files = fs.readdirSync(path.join(gen, d.name)).filter((f) => f.endsWith('.png')).sort().reverse();
    const cells = files.map((f) => `<figure><img src="${d.name}/${f}"><figcaption>${f}</figcaption></figure>`).join('');
    return `<h2>${d.name}</h2><div class="row"><figure><img src="../blockout/${d.name}_line.png"><figcaption>khối thô</figcaption></figure>${cells}</div>`;
  })
  .join('');
fs.writeFileSync(
  path.join(gen, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Art spike</title><style>body{font-family:serif;background:#EFE6D2;margin:16px}.row{display:flex;gap:12px;overflow-x:auto}figure{margin:0;background:#fff;padding:6px}img{width:280px;height:280px;object-fit:contain;display:block}figcaption{font-size:11px;color:#5A564E}</style><h1>Art spike — Mặc Họa Tiên Thành</h1>${rows}`,
);
console.log(`Xem: ${path.relative(ROOT, path.join(gen, 'index.html'))}`);
