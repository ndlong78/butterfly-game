import { COLORS } from './config.js';

const CLOUD_COUNT = 5;
const BIRD_COUNT = 3;
const FRAME_MS = 1000 / 60;

const clouds = new Array(CLOUD_COUNT);
const birds = new Array(BIRD_COUNT);

let staticCanvas = null;
let staticCtx = null;
let isInitialized = false;
let _layout = null;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function drawFlower(ctx, x, y, size, petalColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i += 1) {
    ctx.save(); ctx.rotate((Math.PI * 2 * i) / 5); ctx.beginPath(); ctx.ellipse(0, -size * 0.65, size * 0.32, size * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = '#FFD93D';
  ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStaticBackground() {
  if (!_layout) return;
  staticCanvas = document.createElement('canvas');
  staticCanvas.width = _layout.w;
  staticCanvas.height = _layout.h;
  staticCtx = staticCanvas.getContext('2d');
  if (!staticCtx) throw new Error('Không thể tạo offscreen canvas cho background');

  const skyY = _layout.sky.h;
  const skyGradient = staticCtx.createLinearGradient(0, 0, 0, skyY);
  skyGradient.addColorStop(0, COLORS.sky);
  skyGradient.addColorStop(1, COLORS.skyLight);
  staticCtx.fillStyle = skyGradient;
  staticCtx.fillRect(0, 0, _layout.w, skyY);

  staticCtx.save();
  staticCtx.globalAlpha = 0.25;
  staticCtx.lineWidth = clamp(_layout.w * 0.008, 6, 12);
  const rbX = _layout.w - _layout.w * 0.16;
  const rbY = _layout.ground.y + _layout.ground.h * 0.9;
  for (let i = 0; i < 7; i += 1) {
    staticCtx.strokeStyle = COLORS.rainbow[i % COLORS.rainbow.length];
    staticCtx.beginPath();
    staticCtx.arc(rbX, rbY, _layout.w * 0.12 + i * _layout.w * 0.03, Math.PI, Math.PI * 2);
    staticCtx.stroke();
  }
  staticCtx.restore();

  staticCtx.fillStyle = COLORS.grass;
  staticCtx.fillRect(0, _layout.ground.y, _layout.w, _layout.ground.h);

  staticCtx.beginPath();
  staticCtx.moveTo(0, _layout.ground.y);
  for (let x = 0; x <= _layout.w; x += 8) {
    staticCtx.lineTo(x, _layout.ground.y + Math.sin(x / 80) * 5);
  }
  staticCtx.lineTo(_layout.w, _layout.h);
  staticCtx.lineTo(0, _layout.h);
  staticCtx.closePath();
  staticCtx.fillStyle = '#78CC57';
  staticCtx.fill();

  const flowerCount = clamp(Math.floor(_layout.w / 120), 6, 12);
  for (let i = 0; i < flowerCount; i += 1) {
    const fx = _layout.w * 0.08 + i * ((_layout.w * 0.84) / flowerCount);
    const fy = _layout.ground.y + 22 + Math.sin(i * 0.9) * 8;
    staticCtx.strokeStyle = '#3C9D3A';
    staticCtx.lineWidth = 3;
    staticCtx.beginPath(); staticCtx.moveTo(fx, fy + 28); staticCtx.lineTo(fx, fy + 3); staticCtx.stroke();
    drawFlower(staticCtx, fx, fy, clamp(_layout.w * 0.014, 11, 16), i % 2 === 0 ? '#FF8DC7' : '#C7A8FF');
  }

  const teddyX = _layout.w * 0.1;
  const teddyY = _layout.ground.y + _layout.ground.h * 0.62;
  staticCtx.fillStyle = COLORS.teddy;
  staticCtx.beginPath(); staticCtx.ellipse(teddyX, teddyY + 25, 62, 74, 0, 0, Math.PI * 2); staticCtx.fill();
  staticCtx.beginPath(); staticCtx.arc(teddyX, teddyY - 48, 44, 0, Math.PI * 2); staticCtx.fill();
  staticCtx.beginPath(); staticCtx.arc(teddyX - 30, teddyY - 84, 16, 0, Math.PI * 2); staticCtx.arc(teddyX + 30, teddyY - 84, 16, 0, Math.PI * 2); staticCtx.fill();

  const rabbitX = _layout.w * 0.9;
  const rabbitY = _layout.ground.y + _layout.ground.h * 0.62;
  staticCtx.fillStyle = COLORS.rabbit;
  staticCtx.beginPath(); staticCtx.ellipse(rabbitX, rabbitY + 25, 58, 72, 0, 0, Math.PI * 2); staticCtx.fill();
  staticCtx.beginPath(); staticCtx.arc(rabbitX, rabbitY - 42, 38, 0, Math.PI * 2); staticCtx.fill();
}

function drawCloud(ctx, cloud) {
  const s = cloud.scale;
  ctx.fillStyle = COLORS.cloud;
  ctx.beginPath();
  ctx.ellipse(cloud.x - 42 * s, cloud.y + 8 * s, 34 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x - 12 * s, cloud.y - 6 * s, 38 * s, 28 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x + 20 * s, cloud.y, 32 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x + 46 * s, cloud.y + 12 * s, 25 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x + 5 * s, cloud.y + 14 * s, 52 * s, 21 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird(ctx, bird) {
  const wingDroop = Math.sin(bird.phase) * 8;
  const wingSpan = 20;
  ctx.strokeStyle = '#2A3442';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(bird.x - wingSpan / 2, bird.y, wingSpan / 2, Math.PI * 0.05, Math.PI * 0.95, false); ctx.stroke();
  ctx.beginPath(); ctx.arc(bird.x + wingSpan / 2, bird.y + wingDroop * 0.2, wingSpan / 2, Math.PI * 0.05, Math.PI * 0.95, false); ctx.stroke();
}

export function initBackground(layout) {
  _layout = layout;
  drawStaticBackground();
  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    clouds[i] = { x: i * (_layout.w * 0.3) + 120, y: 75 + (i % 3) * 42, scale: clamp(_layout.w / 1280, 0.72, 1.24) };
  }
  for (let i = 0; i < BIRD_COUNT; i += 1) {
    birds[i] = { x: _layout.w - i * 240, y: 120 + i * 45, phase: i * 1.7 };
  }
  isInitialized = true;
}

export function updateBackground(dt, layout) {
  if (!isInitialized) return;
  if (layout && (_layout.w !== layout.w || _layout.h !== layout.h)) refreshBackgroundLayout(layout);
  const frameFactor = clamp(dt / FRAME_MS, 0, 3);
  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    clouds[i].x -= 0.3 * frameFactor;
    if (clouds[i].x < -240) clouds[i].x = _layout.w + 220;
  }
  for (let i = 0; i < BIRD_COUNT; i += 1) {
    birds[i].x -= 0.8 * frameFactor;
    if (birds[i].x < -100) birds[i].x = _layout.w + 120;
    birds[i].phase += 0.16 * frameFactor;
  }
}

export function drawBackground(ctx, layout) {
  if (!isInitialized) initBackground(layout);
  ctx.drawImage(staticCanvas, 0, 0, _layout.w, _layout.h);
  for (let i = 0; i < CLOUD_COUNT; i += 1) drawCloud(ctx, clouds[i]);
  for (let i = 0; i < BIRD_COUNT; i += 1) drawBird(ctx, birds[i]);
}

export function refreshBackgroundLayout(layout) {
  _layout = layout;
  drawStaticBackground();
}
