# GDD tóm tắt — Mặc Họa Tiên Thành

Bản đầy đủ (nguồn chính, luôn mới nhất): https://claude.ai/artifact/C2RKDi6kdrZM2oGEKfad6W
Tệp này chỉ là tóm tắt để code tham chiếu nhanh; khi lệch nhau, GDD trên Claude Docs thắng.

## Quyết định đã chốt (18/11/2026)
| Hạng mục | Quyết định |
| --- | --- |
| Thể loại | City/sect builder tiên hiệp kiểu SimCity, thư giãn, không game over |
| Nền tảng | Web PWA, màn dọc một tay; sàn thiết bị iPhone SE 2020 & Galaxy Note 10 |
| Engine | Three.js (WebGL 2) + TypeScript + Vite + Preact |
| Đồ họa | Thủy mặc isometric 2:1, camera không xoay; địa hình/nước/sương bằng shader mực; công trình là sprite **100% AI vẽ** từ khối thô bằng code |
| Ngôn ngữ | Song ngữ Việt – Anh từ bản đầu |
| Kiếm tiền | Không (giai đoạn đầu): không quảng cáo, không mua trong game |

## Năm trụ cột
1. Bức họa sống · 2. Quy hoạch theo linh khí · 3. Đệ tử có câu chuyện · 4. Thiên đạo phản hồi · 5. Thư giãn, thất bại nhẹ

## Tiến trình
Động Phủ (24×24) → Tiên Trấn (48×48) → Tiên Thành (72×72) → Tiên Quốc (96×96 + châu phụ). MVP = cấp 1–3.

## Hệ thống lõi
- **Thời gian:** 24 tiết khí, 4 phút thực/tiết ở x1; tốc độ Tĩnh tọa / Triển / Ngự phong (0, x1, x3).
- **Hai lớp xây dựng:** phàm trần quy hoạch vùng tự mọc (Phàm Cư, Phường Thị, Linh Điền); tông môn đặt từng công trình và gán đệ tử.
- **Linh khí:** Tụ Linh Trận phát linh khí vào linh lộ; giảm dần theo số bước; đặt trên mắt linh mạch thì mạnh ×2,5. *(đã có trong `src/sim/linhKhi.ts`)*
- **Sát khí** thay ô nhiễm; **linh tuyền** cấp nước theo bán kính.
- **Đệ tử:** linh căn, cảnh giới (Luyện Khí → Nguyên Anh trong MVP), đột phá có Hộ Pháp, lịch luyện bằng Thẻ Ý Chí.
- **Sự kiện:** kỳ ngộ dạng dữ liệu JSON, thảm họa có công trình phòng bị, thiệt hại luôn phục hồi được.

## UX (theo SimCity, chuyển hóa tiên hiệp)
Tam Tài Khí (≈ RCI) · Thiên Nhãn (overlay mực loang) · bong bóng chữ triện · Tu Chân Bách Hiểu (tin) · Trưởng Lão cố vấn · Ngọc Giản (log) · Chuông Tông Môn (thảm họa).

## Lộ trình
| Giai đoạn | Tuần (ước tính) | Cổng |
| --- | --- | --- |
| Art spike: pipeline AI cho 1 công trình, chạy trên máy thật | 1–2 | Chọn cách vẽ |
| Prototype lõi: lưới, linh lộ, vùng, linh khí, tiết khí, lưu game | 3–6 | Vòng lặp vui sau 10 phút |
| Vertical slice: Động Phủ → Tiên Trấn, đệ tử, kỳ ngộ, Thiên Nhãn | 7–10 | 5 người chơi thử thấy ổn |
| MVP: cấp 1–3, 25 công trình, 4 thảm họa, PWA offline | 11–16 | Phát hành thử |

## Việc tiếp theo trong code
- [ ] Công cụ vẽ linh lộ và đặt công trình (đặt hai bước, bóng mờ phong thủy)
- [ ] Lưu game IndexedDB + xuất/nhập JSON
- [ ] Chuyển `World` vào Web Worker
- [ ] Vùng phàm trần tự mọc + Tam Tài Khí
- [ ] Script render khối thô → ảnh nét + độ sâu cho pipeline AI
