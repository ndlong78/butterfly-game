import { CANVAS, COLORS } from './config.js';

const CLOUD_COUNT = 5;
const BIRD_COUNT = 3;
const FRAME_MS = 1000 / 60;

const clouds = new Array(CLOUD_COUNT);
const birds = new Array(BIRD_COUNT);

let staticCanvas = null;
let staticCtx = null;
let isInitialized = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawFlower(ctx, x, y, size, petalColor) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i += 1) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.65, size * 0.32, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#FFD93D';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStaticBackground() {
  staticCanvas = document.createElement('canvas');
  staticCanvas.width = CANVAS.WIDTH;
  staticCanvas.height = CANVAS.HEIGHT;

  staticCtx = staticCanvas.getContext('2d');
  if (!staticCtx) {
    throw new Error('Không thể tạo offscreen canvas cho background');
  }

  const grassY = Math.floor(CANVAS.HEIGHT * 0.7);

  const skyGradient = staticCtx.createLinearGradient(0, 0, 0, Math.floor(CANVAS.HEIGHT * 0.7));
  skyGradient.addColorStop(0, COLORS.sky);
  skyGradient.addColorStop(1, COLORS.skyLight);
  staticCtx.fillStyle = skyGradient;
  staticCtx.fillRect(0, 0, CANVAS.WIDTH, Math.floor(CANVAS.HEIGHT * 0.7));

  staticCtx.save();
  staticCtx.globalAlpha = 0.25;
  staticCtx.lineWidth = 12;
  const rbX = CANVAS.WIDTH * 0.85;
  const rbY = CANVAS.HEIGHT;
  for (let i = 0; i < 7; i += 1) {
    staticCtx.strokeStyle = COLORS.rainbow[i % COLORS.rainbow.length];
    staticCtx.beginPath();
    staticCtx.arc(rbX, rbY, 280 + i * 40, Math.PI, Math.PI * 2);
    staticCtx.stroke();
  }
  staticCtx.restore();

  staticCtx.fillStyle = COLORS.grass;
  staticCtx.fillRect(0, grassY, CANVAS.WIDTH, CANVAS.HEIGHT - grassY);

  staticCtx.beginPath();
  staticCtx.moveTo(0, grassY);
  for (let x = 0; x <= CANVAS.WIDTH; x += 8) {
    const y = grassY + Math.sin(x / 80) * 5;
    staticCtx.lineTo(x, y);
  }
  staticCtx.lineTo(CANVAS.WIDTH, CANVAS.HEIGHT);
  staticCtx.lineTo(0, CANVAS.HEIGHT);
  staticCtx.closePath();
  staticCtx.fillStyle = '#78CC57';
  staticCtx.fill();

  for (let i = 0; i < 10; i += 1) {
    const fx = 100 + i * 120;
    const fy = grassY + 18 + Math.sin(i * 0.9) * 8;
    staticCtx.strokeStyle = '#3C9D3A';
    staticCtx.lineWidth = 3;
    staticCtx.beginPath();
    staticCtx.moveTo(fx, fy + 28);
    staticCtx.lineTo(fx, fy + 3);
    staticCtx.stroke();

    const color = i % 2 === 0 ? '#FF8DC7' : '#C7A8FF';
    drawFlower(staticCtx, fx, fy, 16, color);
  }

  const teddyX = 120;
  const teddyY = CANVAS.HEIGHT - 120;

  staticCtx.fillStyle = COLORS.teddy;
  staticCtx.beginPath();
  staticCtx.ellipse(teddyX, teddyY + 25, 62, 74, 0, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.beginPath();
  staticCtx.arc(teddyX, teddyY - 48, 44, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.beginPath();
  staticCtx.arc(teddyX - 30, teddyY - 84, 16, 0, Math.PI * 2);
  staticCtx.arc(teddyX + 30, teddyY - 84, 16, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.fillStyle = '#D9A26A';
  staticCtx.beginPath();
  staticCtx.ellipse(teddyX, teddyY + 24, 34, 44, 0, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.fillStyle = '#2E1A12';
  staticCtx.beginPath();
  staticCtx.arc(teddyX - 12, teddyY - 54, 4, 0, Math.PI * 2);
  staticCtx.arc(teddyX + 12, teddyY - 54, 4, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.fillStyle = '#EFC29A';
  staticCtx.beginPath();
  staticCtx.ellipse(teddyX, teddyY - 34, 16, 11, 0, 0, Math.PI * 2);
  staticCtx.fill();

  const rabbitX = CANVAS.WIDTH - 120;
  const rabbitY = CANVAS.HEIGHT - 115;

  staticCtx.fillStyle = COLORS.rabbit;
  staticCtx.beginPath();
  staticCtx.ellipse(rabbitX, rabbitY + 25, 58, 72, 0, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.beginPath();
  staticCtx.arc(rabbitX, rabbitY - 42, 38, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.beginPath();
  staticCtx.ellipse(rabbitX - 18, rabbitY - 96, 13, 42, -0.15, 0, Math.PI * 2);
  staticCtx.ellipse(rabbitX + 18, rabbitY - 96, 13, 42, 0.15, 0, Math.PI * 2);
  staticCtx.fill();

  staticCtx.fillStyle = '#F4B4CB';
  staticCtx.beginPath();
  staticCtx.ellipse(rabbitX - 18, rabbitY - 96, 6, 28, -0.15, 0, Math.PI * 2);
  staticCtx.ellipse(rabbitX + 18, rabbitY - 96, 6, 28, 0.15, 0, Math.PI * 2);
  staticCtx.fill();
}

function drawCloud(ctx, cloud) {
  ctx.fillStyle = COLORS.cloud;
  ctx.beginPath();
  ctx.ellipse(cloud.x - 42, cloud.y + 8, 34, 24, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x - 12, cloud.y - 6, 38, 28, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x + 20, cloud.y, 32, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x + 46, cloud.y + 12, 25, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(cloud.x + 5, cloud.y + 14, 52, 21, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird(ctx, bird) {
  const wingDroop = Math.sin(bird.phase) * 8;
  const wingSpan = 20;

  ctx.strokeStyle = '#2A3442';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(bird.x - wingSpan / 2, bird.y, wingSpan / 2, Math.PI * 0.05, Math.PI * 0.95, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(bird.x + wingSpan / 2, bird.y + wingDroop * 0.2, wingSpan / 2, Math.PI * 0.05, Math.PI * 0.95, false);
  ctx.stroke();
}

export function initBackground() {
  drawStaticBackground();

  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    clouds[i] = {
      x: i * 300 + 120,
      y: 85 + (i % 3) * 42,
    };
  }

  for (let i = 0; i < BIRD_COUNT; i += 1) {
    birds[i] = {
      x: CANVAS.WIDTH - i * 240,
      y: 120 + i * 45,
      phase: i * 1.7,
    };
  }

  isInitialized = true;
}

export function updateBackground(dt) {
  if (!isInitialized) {
    return;
  }

  const frameFactor = clamp(dt / FRAME_MS, 0, 3);

  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    const cloud = clouds[i];
    cloud.x -= 0.3 * frameFactor;
    if (cloud.x < -200) {
      cloud.x = CANVAS.WIDTH + 220;
    }
  }

  for (let i = 0; i < BIRD_COUNT; i += 1) {
    const bird = birds[i];
    bird.x -= 0.8 * frameFactor;
    if (bird.x < -100) {
      bird.x = CANVAS.WIDTH + 120;
    }
    bird.phase += 0.16 * frameFactor;
  }
}

export function drawBackground(ctx) {
  if (!isInitialized) {
    initBackground();
  }

  ctx.drawImage(staticCanvas, 0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    drawCloud(ctx, clouds[i]);
  }

  for (let i = 0; i < BIRD_COUNT; i += 1) {
    drawBird(ctx, birds[i]);
  }
}
