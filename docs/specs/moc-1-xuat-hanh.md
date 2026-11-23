# Đặc tả mốc 1 — Xuất hành và trở về

Căn cứ: `docs/THIET-KE-BAN-DO-VUNG.md` (mục "Quyết định của chủ dự án" và "Tài nguyên"), `GLOSSARY.md`.

## Mục tiêu người chơi

Từ Động Phủ mở **Bản đồ vùng**, cử một **Đạo Đội** tới **mỏ linh thạch**, thấy đội đi và khai thác, đổi đích hoặc gọi về giữa đường, rồi nhận linh thạch **đúng một lần** khi đội về tới Động Phủ. Chơi trọn vòng trong khoảng 10 phút, trên màn dọc.

## Luật (phần `src/sim/`)

1. **Bản đồ vùng** 40×40 ô, địa hình: đất trống (đi được), núi đá và suối (không đi được). Động Phủ chiếm 3×3 ô; đội ra vào qua **cổng** trước Động Phủ. Có một dãy núi với **khe núi** hẹp và một suối có **chỗ cạn** qua được, để có tuyến ngắn và tuyến vòng.
2. **Điểm khai thác**: mỗi điểm có loại tài nguyên (mốc 1: `linhThach`), trữ lượng còn lại. Hết trữ lượng thì biến mất. Mỗi điểm chỉ một Đạo Đội khai thác cùng lúc.
3. **Đạo Đội**: hai đội, mỗi đội một Hộ pháp; tốc độ hành quân (ô/giây thời gian game), sức chở, tốc độ khai thác. Đội giữ nguyên danh tính khi đổi lệnh.
4. **Lịch trình**: khi ra lệnh, mô phỏng tính trọn các chặng: *đi* (đường đi 8 hướng, tránh ô chặn, không cắt góc núi) → *khai thác* (lượng = min(sức chở còn trống, trữ lượng)) → *về*. Vị trí và hành trang tại thời điểm t là hàm của lịch trình. Thời gian là thời gian game (`clock.elapsed`): tạm dừng thì đội đứng yên, Ngự phong thì đi nhanh gấp ba.
5. **Đổi đích** (ra lệnh xuất hành khi đội đang ngoài): cắt lịch trình tại thời điểm hiện tại, đi tiếp từ đúng vị trí đang đứng. Đang khai thác dở thì phần đã khai giữ trong hành trang và trừ vào trữ lượng điểm ngay.
6. **Gọi về**: như đổi đích, đích là Động Phủ.
7. **Thưởng**: hành trang vào kho **chỉ khi đội về tới cổng Động Phủ**, đúng một lần; đội trở lại trạng thái ở nhà, đếm số chuyến.
8. **Lệnh không hợp lệ** có lý do: không có đường đi; điểm đã hết; điểm đang có đội khác; đội đã ở nhà mà gọi về; hành trang đã đầy mà cử đi khai thác.
9. **Lưu**: Đạo Đội (lịch trình, hành trang, số chuyến) và trữ lượng các điểm nằm trong bản lưu (trường tùy chọn). Tải lại giữa chuyến cho đúng vị trí và kết quả. Bản lưu cũ không có các trường này thì nhận bản đồ và đội mặc định.
10. Chỉ World không thụ động mới trừ trữ lượng và cộng thưởng (Worker là nguồn chuẩn). Bản sao thụ động chỉ vẽ lịch trình.

## Giao diện

- Chip **域 Bản đồ vùng / 府 Động Phủ** chuyển cảnh. Camera, kéo, chụm giống Động Phủ.
- Trên bản đồ: Động Phủ (họa bản Chính Điện), mỏ linh thạch (kỳ thạch + triện 石), Đạo Đội (triện 隊 màu thanh lục), đường đang đi **nét liền**, đường xem trước **nét đứt**.
- Dải Đạo Đội ở dưới: chạm để chọn đội. Thẻ đội: trạng thái, thời gian còn lại, hành trang, nút **Gọi về**.
- Chạm mỏ: thẻ mỏ (trữ lượng, thời gian đi, lượng sẽ khai) + nút **Xuất hành** / **Đổi đích**, hoặc lý do không đi được.
- Đội về: thông báo "+N linh thạch".
- Thiên Đạo Lệnh thêm lệnh "Chuyến xuất hành đầu tiên" sau lệnh quy hoạch Phàm Cư.
- Song ngữ đủ; nút ≥ 44 px.

## Ngoài phạm vi mốc 1

Tiếp tế, giao tranh và đánh chặn, linh thú, các tài nguyên khác, luyện quân, binh chủng, máy chủ.

## Việc (tracer bullet, mỗi việc demo được)

| # | Việc | Nghiệm thu | Phụ thuộc |
|---|---|---|---|
| 1 | Bản đồ vùng + tìm đường (`sim/region.ts`) | Test: có đường qua khe núi, chỗ cạn; ô chặn không đi được; không cắt góc | – |
| 2 | Lịch trình Đạo Đội (`sim/expedition.ts`) | Test: thời gian đến, lượng khai, vị trí theo t, đổi đích giữa chặng, gọi về giữa khai thác | 1 |
| 3 | World + Action `dispatch`/`recall` + lưu/tải | Test: thưởng đúng một lần, bản sao thụ động không thưởng, tải lại giữa chuyến, bản lưu cũ | 2 |
| 4 | Cảnh bản đồ vùng (render) | Mở được, thấy Động Phủ, mỏ, đội đi theo lịch trình | 3 |
| 5 | HUD: chuyển cảnh, dải đội, thẻ mỏ/đội, xem trước, thông báo, lệnh mới | Chơi trọn vòng trên khung 375×667, hai ngôn ngữ | 4 |
