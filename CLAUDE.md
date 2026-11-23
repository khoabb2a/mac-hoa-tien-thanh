# CLAUDE.md — Mặc Họa Tiên Thành

Hướng dẫn cho Claude Code khi làm việc trong repo này. GDD đầy đủ: https://claude.ai/artifact/C2RKDi6kdrZM2oGEKfad6W (tóm tắt: `docs/GDD.md`).

Hướng phát triển: chiến thuật bản đồ chung kiểu Rise of Kingdoms, chủ đề tiên hiệp, giữ mỹ thuật thủy mặc hiện tại. Thiết kế bản đồ vùng và các quyết định đã chốt: `docs/THIET-KE-BAN-DO-VUNG.md`; nghĩa thuật ngữ: `GLOSSARY.md`. Skill quy trình (Matt Pocock, MIT) ở `.agents/skills/`, liên kết sang `.claude/skills/`.

## Nguyên tắc kiến trúc
- `src/sim/` là logic thuần: **không import Three.js, DOM hay Preact**. Mọi luật chơi nằm ở đây và phải có test (`*.test.ts`, Vitest).
- Mô phỏng chạy trong **Web Worker** (`platform/simWorker.ts` → `sim/simCore.ts`). Luồng chính giữ bản sao `World` thụ động (`passive = true`) để vẽ và xem trước; mọi hành động đi qua `sim.act(Action)` (`sim/protocol.ts`): áp ngay lên bản sao rồi gửi sang Worker, ảnh chụp từ Worker thay bản sao bằng `applySave`. Không có Worker thì chạy tại chỗ.
- Thêm hành động mới = thêm một nhánh vào `Action` + `applyAction`; không gọi thẳng `world.build(...)` từ render/ui.
- Ngẫu nhiên trong luật chơi chỉ dùng `world.rng` (lưu được), không dùng `Math.random`, để Worker, bản lưu và test cho cùng kết quả.
- `src/render/` chỉ đọc trạng thái sim để vẽ; không chứa luật chơi.
- `src/ui/` là HUD Preact; gọi sim qua `World`, không chạm vào Three.js.
- Nhiệm vụ (Thiên Đạo Lệnh, `sim/quests.ts`) đo thẳng từ trạng thái World; chỉ World không thụ động mới thưởng (Worker là nguồn chuẩn); `questsOn` chỉ bật cho ván chơi thật nên World dựng tay trong test không bị thưởng chen vào.
- Đơn vị thời gian là **tiết khí** (`sim/time.ts`), không dùng ngày/giờ thực trong luật chơi. Hành quân dùng giây thời gian game (`clock.elapsed`), cùng đồng hồ nên tạm dừng/Ngự phong áp lên cả đội.
- Bản đồ vùng (mốc 1): `sim/region.ts` (địa hình, mỏ, tìm đường A*), `sim/expedition.ts` (Đạo Đội, lịch trình tính trọn khi ra lệnh; vị trí/hành trang là hàm của thời gian). Hành trang chỉ vào kho khi đội về tới cổng, đúng một lần (`World.settleExpeditions`). Vẽ: `render/regionScene.ts` dùng chung renderer qua `IsoScene.setExternal`. Đặc tả: `docs/specs/moc-1-xuat-hanh.md`.

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
- Mặt ô địa hình: `render/terrainMaterial.ts` lấy mẫu texture theo tọa độ thế giới (liền mạch giữa các ô), chọn lớp bằng `aLayer`.
- Sprite (công trình, cây, đá) vẽ theo thứ tự họa sĩ: `depthTest: false`, `renderOrder = 100 + x + w + y + h`.
- three.js luôn vẽ vật trong suốt SAU vật đục, `renderOrder` không đưa được sprite ra sau mặt ô: muốn nằm sau thì lùi sâu theo hướng nhìn và bật `depthTest` (xem phông núi `makeBackdrop`).
- Nhà phàm trần (`render/houses.ts`): có `public/sprites/houses/<vùng>.json` thì dùng sprite (hàng = cấp), chưa có thì khối thô. Bề ngang theo nhà rộng nhất trong sheet (= bề ngang ô); đáy ảnh neo về góc trước ô theo độ phủ.
- Vật trang trí (`render/terrainArt.ts`) chỉ để nhìn, không phải luật chơi: vị trí, biến thể, lật và co giãn đều suy ra từ ô bằng hàm băm cố định.
- Biến thể: `public/sprites/decor/<loai>.json` (sinh bởi `tools/art/sheet.py`) — kích thước theo pixel gốc, vật lớn nhất trong sheet = `size` của loại đó. Cây/đá cắt với `--holes-min 4` (kẽ lá trắng kín); sheet nhà không dùng (giữ tường vôi).

## Lệnh
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
- Thử nghiệm: mở `?debug` → `window.__debug.advance(n)` tua n tiết khí, `__debug.tile(x, y)` ra tọa độ màn hình, `__debug.stats()`.
- Chạy `npm test` và `npm run build` trước khi commit.
