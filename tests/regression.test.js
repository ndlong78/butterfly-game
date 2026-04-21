import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

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


test('UX nhập hồ sơ/PIN dùng canvas, không dùng prompt trong main', () => {
  const main = read('js/main.js');
  assert.equal(main.includes('prompt('), false);
  assert.equal(main.includes('drawProfileScreen'), true);
  assert.equal(main.includes('drawPinScreen'), true);
});
