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
