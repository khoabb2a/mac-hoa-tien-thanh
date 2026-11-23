# Bản thiết kế chơi thử bản đồ vùng

Căn cứ trên Mặc Họa Tiên Thành ở commit `3ed3654`. Các quy tắc bản đồ vùng là giả định có thể thay đổi sau khi chơi thử. Mục tiêu của bản đầu là xem mạng linh khí có tạo ra quyết định chọn đường và rút lui hay không.

## Một phiên chơi

Người chơi bắt đầu ở Động Phủ hiện có. Nối linh lộ cho công trình, chọn một hộ pháp và cử một Đạo Đội ra vùng núi. Một tuyến đi qua khe núi ngắn nhưng xa nguồn tiếp tế. Tuyến ven suối dài hơn và đi qua một mắt linh mạch có thể giữ được. Người chơi chọn tuyến, đổi lệnh hoặc gọi đội về.

Đạo Đội hoàn thành chuyến đi khi quay lại Động Phủ và bàn giao linh thạch thu được. Sau đó người chơi thấy một nâng cấp mà chuyến đi vừa tài trợ. Lượt tiếp theo thêm một linh thú đang giữ nguồn tiếp tế, để người chơi thử đánh, vòng đường hoặc rút về. Giữ bản đồ và vòng đầu đủ nhỏ để thử toàn bộ trong khoảng 10 phút.

## Quy tắc để kiểm chứng

- Linh khí và linh thạch có đơn vị và mục đích riêng. Phần thưởng chuyến đi đi vào kho linh thạch.
- Đổi đường đang đi bắt đầu từ vị trí hiện tại. Lệnh tới đích không có đường đi (vách núi, nước sâu) bị từ chối ngay khi xem trước và HUD giải thích lý do; nếu đích mất đường giữa chừng, Đạo Đội dừng ở vị trí hợp lệ gần nhất.
- Một Đạo Đội chỉ nhận một mục tiêu chủ động. Lệnh trở về có thể thay lệnh hiện tại.
- Khi mất kết nối nguồn tiếp tế, dự trữ của đội giảm dần. Đội cạn dự trữ chịu giảm tốc và giảm hiệu quả chiến đấu, đồng thời vẫn có thể rút lui.
- Tại cùng một thời điểm, máy chủ xử lý lệnh theo thứ tự đã ghi nhận. Nếu hai đội tranh cùng một điểm, kết quả phải nhất quán cho mọi người chơi.
- Thử hai chế độ trong nhánh cân bằng. Một chế độ dùng cùng luật hành quân nhưng bỏ ảnh hưởng của tiếp tế để xem người chơi có thay đổi lựa chọn tuyến vì cơ chế này hay không.

## Quyết định của chủ dự án (23/11/2026)

Các quyết định này thay cho giả định tương ứng ở trên khi có mâu thuẫn.

1. **Thưởng chỉ ghi khi việc đã xong.** Linh thạch (và mọi vật tư) vào kho khi Đạo Đội khai thác về tới Động Phủ, khi đoàn đánh chiếm trở về, hoặc khi giao dịch hoàn tất. Trong lúc thực hiện, phần thu được chỉ nằm trong hành trang của đội; đội bị diệt hoặc bỏ dở thì không ghi.
2. **"Bị chặn" là bị đánh chặn.** Đội đang hành quân gặp địch trên tuyến (linh thú, sau này là đội người chơi khác) thì kết quả do trận đánh quyết định: thắng thì đi tiếp với quân số còn lại, thua thì rút về hoặc bị diệt. Đích không có đường đi là chuyện khác: lệnh bị từ chối từ đầu (mục quy tắc ở trên).
3. **Trước khi có máy chủ: kết quả xác định ngay khi ra lệnh.** Lúc ra lệnh, mô phỏng tính trọn một *lịch trình* cho Đạo Đội: tuyến đường, mốc thời gian đến nơi, lượng thu, kết quả từng trận (dùng `world.rng` nên lưu và tải lại cho cùng kết quả), thời điểm về. Hình ảnh trên bản đồ chỉ minh họa lịch trình đó: vị trí đội là hàm của thời gian, không mô phỏng từng khung hình. Đổi đích hoặc gọi về thì cắt lịch trình tại thời điểm hiện tại và tính lịch trình mới từ vị trí đó; thế cục đổi (mất nguồn tiếp tế, linh thú mới xuất hiện) cũng tính lại phần chưa diễn ra. Mô hình này chuyển thẳng lên máy chủ được: máy chủ chạy cùng hàm tính lịch trình, giữ đồng hồ chung và chỉ gửi lịch trình cho client.
4. **Bản lưu cũ vẫn đọc được** khi chưa có máy chủ. Trường mới (Đạo Đội, lịch trình, hành trang) là tùy chọn, bản lưu thiếu thì nhận giá trị mặc định.

## Đồ họa và thao tác

Giữ camera trực giao isometric 2:1, nền giấy, núi bằng các lớp mực và tài nguyên họa bản của dự án khi có quyền sử dụng. Ở tầm nhìn gần, hiển thị mái, cây và công trình. Ở tầm nhìn xa, gom vật trang trí, dùng dấu cho Đạo Đội, mắt linh mạch và địa hình chặn đường. Dùng nét liền cho lệnh đang thực thi, nét đứt cho lệnh đang xem trước và hình dấu riêng cho trạng thái thiếu tiếp tế. Khi người chơi chọn một Đạo Đội, thanh dưới hiện đích, thời gian đến dự kiến, tiếp tế và nút gọi về. Thiên Nhãn hiển thị cả nguồn lẫn đoạn đường bị đứt.

## Mô phỏng và chơi mạng

Dùng Three.js, Preact và phần trình bày hiện có để thử vòng PvE cục bộ. Phần mô phỏng Động Phủ đang ở `src/sim/`, đi qua `Action` rồi cập nhật Worker. Phần hành quân cần một giao diện nhỏ cho các thao tác gửi lệnh, tiến thời gian và đọc trạng thái. Chọn đường, di chuyển, tiếp tế, giao tranh và trả thưởng được xử lý phía trong. Kiểm thử qua các thao tác ấy với thời gian giả lập và các kết quả kỳ vọng độc lập.

Khi thử hai người chơi, dùng một máy chủ Node.js cho một vùng và PostgreSQL để lưu trạng thái bền vững. Máy chủ xác thực người có quyền ra lệnh, kiểm tra trạng thái và tính kết quả. Client gửi ý định và nhận thay đổi trạng thái theo vùng nhìn thấy qua WebSocket. Thứ tự sự kiện, mã lệnh chống gửi trùng, ghi phần thưởng nguyên tử và ảnh chụp khi kết nối lại là các trường hợp cần kiểm tra từ phiên thử hai người. Thời gian game một người có thể tua. Trong vùng chung, các hành động dùng cùng một đồng hồ máy chủ.

## Các mốc có thể chơi thử

| Mốc | Phụ thuộc | Cách nghiệm thu |
|---|---|---|
| 1. Xuất hành và trở về | Không | Trên bản đồ vùng, đi đến điểm thu thập, đổi đích giữa đường, về Động Phủ và thấy đúng một lần cộng linh thạch. Tuyến không hợp lệ có giải thích. |
| 2. Tuyến tiếp tế và linh thú | 1 | Đi hai tuyến cho kết quả khác nhau vì tiếp tế. Người chơi thấy thiếu tiếp tế trước khi đội vào trận, có thể rút lui, và hiểu nguyên nhân thắng thua. |
| 3. Hai người trên một vùng | 2 | Hai cửa sổ thấy cùng quyền kiểm soát một mục tiêu sau tranh chấp. Rớt mạng, gửi lại lệnh và kết nối lại vẫn cho cùng kết quả và không trả thưởng lặp. |
| 4. Đạo Minh thử nghiệm | 3 | Hai thành viên cùng giữ một nguồn tiếp tế. Chặn đường làm thay đổi khả năng hoạt động của các đội đang dùng nguồn đó. |

Khi mốc 4 chơi ổn, thử một Kỳ thiên tượng ngắn với mục tiêu giữ mạng linh mạch. Lượt thử đầu ưu tiên PvE, bảo toàn Động Phủ và đánh giá khả năng đọc bản đồ. Quy mô mùa, kinh tế dài hạn và các tính năng cộng đồng sẽ được xác định sau khi kiểm tra vòng lặp này.

## Nguồn tham chiếu

- Rise of Kingdoms, tính năng người chơi thấy trên bản đồ chung và trong liên minh. [Lilith Games](https://rok.lilith.com/) · [App Store](https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888)
- Mặc Họa Tiên Thành, cơ chế và đồ họa đã có. [GDD của dự án](GDD.md)
- Dùng `domain-modeling` để thống nhất ngôn ngữ, `codebase-design` để đặt giao diện mô phỏng và nguyên tắc tracer bullet để chia các mốc. [Matt Pocock's Skills](https://github.com/mattpocock/skills/tree/abeeaf95660ba9e8b7c753eb38f441ca707a8823)
