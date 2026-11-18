#!/usr/bin/env node
/**
 * Sinh tools/art/PROMPTS.md: prompt dán tay vào Gemini app / AI Studio, mỗi công trình một khối.
 * Nguồn: style-prompt.md + subjects.json (sửa ở đó rồi chạy lại: npm run art:prompts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const style = fs.readFileSync(path.join(DIR, 'style-prompt.md'), 'utf8').trim();
const subjects = JSON.parse(fs.readFileSync(path.join(DIR, 'subjects.json'), 'utf8'));

let md = `# Prompt vẽ tay bằng Gemini — Mặc Họa Tiên Thành

Tệp này được sinh tự động từ \`style-prompt.md\` + \`subjects.json\`. Đừng sửa trực tiếp; sửa nguồn rồi chạy \`npm run art:prompts\`.

## Cách dùng
1. Mở Gemini (gemini.google.com, chọn chế độ tạo ảnh) hoặc Google AI Studio với model ảnh (Nano Banana).
2. Đính kèm **hai ảnh theo đúng thứ tự**: \`art/blockout/<loai>_line.png\` trước, \`art/blockout/<loai>_shade.png\` sau.
3. Dán nguyên khối prompt của công trình đó (bấm nút copy ở góc khối trên GitHub).
4. Tạo 3–4 lần, lưu ảnh đẹp vào \`art/generated/<loai>/\` hoặc gửi thẳng cho Claude.
5. Nếu AI vẽ lệch hình khối, gửi thêm: *"Keep the exact silhouette and camera angle of Image 1. Redraw."*

`;

for (const [key, subject] of Object.entries(subjects)) {
  md += `## ${key}

Ảnh đính kèm: \`art/blockout/${key}_line.png\` (Image 1), \`art/blockout/${key}_shade.png\` (Image 2)

\`\`\`text
${style}

## Subject
${subject}

Image 1 is the LINE DRAWING: follow its silhouette, proportions and camera angle exactly.
Image 2 is the TONAL REFERENCE: use only its light and shadow, do NOT copy its flat colors.
Output a square 1:1 image.
\`\`\`

`;
}

fs.writeFileSync(path.join(DIR, 'PROMPTS.md'), md);
console.log('Đã ghi tools/art/PROMPTS.md');

// ---------- địa hình: TERRAIN_PROMPTS.md ----------
const terrain = JSON.parse(fs.readFileSync(path.join(DIR, 'terrain.json'), 'utf8'));
const styleSrc = fs.readFileSync(path.join(DIR, 'style-terrain.md'), 'utf8');
const styleOf = (kind) => {
  const m = styleSrc.match(new RegExp(`## ${kind}\\n([\\s\\S]*?)(?=\\n## |$)`));
  if (!m) throw new Error(`style-terrain.md thiếu khối "## ${kind}"`);
  return m[1].trim();
};
const KIND_VI = { backdrop: 'Phông núi', object: 'Vật thể isometric', texture: 'Texture mặt ô' };

let tmd = `# Prompt địa hình — Mặc Họa Tiên Thành

Sinh tự động từ \`terrain.json\` + \`style-terrain.md\` (\`npm run art:prompts\`). Đừng sửa trực tiếp.

## Cách dùng
1. Vẽ **ưu tiên 1** trước (6 ảnh): đủ để thay toàn bộ địa hình khối hiện tại. Ưu tiên 2 là cây/đá trang trí thêm.
2. **Vật thể** (cây, đá, vách): đính kèm đúng ảnh khung ghi bên dưới (\`art/blockout/guide_*.png\`) rồi dán prompt.
3. **Texture** và **phông núi**: không cần đính kèm ảnh, chỉ dán prompt. Chọn đúng tỉ lệ khung ghi bên dưới nếu app cho chọn.
4. Gửi ảnh cho Claude, ghi kèm tên (vd. \`tung\`, \`mat_nuoc\`).

| Tên | Loại | Ưu tiên | Dùng trong game |
| --- | --- | --- | --- |
`;
const entries = Object.entries(terrain).sort((a, b) => a[1].priority - b[1].priority);
for (const [key, a] of entries) tmd += `| \`${key}\` | ${KIND_VI[a.kind]} | ${a.priority} | ${a.use} |\n`;
tmd += '\n';

for (const [key, a] of entries) {
  const attach = a.guide ? `Đính kèm: \`art/blockout/${a.guide}\` (Image 1)` : 'Không đính kèm ảnh';
  const aspect = a.aspect ?? '1:1';
  const tail =
    a.kind === 'object'
      ? 'Image 1 is the PLACEMENT GUIDE only — do not draw it.\nOutput a square 1:1 image.'
      : a.kind === 'texture'
        ? 'Output a square 1:1 seamless tileable texture.'
        : `Output a wide ${aspect} image.`;
  tmd += `## ${key} — ${a.use}

Ưu tiên ${a.priority} · Tỉ lệ ${aspect} · ${attach}

\`\`\`text
${styleOf(a.kind)}

## Subject
${a.subject}

${tail}
\`\`\`

`;
}
fs.writeFileSync(path.join(DIR, 'TERRAIN_PROMPTS.md'), tmd);
console.log('Đã ghi tools/art/TERRAIN_PROMPTS.md');

// ---------- sprite sheet 3×3: SHEET_PROMPTS.md ----------
const sheetStyle = styleOf('sheet');
let smd = `# Prompt sprite sheet 3×3 — Mặc Họa Tiên Thành

Sinh tự động từ \`terrain.json\` (trường \`variants\`) + \`style-terrain.md\` (\`npm run art:prompts\`). Đừng sửa trực tiếp.

Mỗi sheet cho 9 biến thể của một loại cây/đá. Game bốc ngẫu nhiên một biến thể cho mỗi ô và lật trái/phải, nên cảnh không lặp lại.

## Cách dùng
1. Đính kèm đúng ảnh khung ghi dưới mỗi mục (\`art/blockout/sheet_guide_*.png\`), dán prompt, khung 1:1.
2. Kiểm tra: đủ 9 vật, mỗi vật nằm gọn trong ô của nó, không vẽ khung. Hàng trên to, hàng dưới nhỏ.
3. Gửi ảnh cho Claude kèm tên (vd. \`tung\`). Claude cắt bằng \`python tools/art/sheet.py art/source/tung_sheet_v1.png tung\`.

`;
for (const [key, a] of Object.entries(terrain)) {
  if (!a.variants) continue;
  const list = a.variants.map((v, i) => `${i + 1}. ${v}`).join('\n');
  smd += `## ${key} — ${a.use}

Đính kèm: \`art/blockout/${a.sheetGuide}\` (Image 1) · Tỉ lệ 1:1

\`\`\`text
${sheetStyle}

## Subject
${a.sheetSubject ?? a.subject}

The nine cells, left to right, top to bottom:
${list}

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
\`\`\`

`;
}
fs.writeFileSync(path.join(DIR, 'SHEET_PROMPTS.md'), smd);
console.log('Đã ghi tools/art/SHEET_PROMPTS.md');

// ---------- nhà phàm trần (sheet 3×3, hàng = cấp): thêm vào SHEET_PROMPTS.md ----------
const houses = JSON.parse(fs.readFileSync(path.join(DIR, 'houses.json'), 'utf8'));
const houseStyle = sheetStyle
  .replace(/Size variety:[^\n]*\n/, 'Size by ROW, not by column: row 1 = level 1 (smallest), row 2 = level 2, row 3 = level 3 (largest), exactly as described below. Within each row the three buildings are similar in size but different in design.\n')
  .replace('the same kind of object', 'the same kind of building, in three upgrade levels');
let hmd = `\n# Nhà phàm trần — sheet 3×3 (hàng = cấp nhà)

Ba sheet cho ba vùng Tam Tài Khí. Khác sheet cây đá: **hàng trên là nhà cấp 1 (nhỏ nhất), hàng dưới là cấp 3 (lớn nhất)**.
Đính kèm \`art/blockout/sheet_guide_1x1_h12.png\`. Cắt bằng \`python tools/art/sheet.py art/source/cu_sheet_v1.png cu --houses\`.

`;
for (const [key, h] of Object.entries(houses)) {
  hmd += `## nha_${key} — ${h.use}

Đính kèm: \`art/blockout/sheet_guide_1x1_h12.png\` (Image 1) · Tỉ lệ 1:1

\`\`\`text
${houseStyle}

## Subject
${h.subject}

${h.rows.join('\n')}

Image 1 is the LAYOUT GUIDE only — do not draw it.
Output a square 1:1 image.
\`\`\`

`;
}
fs.appendFileSync(path.join(DIR, 'SHEET_PROMPTS.md'), hmd);
console.log('Đã thêm prompt nhà phàm trần vào SHEET_PROMPTS.md');
