import { CANVAS, GAME, VOICE_TEXTS } from './config.js';
import { drawRoundRect } from './canvas-utils.js';

let _video = null;
let _offscreen = null;
let _offCtx = null;
let _stream = null;
let _skipBounds = null;
let _cameraRequestId = 0;
let _lastCameraError = null;

function createProcessCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  const fallback = document.createElement('canvas');
  fallback.width = width;
  fallback.height = height;
  return fallback;
}

export async function startCamera() {
  const requestId = _cameraRequestId + 1;
  _cameraRequestId = requestId;
  _lastCameraError = null;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    _lastCameraError = 'unsupported_media_devices';
    throw new Error('Thiết bị không hỗ trợ camera');
  }

  let stream = null;
  let video = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: 320,
        height: 240,
      },
    });

    if (requestId !== _cameraRequestId) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('Camera request đã hết hạn');
    }

    video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.style.display = 'none';
    document.body.appendChild(video);

    await video.play();

    if (requestId !== _cameraRequestId) {
      stream.getTracks().forEach((track) => track.stop());
      video.remove();
      throw new Error('Camera request đã hết hạn sau khi play');
    }

    const offscreen = createProcessCanvas(320, 240);
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) {
      throw new Error('Không thể tạo context xử lý camera');
    }

    _stream = stream;
    _video = video;
    _offscreen = offscreen;
    _offCtx = offCtx;
  } catch (error) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.remove();
    }

    _stream = null;
    _video = null;
    _offscreen = null;
    _offCtx = null;

    if (error && error.name === 'NotAllowedError') {
      _lastCameraError = 'permission_denied';
    } else if (!_lastCameraError) {
      _lastCameraError = 'camera_error';
    }

    throw error;
  }
}

export function stopCamera() {
  _cameraRequestId += 1;

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

export function getCameraErrorCode() {
  return _lastCameraError;
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

/**
 * Vẽ status badge màu động phía trên thanh progress.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} status
 * @param {number} centerX
 * @param {number} badgeY
 * @param {boolean} mobile
 */
function drawStatusBadge(ctx, status, centerX, badgeY, mobile) {
  let message = 'Không nhìn rõ mặt con, thử lại nhé!';
  let bgColor = 'rgba(243, 156, 18, 0.15)';
  let textColor = '#F39C12';
  let borderColor = 'rgba(243, 156, 18, 0.4)';

  if (status === 'waiting') {
    message = VOICE_TEXTS.EYE_CHECK_PROMPT;
    bgColor = 'rgba(52, 152, 219, 0.12)';
    textColor = '#2980B9';
    borderColor = 'rgba(52, 152, 219, 0.35)';
  } else if (status === 'covered') {
    message = VOICE_TEXTS.EYE_COVERED_OK;
    bgColor = 'rgba(39, 174, 96, 0.15)';
    textColor = '#27AE60';
    borderColor = 'rgba(39, 174, 96, 0.4)';
  } else if (status === 'uncovered') {
    message = VOICE_TEXTS.EYE_NOT_COVERED;
    bgColor = 'rgba(231, 76, 60, 0.12)';
    textColor = '#E74C3C';
    borderColor = 'rgba(231, 76, 60, 0.35)';
  } else if (status === 'camera_error') {
    message = 'Camera chưa sẵn sàng, trò chơi sẽ tiếp tục.';
    bgColor = 'rgba(230, 126, 34, 0.12)';
    textColor = '#E67E22';
    borderColor = 'rgba(230, 126, 34, 0.35)';
  }

  const fontSize = mobile ? 32 : 28;
  ctx.font = `bold ${fontSize}px Arial`;
  const textWidth = ctx.measureText(message).width;
  const padH = mobile ? 20 : 16;
  const padV = mobile ? 14 : 10;
  const badgeW = textWidth + padH * 2;
  const badgeH = fontSize + padV * 2;
  const badgeX = centerX - badgeW / 2;

  ctx.save();
  ctx.fillStyle = bgColor;
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, centerX, badgeY + badgeH / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/**
 * Vẽ nhãn mắt đang kiểm tra (chỉ hiện trên mobile).
 * @param {CanvasRenderingContext2D} ctx
 * @param {'left'|'right'} eyeSide
 * @param {number} centerX
 * @param {number} y
 */
function drawEyeSideLabel(ctx, eyeSide, centerX, y) {
  const label = eyeSide === 'left' ? 'Mắt trái' : 'Mắt phải';
  const cardW = 320;
  const cardH = 52;
  const cardX = centerX - cardW / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  drawRoundRect(ctx, cardX, y, cardW, cardH, 12);
  ctx.fill();

  ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
  ctx.lineWidth = 1;
  drawRoundRect(ctx, cardX, y, cardW, cardH, 12);
  ctx.stroke();

  ctx.fillStyle = '#7F8C8D';
  ctx.font = '22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Đang kiểm tra:', centerX - 50, y + cardH / 2);

  ctx.fillStyle = '#1565C0';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(label, centerX + 60, y + cardH / 2);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} status
 * @param {number} progressRatio
 * @param {object} [opts]
 * @param {'left'|'right'} [opts.eyeSide='left'] - mắt đang kiểm tra
 */
export function drawEyeCheckScreen(ctx, status, progressRatio, opts = {}) {
  const { eyeSide = 'left' } = opts;
  const { WIDTH, HEIGHT } = CANVAS;
  const mobile = window.innerHeight > window.innerWidth || window.innerWidth <= 900;

  const bgGradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bgGradient.addColorStop(0, '#DFF6FF');
  bgGradient.addColorStop(1, '#EAFBFF');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Camera preview
  if (_video && _video.readyState >= 2) {
    ctx.drawImage(_video, WIDTH - 190, 20, 160, 120);
  }
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeRect(WIDTH - 190, 20, 160, 120);

  // Camera label
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(WIDTH - 190, 130, 160, 20);
  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Camera', WIDTH - 110, 145);

  const baseX = WIDTH / 2 - 100;
  const baseY = HEIGHT / 2 - 80;

  // Face illustration
  ctx.fillStyle = '#FFDAB9';
  ctx.beginPath();
  ctx.arc(baseX + 100, baseY + 80, 70, 0, Math.PI * 2);
  ctx.fill();

  const checkingLeft = eyeSide === 'left';

  // Open eye (mắt không che)
  const openEyeX = checkingLeft ? baseX + 130 : baseX + 70;
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(openEyeX, baseY + 70, 12, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(openEyeX - 7, baseY + 58);
  ctx.lineTo(openEyeX - 10, baseY + 50);
  ctx.moveTo(openEyeX, baseY + 56);
  ctx.lineTo(openEyeX, baseY + 47);
  ctx.moveTo(openEyeX + 7, baseY + 58);
  ctx.lineTo(openEyeX + 10, baseY + 50);
  ctx.stroke();

  // Eye patch (mắt đang kiểm tra)
  const patchX = checkingLeft ? baseX + 52 : baseX + 112;
  ctx.fillStyle = '#4A4A4A';
  drawRoundRect(ctx, patchX, baseY + 52, 36, 30, 8);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#C0392B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(baseX + 102, baseY + 110, 22, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Hand covering eye
  const handX = checkingLeft ? baseX + 28 : baseX + 108;
  const sleeveX = checkingLeft ? baseX + 20 : baseX + 100;
  ctx.fillStyle = '#FFDAB9';
  drawRoundRect(ctx, handX, baseY + 105, 64, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#4A4A4A';
  drawRoundRect(ctx, sleeveX, baseY + 95, 46, 34, 8);
  ctx.fill();

  // Status badge — vị trí điều chỉnh theo portrait/landscape
  const badgeY = HEIGHT / 2 + (mobile ? 140 : 130);
  drawStatusBadge(ctx, status, WIDTH / 2, badgeY, mobile);

  // Progress bar
  const barX = WIDTH / 2 - 200;
  const barY = HEIGHT - (mobile ? 120 : 100);
  const barWidth = 400;
  const barHeight = 20;
  const clampedProgress = Math.max(0, Math.min(progressRatio, 1));

  ctx.fillStyle = '#DDD';
  drawRoundRect(ctx, barX, barY, barWidth, barHeight, 10);
  ctx.fill();

  ctx.fillStyle = '#2ECC71';
  if (clampedProgress > 0) {
    drawRoundRect(ctx, barX, barY, barWidth * clampedProgress, barHeight, 10);
    ctx.fill();
  }

  // Nhãn mắt đang kiểm tra — chỉ mobile
  if (mobile) {
    drawEyeSideLabel(ctx, eyeSide, WIDTH / 2, barY + 30);
  }

  const remainSeconds = Math.max(0, Math.ceil((1 - clampedProgress) * GAME.EYE_CHECK_SECONDS));
  ctx.fillStyle = '#5D6D7E';
  ctx.font = mobile ? '24px Arial' : '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Giữ nguyên... ${remainSeconds}s`, WIDTH / 2, barY - 12);

  // Skip button
  const skipX = WIDTH / 2 - 75;
  const skipY = HEIGHT - (mobile ? 55 : 52);
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
