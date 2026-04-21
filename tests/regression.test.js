import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

// ─── Tests cũ (giữ nguyên) ────────────────────────────────────────────────

test('không còn mật khẩu hardcode 1234 trong config', () => {
  const config = read('js/config.js');
  assert.equal(config.includes("'1234'"), false);
});

test('updateBackground chỉ gọi một lần ở main loop, không ở gameplay', () => {
  const main = read('js/main.js');
  const gameplay = read('js/gameplay.js');
  assert.equal((main.match(/updateBackground\(dt\)/g) || []).length, 1);
  assert.equal(gameplay.includes('updateBackground(dt)'), false);
});

test('camera có guard compatibility và cơ chế invalidate request', () => {
  const camera = read('js/camera.js');
  assert.equal(camera.includes('navigator.mediaDevices'), true);
  assert.equal(camera.includes('_cameraRequestId'), true);
  assert.equal(camera.includes('requestId !== _cameraRequestId'), true);
});

test('exportPDF có guard khi CDN chưa sẵn sàng', () => {
  const report = read('js/report.js');
  assert.equal(report.includes('window.jspdf'), true);
  assert.equal(report.includes('Thư viện PDF chưa sẵn sàng'), true);
});

// ─── Tests mới cho mobile UI ──────────────────────────────────────────────

test('config có CATCH_RADIUS_MOBILE lớn hơn CATCH_RADIUS', () => {
  const config = read('js/config.js');
  // Parse giá trị thô — đủ để kiểm tra sự tồn tại và thứ tự khai báo
  assert.ok(config.includes('CATCH_RADIUS_MOBILE'), 'thiếu CATCH_RADIUS_MOBILE');
  const mobileMatch = config.match(/CATCH_RADIUS_MOBILE:\s*(\d+)/);
  const desktopMatch = config.match(/CATCH_RADIUS:\s*(\d+)/);
  assert.ok(mobileMatch && desktopMatch, 'không tìm thấy cả hai hằng số');
  assert.ok(
    Number(mobileMatch[1]) > Number(desktopMatch[1]),
    `CATCH_RADIUS_MOBILE (${mobileMatch[1]}) phải lớn hơn CATCH_RADIUS (${desktopMatch[1]})`,
  );
});

test('gameplay dùng _catchRadius() thay vì hardcode GAME.CATCH_RADIUS trong update và draw', () => {
  const gameplay = read('js/gameplay.js');
  assert.ok(gameplay.includes('_catchRadius()'), 'thiếu hàm _catchRadius()');
  // Hàm update và draw phải dùng biến radius, không hardcode GAME.CATCH_RADIUS trực tiếp trong vòng lặp
  assert.ok(gameplay.includes('const radius = _catchRadius()'), 'thiếu khai báo radius từ _catchRadius');
});

test('screens.drawMenuScreen nhận opts.hasProfile và gọi drawProfileHint', () => {
  const screens = read('js/screens.js');
  assert.ok(screens.includes('hasProfile'), 'thiếu tham số hasProfile');
  assert.ok(screens.includes('drawProfileHint'), 'thiếu hàm drawProfileHint');
  assert.ok(screens.includes('drawCornerHint'), 'thiếu hàm drawCornerHint (hidden trigger dot)');
});

test('screens.drawLevelEndScreen nhận tham số session và gọi drawStatsStrip', () => {
  const screens = read('js/screens.js');
  assert.ok(screens.includes('drawStatsStrip'), 'thiếu hàm drawStatsStrip');
  // Signature phải có session param
  assert.ok(
    screens.includes('session = null') || screens.includes('session=null'),
    'drawLevelEndScreen thiếu tham số session với default null',
  );
});

test('camera.drawEyeCheckScreen nhận opts.eyeSide và gọi drawEyeSideLabel', () => {
  const camera = read('js/camera.js');
  assert.ok(camera.includes('eyeSide'), 'thiếu tham số eyeSide');
  assert.ok(camera.includes('drawEyeSideLabel'), 'thiếu hàm drawEyeSideLabel');
  assert.ok(camera.includes('drawStatusBadge'), 'thiếu hàm drawStatusBadge');
});

test('report có drawRecentSessionsTable và drawMetrics với nhánh mobile', () => {
  const report = read('js/report.js');
  assert.ok(report.includes('drawRecentSessionsTable'), 'thiếu hàm drawRecentSessionsTable');
  assert.ok(report.includes('drawMetrics'), 'thiếu hàm drawMetrics');
  // Nhánh mobile phải có 2-col grid
  assert.ok(report.includes('colW'), 'thiếu biến colW trong layout mobile 2-col');
});

test('main.js truyền hasProfile vào drawMenuScreen', () => {
  const main = read('js/main.js');
  assert.ok(
    main.includes('hasProfile: Boolean(_childName)'),
    'main.js không truyền hasProfile vào drawMenuScreen',
  );
});

test('main.js truyền _lastSession vào drawLevelEndScreen', () => {
  const main = read('js/main.js');
  assert.ok(
    main.includes('drawLevelEndScreen(ctx, stars, _currentLevel, _levelEndFrame, _lastSession)'),
    'main.js không truyền _lastSession vào drawLevelEndScreen',
  );
});

test('main.js truyền eyeSide vào drawEyeCheckScreen', () => {
  const main = read('js/main.js');
  assert.ok(
    main.includes('eyeSide: _eyeSide'),
    'main.js không truyền eyeSide vào drawEyeCheckScreen',
  );
});

test('main.js có logic luân phiên mắt _eyeSide dựa trên số phiên', () => {
  const main = read('js/main.js');
  assert.ok(main.includes('_eyeSide'), 'thiếu biến _eyeSide');
  assert.ok(
    main.includes("sessions.length % 2 === 0 ? 'left' : 'right'"),
    'thiếu logic luân phiên mắt trái/phải',
  );
});
