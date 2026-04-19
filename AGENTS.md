# Butterfly Game — Codex Rules

## Quy tắc bắt buộc
- Vanilla JS ES6 modules. Không framework, không bundler.
- Tất cả vẽ qua Canvas 2D API (ctx). Không thao tác DOM trong game loop.
- Toàn bộ text hiển thị bằng tiếng Việt.
- Target 60fps. Không tạo object mới trong animation loop.
- Tọa độ logic: 1280×720. Scale bằng devicePixelRatio trong main.js.

## Thư viện cho phép (CDN)
- Chart.js 4.x — chỉ dùng trong report
- jsPDF 2.x + AutoTable — chỉ dùng xuất PDF
- KHÔNG dùng face-api.js

## Trách nhiệm từng file
- config.js     → hằng số, không có logic
- state.js      → state machine, không render
- main.js       → game loop + điều phối module
- background.js → vẽ cảnh nền
- butterfly.js  → class Butterfly
- input.js      → xử lý chuột + chạm
- gameplay.js   → logic màn chơi
- camera.js     → webcam + kiểm tra che mắt
- voice.js      → Web Speech API
- report.js     → localStorage + PDF
- screens.js    → màn menu + kết thúc

## Convention đặt tên hàm
- drawXxx(ctx, ...)   → chỉ vẽ, không đổi state
- updateXxx(dt)       → đổi state, không vẽ
- handleXxxClick(x,y) → trả về action string hoặc null
