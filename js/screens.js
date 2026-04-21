import { CANVAS } from './config.js';
import { drawBackground } from './background.js';
import { Butterfly } from './butterfly.js';

const _menuBtns = {};
const _levelEndBtns = {};
const _decorButterflies = [];

function isPortraitMode() {
  return window.innerHeight > window.innerWidth;
}

function drawRoundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function hit(bounds, x, y) {
  if (!bounds) {
    return false;
  }
  return x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h;
}

function initDecor() {
  if (_decorButterflies.length > 0) {
    return;
  }

  for (let i = 0; i < 3; i += 1) {
    _decorButterflies.push(new Butterfly(50 + i, 0, 0.55));
  }
}

function drawStar(ctx, x, y, size, active, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();

  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 5;
    const radius = i % 2 === 0 ? size : size * 0.45;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  if (active) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#F1C40F';
  } else {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#DDDDDD';
  }
  ctx.fill();
  ctx.restore();
}

export function drawMenuScreen(ctx, frameCount) {
  initDecor();
  drawBackground(ctx);
  const portrait = isPortraitMode();

  const bounceY = Math.sin(frameCount * 0.03) * (portrait ? 12 : 8);
  const titleFont = portrait ? 'bold 76px Arial' : 'bold 64px Arial';
  const subTitleFont = portrait ? '34px Arial' : '28px Arial';
  const startW = portrait ? 360 : 240;
  const startH = portrait ? 82 : 60;
  const startY = portrait ? CANVAS.HEIGHT / 2 + 10 : CANVAS.HEIGHT / 2 + 40;
  const titleY = portrait ? 180 : 150;
  const subtitleY = portrait ? 250 : 210;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = '#F4D03F';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#2C3E50';
  ctx.font = titleFont;
  ctx.fillText('🦋 Bướm Bay Mắt Vui 🦋', CANVAS.WIDTH / 2, titleY + bounceY);
  ctx.restore();

  ctx.fillStyle = '#555555';
  ctx.textAlign = 'center';
  ctx.font = subTitleFont;
  ctx.fillText('Trò chơi tập mắt vui nhộn cho bé', CANVAS.WIDTH / 2, subtitleY);

  const startX = CANVAS.WIDTH / 2 - startW / 2;

  const startGrad = ctx.createLinearGradient(startX, startY, startX + startW, startY + startH);
  startGrad.addColorStop(0, '#4FC3F7');
  startGrad.addColorStop(1, '#1565C0');

  ctx.fillStyle = startGrad;
  drawRoundRect(ctx, startX, startY, startW, startH, 28);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = portrait ? 'bold 36px Arial' : 'bold 28px Arial';
  ctx.fillText('BẮT ĐẦU CHƠI', startX + startW / 2, startY + startH / 2);

  const reportW = portrait ? 320 : 220;
  const reportH = portrait ? 72 : 52;
  const reportX = CANVAS.WIDTH / 2 - reportW / 2;
  const reportY = portrait ? CANVAS.HEIGHT - 112 : CANVAS.HEIGHT - 90;

  ctx.fillStyle = '#95A5A6';
  drawRoundRect(ctx, reportX, reportY, reportW, reportH, 18);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = portrait ? 'bold 32px Arial' : 'bold 24px Arial';
  ctx.fillText('Xem Báo Cáo', reportX + reportW / 2, reportY + reportH / 2);
  ctx.textBaseline = 'alphabetic';

  _menuBtns.start = { x: startX, y: startY, w: startW, h: startH };
  _menuBtns.report = { x: reportX, y: reportY, w: reportW, h: reportH };

  for (let i = 0; i < _decorButterflies.length; i += 1) {
    _decorButterflies[i].update(16.67);
    _decorButterflies[i].draw(ctx);
  }
}

export function drawLevelEndScreen(ctx, stars, levelIndex, frameCount) {
  const portrait = isPortraitMode();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const cardW = portrait ? 560 : 400;
  const cardH = portrait ? 470 : 320;
  const cardX = CANVAS.WIDTH / 2 - cardW / 2;
  const cardY = CANVAS.HEIGHT / 2 - cardH / 2;

  ctx.fillStyle = '#FFFFFF';
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();

  const revealed = [frameCount > 30, frameCount > 60, frameCount > 90];
  const waveScale = 1 + Math.sin(frameCount * 0.1) * 0.1;

  const starGap = portrait ? 130 : 90;
  const sideStarSize = portrait ? 42 : 32;
  const centerStarSize = portrait ? 52 : 40;
  const starBaseY = portrait ? cardY + 120 : cardY + 80;
  drawStar(ctx, CANVAS.WIDTH / 2 - starGap, starBaseY, sideStarSize, revealed[0] && stars >= 1, waveScale);
  drawStar(ctx, CANVAS.WIDTH / 2, starBaseY - (portrait ? 18 : 12), centerStarSize, revealed[1] && stars >= 2, waveScale);
  drawStar(ctx, CANVAS.WIDTH / 2 + starGap, starBaseY, sideStarSize, revealed[2] && stars >= 3, waveScale);

  let praise = 'Cố lên! Con làm được mà! 💪';
  if (stars >= 3) {
    praise = 'Xuất sắc! Con giỏi lắm! 🎉';
  } else if (stars === 2) {
    praise = 'Rất tốt! Tiếp tục cố gắng nhé!';
  }

  ctx.fillStyle = '#2C3E50';
  ctx.textAlign = 'center';
  ctx.font = portrait ? 'bold 38px Arial' : 'bold 28px Arial';
  ctx.fillText(praise, CANVAS.WIDTH / 2, portrait ? cardY + 240 : cardY + 150);

  const nextLabel = levelIndex < 3 ? 'Màn tiếp' : 'Hoàn thành';
  const nextBtn = portrait
    ? { x: CANVAS.WIDTH / 2 - 170, y: cardY + 280, w: 340, h: 62 }
    : { x: cardX + 120, y: cardY + 185, w: 160, h: 46 };
  const replayBtn = portrait
    ? { x: CANVAS.WIDTH / 2 - 170, y: cardY + 356, w: 340, h: 52 }
    : { x: cardX + 40, y: cardY + 245, w: 140, h: 46 };
  const menuBtn = portrait
    ? { x: CANVAS.WIDTH / 2 - 170, y: cardY + 418, w: 340, h: 52 }
    : { x: cardX + 220, y: cardY + 245, w: 140, h: 46 };

  ctx.fillStyle = '#3498DB';
  drawRoundRect(ctx, nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h, 16);
  ctx.fill();

  ctx.fillStyle = '#F39C12';
  drawRoundRect(ctx, replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 16);
  ctx.fill();

  ctx.fillStyle = '#7F8C8D';
  drawRoundRect(ctx, menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = portrait ? 'bold 30px Arial' : 'bold 24px Arial';
  ctx.textBaseline = 'middle';
  ctx.fillText(nextLabel, nextBtn.x + nextBtn.w / 2, nextBtn.y + nextBtn.h / 2);
  ctx.fillText('Chơi lại', replayBtn.x + replayBtn.w / 2, replayBtn.y + replayBtn.h / 2);
  ctx.fillText('Về menu', menuBtn.x + menuBtn.w / 2, menuBtn.y + menuBtn.h / 2);
  ctx.textBaseline = 'alphabetic';

  _levelEndBtns.next = nextBtn;
  _levelEndBtns.replay = replayBtn;
  _levelEndBtns.menu = menuBtn;
}

export function handleMenuClick(x, y) {
  if (hit(_menuBtns.start, x, y)) {
    return 'start';
  }

  if (hit(_menuBtns.report, x, y)) {
    return 'report';
  }

  return null;
}

export function handleLevelEndClick(x, y) {
  if (hit(_levelEndBtns.next, x, y)) {
    return 'next';
  }

  if (hit(_levelEndBtns.replay, x, y)) {
    return 'replay';
  }

  if (hit(_levelEndBtns.menu, x, y)) {
    return 'menu';
  }

  return null;
}
