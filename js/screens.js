import { CANVAS } from './config.js';
import { drawBackground } from './background.js';
import { Butterfly } from './butterfly.js';
import { drawRoundRect } from './canvas-utils.js';

const _menuBtns = {};
const _levelEndBtns = {};
const _profileBtns = {
  namePrev: null,
  nameNext: null,
  ageMinus: null,
  agePlus: null,
  continue: null,
  cancel: null,
};
const _pinBtns = {
  digits: new Array(10),
  back: null,
  clear: null,
  submit: null,
  cancel: null,
};
const _decorButterflies = [];

function isPortraitMode() {
  return window.innerHeight > window.innerWidth;
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

function drawButton(ctx, bounds, label, color, font = 'bold 28px Arial') {
  ctx.fillStyle = color;
  drawRoundRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillText(label, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
  ctx.textBaseline = 'alphabetic';
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

export function drawProfileScreen(ctx, profile, errorText = '') {
  drawBackground(ctx);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const card = { x: CANVAS.WIDTH / 2 - 300, y: 100, w: 600, h: 520 };
  ctx.fillStyle = '#FFFFFF';
  drawRoundRect(ctx, card.x, card.y, card.w, card.h, 24);
  ctx.fill();

  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Hồ sơ bé', CANVAS.WIDTH / 2, 160);

  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Tên bé', card.x + 70, 230);
  ctx.fillText('Tuổi', card.x + 70, 340);

  const nameBox = { x: card.x + 170, y: 190, w: 300, h: 60 };
  const ageBox = { x: card.x + 220, y: 300, w: 200, h: 60 };
  drawButton(ctx, nameBox, profile.name, '#3B82F6');
  drawButton(ctx, ageBox, String(profile.age), '#10B981');

  _profileBtns.namePrev = { x: card.x + 90, y: 190, w: 60, h: 60 };
  _profileBtns.nameNext = { x: card.x + 490, y: 190, w: 60, h: 60 };
  _profileBtns.ageMinus = { x: card.x + 140, y: 300, w: 60, h: 60 };
  _profileBtns.agePlus = { x: card.x + 440, y: 300, w: 60, h: 60 };

  drawButton(ctx, _profileBtns.namePrev, '◀', '#64748B');
  drawButton(ctx, _profileBtns.nameNext, '▶', '#64748B');
  drawButton(ctx, _profileBtns.ageMinus, '-', '#64748B');
  drawButton(ctx, _profileBtns.agePlus, '+', '#64748B');

  _profileBtns.continue = { x: card.x + 120, y: 450, w: 160, h: 56 };
  _profileBtns.cancel = { x: card.x + 320, y: 450, w: 160, h: 56 };

  drawButton(ctx, _profileBtns.continue, 'Tiếp tục', '#2563EB', 'bold 26px Arial');
  drawButton(ctx, _profileBtns.cancel, 'Hủy', '#9CA3AF', 'bold 26px Arial');

  if (errorText) {
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    ctx.font = '22px Arial';
    ctx.fillText(errorText, CANVAS.WIDTH / 2, 410);
  }
}

export function drawPinScreen(ctx, pinValue, mode, errorText = '') {
  drawBackground(ctx);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const card = { x: CANVAS.WIDTH / 2 - 250, y: 60, w: 500, h: 600 };
  ctx.fillStyle = '#FFFFFF';
  drawRoundRect(ctx, card.x, card.y, card.w, card.h, 24);
  ctx.fill();

  ctx.fillStyle = '#2C3E50';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px Arial';
  ctx.fillText(mode === 'setup' ? 'Thiết lập mã phụ huynh' : 'Nhập mã phụ huynh', CANVAS.WIDTH / 2, 120);

  const mask = pinValue.length > 0 ? '●'.repeat(pinValue.length) : '____';
  ctx.font = 'bold 42px Arial';
  ctx.fillStyle = '#111827';
  ctx.fillText(mask, CANVAS.WIDTH / 2, 190);

  const keypadStartX = card.x + 70;
  const keypadStartY = 230;
  const keyW = 100;
  const keyH = 70;
  const gap = 15;

  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  for (let i = 0; i < labels.length; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const rowOffset = i === 9 ? 1 : 0;
    const x = keypadStartX + (i === 9 ? rowOffset : col) * (keyW + gap);
    const y = keypadStartY + row * (keyH + gap);
    const btn = { x, y, w: keyW, h: keyH };
    _pinBtns.digits[Number(labels[i])] = btn;
    drawButton(ctx, btn, labels[i], '#334155');
  }

  _pinBtns.back = { x: card.x + 70, y: 530, w: 95, h: 48 };
  _pinBtns.clear = { x: card.x + 180, y: 530, w: 95, h: 48 };
  _pinBtns.submit = { x: card.x + 290, y: 530, w: 140, h: 48 };
  _pinBtns.cancel = { x: card.x + 290, y: 460, w: 140, h: 48 };

  drawButton(ctx, _pinBtns.back, '⌫', '#6B7280', 'bold 22px Arial');
  drawButton(ctx, _pinBtns.clear, 'Xóa', '#6B7280', 'bold 22px Arial');
  drawButton(ctx, _pinBtns.submit, 'Xác nhận', '#2563EB', 'bold 22px Arial');
  drawButton(ctx, _pinBtns.cancel, 'Hủy', '#9CA3AF', 'bold 22px Arial');

  if (errorText) {
    ctx.fillStyle = '#DC2626';
    ctx.font = '20px Arial';
    ctx.fillText(errorText, CANVAS.WIDTH / 2, 490);
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

export function handleProfileClick(x, y) {
  if (hit(_profileBtns.namePrev, x, y)) {
    return 'name_prev';
  }
  if (hit(_profileBtns.nameNext, x, y)) {
    return 'name_next';
  }
  if (hit(_profileBtns.ageMinus, x, y)) {
    return 'age_minus';
  }
  if (hit(_profileBtns.agePlus, x, y)) {
    return 'age_plus';
  }
  if (hit(_profileBtns.continue, x, y)) {
    return 'continue';
  }
  if (hit(_profileBtns.cancel, x, y)) {
    return 'cancel';
  }
  return null;
}

export function handlePinClick(x, y) {
  for (let digit = 0; digit <= 9; digit += 1) {
    if (hit(_pinBtns.digits[digit], x, y)) {
      return `digit_${digit}`;
    }
  }

  if (hit(_pinBtns.back, x, y)) {
    return 'back';
  }
  if (hit(_pinBtns.clear, x, y)) {
    return 'clear';
  }
  if (hit(_pinBtns.submit, x, y)) {
    return 'submit';
  }
  if (hit(_pinBtns.cancel, x, y)) {
    return 'cancel';
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
