import { CANVAS, GAME, VOICE_TEXTS } from './config.js';

let _video = null;
let _offscreen = null;
let _offCtx = null;
let _stream = null;
let _skipBounds = null;

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

export async function startCamera() {
  _stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: 320,
      height: 240,
    },
  });

  _video = document.createElement('video');
  _video.autoplay = true;
  _video.muted = true;
  _video.playsInline = true;
  _video.srcObject = _stream;
  _video.style.display = 'none';
  document.body.appendChild(_video);
  await _video.play();

  _offscreen = new OffscreenCanvas(320, 240);
  _offCtx = _offscreen.getContext('2d');
}

export function stopCamera() {
  if (_stream) {
    _stream.getTracks().forEach((track) => track.stop());
  }

  if (_video) {
    _video.remove();
  }

  _video = null;
  _stream = null;
  _offscreen = null;
  _offCtx = null;
}

export function analyzeFrame() {
  if (!_video || _video.readyState < 2 || !_offCtx) {
    return { result: 'unclear', confidence: 0 };
  }

  _offCtx.drawImage(_video, 0, 0, 320, 240);

  const getRegionBrightness = (x1, y1, x2, y2) => {
    const imageData = _offCtx.getImageData(x1, y1, x2 - x1, y2 - y1).data;
    let sum = 0;
    const totalPixels = imageData.length / 4;

    for (let i = 0; i < imageData.length; i += 4) {
      sum += imageData[i] * 0.299 + imageData[i + 1] * 0.587 + imageData[i + 2] * 0.114;
    }

    return totalPixels > 0 ? sum / totalPixels : 0;
  };

  const leftBright = getRegionBrightness(40, 80, 120, 160);
  const rightBright = getRegionBrightness(200, 80, 280, 160);
  const diff = Math.abs(leftBright - rightBright);
  const confidence = Math.min(diff / GAME.BRIGHTNESS_THRESHOLD, 1);
  const result = diff > GAME.BRIGHTNESS_THRESHOLD ? 'covered' : 'uncovered';

  return { result, confidence };
}

export function drawEyeCheckScreen(ctx, status, progressRatio) {
  const { WIDTH, HEIGHT } = CANVAS;

  const bgGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bgGradient.addColorStop(0, '#DFF6FF');
  bgGradient.addColorStop(1, '#EAFBFF');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (_video && _video.readyState >= 2) {
    ctx.drawImage(_video, WIDTH - 190, 20, 160, 120);
  }
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeRect(WIDTH - 190, 20, 160, 120);

  const baseX = WIDTH / 2 - 100;
  const baseY = HEIGHT / 2 - 80;

  ctx.fillStyle = '#FFDAB9';
  ctx.beginPath();
  ctx.arc(baseX + 100, baseY + 80, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(baseX + 130, baseY + 70, 12, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(baseX + 123, baseY + 58);
  ctx.lineTo(baseX + 120, baseY + 50);
  ctx.moveTo(baseX + 130, baseY + 56);
  ctx.lineTo(baseX + 130, baseY + 47);
  ctx.moveTo(baseX + 137, baseY + 58);
  ctx.lineTo(baseX + 140, baseY + 50);
  ctx.stroke();

  ctx.fillStyle = '#4A4A4A';
  drawRoundRect(ctx, baseX + 52, baseY + 52, 36, 30, 8);
  ctx.fill();

  ctx.strokeStyle = '#C0392B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(baseX + 102, baseY + 110, 22, 0.1, Math.PI - 0.1);
  ctx.stroke();

  ctx.fillStyle = '#FFDAB9';
  drawRoundRect(ctx, baseX + 28, baseY + 105, 64, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#4A4A4A';
  drawRoundRect(ctx, baseX + 20, baseY + 95, 46, 34, 8);
  ctx.fill();

  let message = 'Không nhìn rõ mặt con, thử lại nhé!';
  let messageColor = '#F39C12';

  if (status === 'waiting') {
    message = VOICE_TEXTS.EYE_CHECK_PROMPT;
    messageColor = '#3A3A3A';
  } else if (status === 'covered') {
    message = VOICE_TEXTS.EYE_COVERED_OK;
    messageColor = '#27AE60';
  } else if (status === 'uncovered') {
    message = VOICE_TEXTS.EYE_NOT_COVERED;
    messageColor = '#E74C3C';
  }

  ctx.fillStyle = messageColor;
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(message, WIDTH / 2, HEIGHT / 2 + 170);

  const barX = WIDTH / 2 - 200;
  const barY = HEIGHT - 80;
  const barWidth = 400;
  const barHeight = 20;
  const clampedProgress = Math.max(0, Math.min(progressRatio, 1));

  ctx.fillStyle = '#DDD';
  drawRoundRect(ctx, barX, barY, barWidth, barHeight, 10);
  ctx.fill();

  ctx.fillStyle = '#2ECC71';
  drawRoundRect(ctx, barX, barY, barWidth * clampedProgress, barHeight, 10);
  ctx.fill();

  const skipX = WIDTH - 170;
  const skipY = HEIGHT - 60;
  const skipW = 150;
  const skipH = 40;

  if (!_skipBounds) {
    _skipBounds = { x: skipX, y: skipY, w: skipW, h: skipH };
  } else {
    _skipBounds.x = skipX;
    _skipBounds.y = skipY;
    _skipBounds.w = skipW;
    _skipBounds.h = skipH;
  }

  ctx.fillStyle = '#888';
  drawRoundRect(ctx, skipX, skipY, skipW, skipH, 10);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Bỏ qua', skipX + skipW / 2, skipY + skipH / 2);
  ctx.textBaseline = 'alphabetic';
}

export function isSkipButton(x, y) {
  if (!_skipBounds) {
    return false;
  }

  return (
    x >= _skipBounds.x &&
    x <= _skipBounds.x + _skipBounds.w &&
    y >= _skipBounds.y &&
    y <= _skipBounds.y + _skipBounds.h
  );
}
