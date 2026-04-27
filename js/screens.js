import { drawBackground } from './background.js';
import { Butterfly, setButterflyBounds } from './butterfly.js';
import { drawRoundRect } from './canvas-utils.js';

const _menuBtns = {};
const _levelEndBtns = {};
const _decorButterflies = [];


function ensureLayout(layout) {
  if (layout) return layout;
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    safeTop: 0,
    safeBottom: 0,
    isPhone: window.innerWidth <= 900,
    playArea: { x: 16, y: 120, w: Math.max(200, window.innerWidth - 32), h: Math.max(200, window.innerHeight - 160) },
    buttons: { modal: { x: Math.max(16, window.innerWidth * 0.05), y: Math.max(16, window.innerHeight * 0.2), w: Math.min(window.innerWidth * 0.9, 430), h: Math.min(window.innerHeight * 0.6, 520) } },
  };
}

function hit(bounds, x, y) {
  if (!bounds) return false;
  return x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h;
}

function initDecor(layout) {
  if (_decorButterflies.length > 0) return;
  setButterflyBounds(layout.playArea, layout.isPhone);
  for (let i = 0; i < 3; i += 1) _decorButterflies.push(new Butterfly(50 + i, 0, 0.55));
}

function drawStar(ctx, x, y, size, active, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 5;
    const radius = i % 2 === 0 ? size : size * 0.45;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = active ? '#F1C40F' : '#DDDDDD';
  ctx.fill();
  ctx.restore();
}


function drawCornerHint(ctx, layout) {
  const x = layout.w - 24;
  const y = layout.h - 24;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#2C3E50';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStatsStrip(ctx, cardX, cardY, cardW, cardH, session) {
  if (!session) return;
  const items = [
    { label: 'Thời gian', value: `${session.timeSeconds}s` },
    { label: 'Theo dõi', value: `${session.trackingPercent}%` },
    { label: 'Level', value: `${session.level}` },
  ];
  const y = cardY + 176;
  const cardInnerW = cardW - 28;
  const itemW = (cardInnerW - 20) / 3;
  for (let i = 0; i < 3; i += 1) {
    const x = cardX + 14 + i * (itemW + 10);
    ctx.fillStyle = 'rgba(238,244,250,1)';
    drawRoundRect(ctx, x, y, itemW, 78, 14);
    ctx.fill();
    ctx.fillStyle = '#567';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(items[i].label, x + itemW / 2, y + 26);
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(items[i].value, x + itemW / 2, y + 56);
  }
}

function drawProfileHint(ctx, hasProfile, layout) {
  if (hasProfile) return;
  const cardW = Math.min(layout.w * 0.85, 480);
  const cardH = 52;
  const cardX = layout.w / 2 - cardW / 2;
  const cardY = layout.h * 0.8;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 16); ctx.fill();
  ctx.fillStyle = '#3498DB';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '22px Arial';
  ctx.fillText('Nhập tên & tuổi bé trước khi bắt đầu nhé!', layout.w / 2, cardY + cardH / 2);
  ctx.restore();
}

export function drawMenuScreen(ctx, frameCount, opts = {}, layout) {
  layout = ensureLayout(layout);
  const { hasProfile = true, showDebugReset = false } = opts;
  initDecor(layout);
  drawBackground(ctx, layout);

  const bounceY = Math.sin(frameCount * 0.03) * (layout.isPhone ? 8 : 5);
  const centerX = layout.w / 2;
  const titleSize = layout.isPhone ? 54 : 66;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2C3E50';
  ctx.font = `bold ${titleSize}px Arial`;
  ctx.fillText('Bướm Bay Mắt Vui', centerX, layout.safeTop + 130 + bounceY);
  ctx.restore();

  ctx.fillStyle = '#425466';
  ctx.textAlign = 'center';
  ctx.font = `${layout.isPhone ? 28 : 30}px Arial`;
  ctx.fillText('Trò chơi tập mắt vui nhộn cho bé', centerX, layout.safeTop + 182);

  const startW = Math.min(layout.w * 0.84, 430);
  const startH = 86;
  const startX = centerX - startW / 2;
  const startY = layout.h * 0.43;
  ctx.fillStyle = '#1E88E5';
  drawRoundRect(ctx, startX, startY, startW, startH, 26); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${layout.isPhone ? 42 : 36}px Arial`;
  ctx.fillText('BẮT ĐẦU CHƠI', centerX, startY + startH / 2);

  const reportW = Math.min(layout.w * 0.72, 360);
  const reportH = 62;
  const reportX = centerX - reportW / 2;
  const reportY = startY + startH + 18;
  ctx.fillStyle = '#95A5A6';
  drawRoundRect(ctx, reportX, reportY, reportW, reportH, 18); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${layout.isPhone ? 34 : 28}px Arial`;
  ctx.fillText('Xem Báo Cáo', centerX, reportY + reportH / 2);

  _menuBtns.start = { x: startX, y: startY, w: startW, h: startH };
  _menuBtns.report = { x: reportX, y: reportY, w: reportW, h: reportH };
  _menuBtns.resetCache = null;

  if (showDebugReset) {
    const resetW = reportW;
    const resetH = 52;
    const resetY = reportY + reportH + 12;
    ctx.fillStyle = '#E67E22';
    drawRoundRect(ctx, centerX - resetW / 2, resetY, resetW, resetH, 16); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Reset Cache', centerX, resetY + resetH / 2);
    _menuBtns.resetCache = { x: centerX - resetW / 2, y: resetY, w: resetW, h: resetH };
  }

  drawProfileHint(ctx, hasProfile, layout);
  if (layout.isPhone) drawCornerHint(ctx, layout);

  for (let i = 0; i < _decorButterflies.length; i += 1) {
    _decorButterflies[i].update(16.67);
    _decorButterflies[i].draw(ctx);
  }
}

export function drawLevelEndScreen(ctx, stars, levelIndex, frameCount, session = null, layout) {
  layout = ensureLayout(layout);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, layout.w, layout.h);

  const modal = layout.buttons.modal;
  const cardX = modal.x;
  const cardY = modal.y;
  const cardW = modal.w;
  const cardH = modal.h;

  ctx.fillStyle = '#FFFFFF';
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();

  const revealed = [frameCount > 30, frameCount > 60, frameCount > 90];
  const waveScale = 1 + Math.sin(frameCount * 0.1) * 0.08;
  drawStar(ctx, layout.w / 2 - 82, cardY + 86, 24, revealed[0] && stars >= 1, waveScale);
  drawStar(ctx, layout.w / 2, cardY + 76, 30, revealed[1] && stars >= 2, waveScale);
  drawStar(ctx, layout.w / 2 + 82, cardY + 86, 24, revealed[2] && stars >= 3, waveScale);

  ctx.fillStyle = '#2C3E50';
  ctx.textAlign = 'center';
  ctx.font = `bold ${layout.isPhone ? 28 : 30}px Arial`;
  ctx.fillText(stars >= 2 ? 'Con làm rất tốt!' : 'Cố gắng thêm nhé!', layout.w / 2, cardY + 150);

  if (session) drawStatsStrip(ctx, cardX, cardY, cardW, cardH, session);

  const nextLabel = levelIndex < 3 ? 'Màn tiếp' : 'Hoàn thành';
  const btnW = cardW - 40;
  const btnH = 54;
  const nextBtn = { x: cardX + 20, y: cardY + cardH - 128, w: btnW, h: btnH };
  const halfW = (btnW - 10) / 2;
  const replayBtn = { x: cardX + 20, y: cardY + cardH - 66, w: halfW, h: 50 };
  const menuBtn = { x: cardX + 30 + halfW, y: cardY + cardH - 66, w: halfW, h: 50 };

  ctx.fillStyle = '#3498DB'; drawRoundRect(ctx, nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h, 14); ctx.fill();
  ctx.fillStyle = '#F39C12'; drawRoundRect(ctx, replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 14); ctx.fill();
  ctx.fillStyle = '#7F8C8D'; drawRoundRect(ctx, menuBtn.x, menuBtn.y, menuBtn.w, menuBtn.h, 14); ctx.fill();

  ctx.fillStyle = '#FFF';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(nextLabel, nextBtn.x + nextBtn.w / 2, nextBtn.y + nextBtn.h / 2);
  ctx.font = 'bold 22px Arial';
  ctx.fillText('Chơi lại', replayBtn.x + replayBtn.w / 2, replayBtn.y + replayBtn.h / 2);
  ctx.fillText('Về menu', menuBtn.x + menuBtn.w / 2, menuBtn.y + menuBtn.h / 2);

  _levelEndBtns.next = nextBtn;
  _levelEndBtns.replay = replayBtn;
  _levelEndBtns.menu = menuBtn;
}

export function handleMenuClick(x, y) {
  if (hit(_menuBtns.start, x, y)) return 'start';
  if (hit(_menuBtns.report, x, y)) return 'report';
  if (hit(_menuBtns.resetCache, x, y)) return 'reset_cache';
  return null;
}

export function handleLevelEndClick(x, y) {
  if (hit(_levelEndBtns.next, x, y)) return 'next';
  if (hit(_levelEndBtns.replay, x, y)) return 'replay';
  if (hit(_levelEndBtns.menu, x, y)) return 'menu';
  return null;
}
