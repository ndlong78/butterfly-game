# Hướng dẫn PWA cho iPhone/iPad — Bướm Bay Mắt Vui

## 1) Deploy lên GitHub Pages

1. Push code lên repo `ndlong78/butterfly-game`.
2. Vào **Settings → Pages**.
3. Source chọn branch chính (ví dụ `main`) và thư mục `/ (root)`.
4. Chờ GitHub build xong, app sẽ có URL dạng:
   - `https://ndlong78.github.io/butterfly-game/`
5. Kiểm tra nhanh các file PWA:
   - `https://ndlong78.github.io/butterfly-game/manifest.webmanifest`
   - `https://ndlong78.github.io/butterfly-game/sw.js`

> Lưu ý: `start_url` và `scope` đang dùng tương đối (`./`) để tương thích repo con trên GitHub Pages.

---

## 2) Add to Home Screen trên iPhone/iPad

1. Mở app bằng **Safari** (không dùng in-app browser).
2. Nhấn nút **Share**.
3. Chọn **Add to Home Screen**.
4. Đặt tên app (gợi ý: *Bướm Bay*), nhấn **Add**.
5. Mở app từ icon ngoài màn hình chính để chạy chế độ `standalone`.

---

## 3) Cách clear cache khi bị lỗi/trắng màn

### Cách nhanh trong app
- Nhấn nút **Reset Cache** góc trên bên phải.
- App sẽ:
  - Unregister service worker.
  - Xóa toàn bộ Cache Storage.
  - Tự reload.

### Cách thủ công trên iOS
1. **Settings → Safari → Advanced → Website Data**.
2. Tìm domain `ndlong78.github.io` và xóa dữ liệu.
3. Mở lại app từ Safari, rồi Add to Home Screen lại nếu cần.

---

## 4) Checklist test Safari iOS

- [ ] Mở URL lần đầu không trắng màn.
- [ ] Có thể bấm **BẮT ĐẦU CHƠI** ngay, không bắt buộc tạo profile.
- [ ] Audio/giọng nói chỉ hoạt động sau thao tác người dùng (tap Bắt đầu/Chơi lại).
- [ ] UI không bị che bởi notch/safe area ở iPhone/iPad.
- [ ] Add to Home Screen và mở từ icon vẫn chơi được.
- [ ] Sau khi đã mở online 1 lần, bật Airplane mode vẫn vào game offline.
- [ ] Nút **Reset Cache** hoạt động khi cần cứu lỗi cache cũ.

---

## 5) Gợi ý debug nhanh

- Nếu app đứng ở splash/blank:
  1. Reset Cache trong app.
  2. Nếu không được, xóa Website Data trong Safari.
  3. Mở lại bản online trước, đợi load xong rồi test offline.
- Nếu âm thanh không phát: đảm bảo đã tap vào nút trong game trước khi mong đợi audio.
