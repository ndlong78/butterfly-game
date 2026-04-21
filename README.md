# butterfly-game

Game tập nhược thị cho trẻ em - Bướm Bay Mắt Vui.

## Chạy local

### Cách 1: Python HTTP server
```bash
python3 -m http.server 8080
```
Mở trình duyệt: `http://localhost:8080`.

### Cách 2: Node static server (nếu có)
Dùng bất kỳ static server nội bộ nào để mở `index.html` qua HTTP.

> Lưu ý: cần chạy qua HTTP/HTTPS (không dùng `file://`) để camera hoạt động ổn định.

## Chạy test
```bash
npm test
```

## Browser support (khuyến nghị)
- Chrome/Edge mới nhất
- Safari iOS 16+ (camera có thể bị giới hạn quyền)

## Privacy & Security note
- Camera chỉ dùng cho bước kiểm tra che mắt.
- Khi lỗi hoặc thoát bước camera, stream sẽ được dừng và dọn dẹp.
- Mã phụ huynh được lưu ở localStorage trên thiết bị hiện tại.

## Troubleshooting
1. **Không mở được camera**
   - Kiểm tra quyền camera của trình duyệt.
   - Đảm bảo chạy qua `http://localhost` hoặc HTTPS.
2. **Không xuất được PDF**
   - Kiểm tra mạng vì thư viện PDF được tải từ CDN.
   - Thử tải lại trang rồi xuất lại.
3. **Chạm/giữ không bắt được bướm**
   - Dùng đúng vùng canvas (toàn màn hình game).
   - Hạn chế kéo tay quá xa khi đang giữ để tránh reset thời gian giữ.
