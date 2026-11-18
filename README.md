# Mặc Họa Tiên Thành · Ink Immortal City

**VI** — Game mô phỏng xây dựng tông môn tiên hiệp kiểu SimCity, vẽ theo phong cách thủy mặc isometric. Chạy trên web (PWA), ưu tiên chơi bằng điện thoại.

**EN** — A SimCity-style xianxia sect builder in ink-wash isometric art. Runs in the browser as a PWA, mobile-first.

- GDD: [Claude Docs — GDD Mặc Họa Tiên Thành](https://claude.ai/artifact/C2RKDi6kdrZM2oGEKfad6W) · tóm tắt trong [`docs/GDD.md`](docs/GDD.md)
- Trạng thái / Status: **prototype khung** — lưới ô, linh lộ, linh khí lan theo đường, đồng hồ 24 tiết khí, Thiên Nhãn, HUD song ngữ.

## Chạy thử / Run

```bash
npm install
npm run dev        # mở http://localhost:5173 (thêm --host để thử trên điện thoại cùng Wi-Fi)
npm test           # test mô phỏng + kiểm tra đủ bản dịch
npm run build      # kiểm tra kiểu + đóng gói PWA vào dist/
```

## Thao tác / Controls

| Thao tác | Tác dụng |
| --- | --- |
| Kéo một ngón / Drag | Di chuyển bản đồ / Pan |
| Chụm hai ngón, lăn chuột / Pinch, wheel | Phóng to thu nhỏ / Zoom |
| Chạm công trình / Tap a building | Xem thẻ thông tin, lượng linh khí |
| Nút Thiên Nhãn / Heavenly Eye | Bật lớp phủ linh khí / Qi overlay |
| Nút EN / VI | Đổi ngôn ngữ / Switch language |

## Cấu trúc / Layout

```
src/
  sim/        logic mô phỏng thuần TypeScript, không phụ thuộc Three.js (có test)
  render/     Three.js: camera isometric 2:1, shader mực 5 nấc, khối thô công trình
  ui/         HUD Preact (màn dọc, một tay)
  i18n/       vi.json, en.json, glossary.json (bảng thuật ngữ — nguồn duy nhất)
docs/         GDD tóm tắt, ghi chú pipeline đồ họa AI
```

## Mục tiêu thiết bị / Target devices

iPhone SE (2020) và Samsung Galaxy Note 10 trở lên. Máy yếu tự chuyển mức đồ họa "Giản".

## Giấy phép / License

Chưa công bố — mã nguồn riêng tư. / Not yet licensed — private source.

## Pipeline đồ họa AI / AI art pipeline

Toàn bộ hình ảnh do AI vẽ (GDD mục 3.4). Bước hiện có:

1. **Khối thô → ảnh đầu vào** (đã có sẵn trong `art/blockout/`): `npm run dev`, rồi `npm run art:render` (cần Python + Playwright).
2. **AI vẽ bằng Gemini (Nano Banana):**
   ```bash
   cp .env.example .env        # điền GEMINI_API_KEY
   npm run art:gen -- --b chinhDien --n 4
   npm run art:gen -- --list   # xem model ảnh khóa của bạn dùng được
   ```
   Ảnh ra ở `art/generated/<loại>/`, mở `art/generated/index.html` để so với khối thô.
3. Phong cách sửa ở `tools/art/style-prompt.md`; mô tả từng công trình ở `tools/art/subjects.json`.
4. **Không có khóa API?** Dùng prompt dán tay trong [`tools/art/PROMPTS.md`](tools/art/PROMPTS.md) với Gemini app hoặc AI Studio.

Loại có sẵn: `chinhDien`, `tinhXa`, `tuLinhTran`, `duocVien`.
