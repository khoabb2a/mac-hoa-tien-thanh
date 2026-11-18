# CLAUDE.md — Mặc Họa Tiên Thành

Hướng dẫn cho Claude Code khi làm việc trong repo này. GDD đầy đủ: https://claude.ai/artifact/C2RKDi6kdrZM2oGEKfad6W (tóm tắt: `docs/GDD.md`).

## Nguyên tắc kiến trúc
- `src/sim/` là logic thuần: **không import Three.js, DOM hay Preact**. Mọi luật chơi nằm ở đây và phải có test (`*.test.ts`, Vitest). Sau này sim chạy trong Web Worker.
- `src/render/` chỉ đọc trạng thái sim để vẽ; không chứa luật chơi.
- `src/ui/` là HUD Preact; gọi sim qua `World`, không chạm vào Three.js.
- Đơn vị thời gian là **tiết khí** (`sim/time.ts`), không dùng ngày/giờ thực trong luật chơi.

## Song ngữ (bắt buộc)
- Không viết cứng chữ hiển thị trong code. Mọi chuỗi đi qua `t('khoa')` (`src/i18n`).
- Thêm khóa vào **cả** `vi.json` và `en.json`; test `i18n.test.ts` sẽ fail nếu lệch.
- Thuật ngữ tiếng Anh theo `src/i18n/glossary.json`. Tên người bản Anh dùng pinyin.
- UI phải chừa chỗ cho chữ tiếng Anh dài hơn khoảng 30%.

## Thiết bị & hiệu năng
- Sàn: iPhone SE 2020 (A13, 3 GB RAM, màn 4,7") và Galaxy Note 10.
- 60 fps trên Note 10; ≥ 30 fps trên SE ở mức "Giản". Texture tổng ≤ ~150 MB. Tải lần đầu < 8 MB.
- Nút chạm ≥ 44 px, chữ ≥ 12 px. Không có thao tác chỉ dành cho chuột.

## Đồ họa
- Phong cách: thủy mặc, bảng màu trong `src/render/palette.ts`, quy tắc 90/8/2 (giấy+mực / thanh lục / chu sa).
- Toàn bộ hình ảnh do AI vẽ (GDD 3.4). Khối thô trong `src/render/blockout/` là đầu vào cho pipeline AI (ControlNet nét + độ sâu), nên giữ chúng dựng bằng code, có tham số.
- Shader tự viết phải kết thúc bằng `#include <colorspace_fragment>`; màu theo ô dùng thuộc tính `aTint` (không dùng `instanceColor` với ShaderMaterial).

## Lệnh
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
- Chạy `npm test` và `npm run build` trước khi commit.
