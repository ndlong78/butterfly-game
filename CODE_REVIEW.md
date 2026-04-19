# Đánh giá mã nguồn & cách chơi — Bướm Bay Mắt Vui

## 1) Tóm tắt nhanh
- Dự án được tách module rõ ràng theo đúng vai trò file (config/state/main/background/butterfly/input/gameplay/camera/voice/report/screens).
- Vòng lặp game dùng `requestAnimationFrame`, có clamp `dt`, có scale theo `devicePixelRatio` và hệ tọa độ logic 1280×720.
- Gameplay dễ hiểu cho trẻ: giữ tay/chuột vào bướm để “bắt”, hoàn thành màn nhận sao, có báo cáo 30 ngày + xuất PDF.

## 2) Luồng chơi hiện tại
1. **Menu**: bấm “BẮT ĐẦU CHƠI” để vào kiểm tra che mắt, hoặc “Xem Báo Cáo” để xem lịch sử.
2. **Kiểm tra che mắt (Eye Check)**:
   - Mở webcam, đo độ sáng vùng mắt trái/phải.
   - Nếu chênh lệch lớn hơn ngưỡng thì xem như đã che mắt đúng.
   - Có thể bấm “Bỏ qua”.
3. **Chơi màn**:
   - Bướm bay theo quỹ đạo Bezier, số lượng tăng theo level.
   - Giữ con trỏ trong vùng bắt đủ thời gian để bắt được bướm.
   - Hết bướm hoặc quá 60 giây thì kết thúc màn.
4. **Kết màn**:
   - Hiện 1–3 sao và nút “Màn tiếp / Chơi lại / Về menu”.
5. **Báo cáo**:
   - Lưu localStorage, tổng hợp sao/thời gian/tuân thủ che mắt.
   - Có nút “Xuất PDF”.

## 3) Điểm mạnh
- **Kiến trúc module rõ**: tách state, input, gameplay, render màn hình giúp bảo trì tốt.
- **Hiệu năng nền tốt**:
  - Hạn chế tạo object trong loop ở các phần nóng (dùng mảng cố định, object tái sử dụng ở input/butterfly).
  - Nền tĩnh được pre-render vào offscreen canvas.
- **UX phù hợp trẻ em**: màu sắc tươi, feedback rõ (vòng tiến trình bắt, sao thưởng, lời khen).
- **Có báo cáo phụ huynh**: lưu session + export PDF ngay trong client.

## 4) Rủi ro & vấn đề cần ưu tiên
### Mức cao
1. **Mật khẩu phụ huynh hardcode (`1234`)**: không an toàn, dễ bị lộ/chia sẻ.
2. **Kiểm tra che mắt dựa độ sáng khá “mong manh”**: phụ thuộc ánh sáng môi trường/camera, có thể false positive.
3. **Biến thông tin bé chưa có luồng nhập** (`_childName`, `_childAge` luôn rỗng): báo cáo thiếu dữ liệu.

### Mức trung bình
4. **Xử lý camera lỗi còn thô**: khi lỗi chuyển thẳng vào game, chưa có thông báo hướng dẫn cụ thể cho phụ huynh.
5. **Không có teardown listener khi rời game**: với app chạy dài lâu/single-page lớn có thể rò rỉ listener.
6. **Một số text voice chưa được dùng theo ngữ cảnh** (ví dụ lời khen theo số sao chưa gọi).

### Mức thấp
7. **README quá ngắn**: thiếu hướng dẫn chạy, test, kiến trúc.
8. **Chưa có test tự động** cho logic core (tính sao, lưu session, hit-test).

## 5) Đề xuất cải tiến ngắn hạn (ưu tiên MVP)
1. **Bổ sung màn nhập thông tin bé** trước khi chơi (tên, tuổi) và validate cơ bản.
2. **Thay mật khẩu hardcode** bằng cấu hình runtime + cơ chế pin phụ huynh tối thiểu (không lưu plain text nếu có backend).
3. **Nâng độ tin cậy eye-check**:
   - Thêm baseline vài giây đầu.
   - Kết hợp điều kiện ổn định theo nhiều frame liên tiếp.
4. **Tách utility toán học dùng chung** (`distance`, `drawRoundRect`) để giảm lặp code.
5. **Thêm smoke test đơn giản** (nếu giữ vanilla JS): kiểm tra `calculateStars`, `handle...Click`, parse session.
6. **Bổ sung telemetry nhẹ** (FPS trung bình, tỉ lệ camera fail, tỉ lệ skip eye-check) để chỉnh gameplay theo dữ liệu thực.

## 6) Đề xuất cải tiến trung hạn
- Thêm **độ khó thích nghi** dựa trên lịch sử bé (trackingPercent thấp thì giảm tốc/tăng catch radius).
- Bổ sung **âm thanh nền + SFX bắt bướm** (có mute).
- Chuẩn hóa i18n để có thể mở rộng đa ngôn ngữ.

## 7) Kết luận
- Chất lượng code hiện tại ở mức **tốt cho MVP game web giáo dục**: rõ module, dễ đọc, loop mượt, gameplay hoàn chỉnh.
- Để sẵn sàng dùng thực tế lâu dài, nên ưu tiên xử lý 3 điểm: **an toàn truy cập báo cáo**, **độ ổn định eye-check**, **luồng nhập thông tin bé + test cơ bản**.
