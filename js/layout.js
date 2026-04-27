function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function detectTablet(w, h) {
  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);
  return shortSide >= 768 || (shortSide >= 600 && longSide >= 960);
}

function readSafeAreaInset(varName) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

export function getLayout() {
  const w = Math.max(1, Math.floor(window.innerWidth));
  const h = Math.max(1, Math.floor(window.innerHeight));
  const dpr = clamp(window.devicePixelRatio || 1, 1, 3);

  const safeTop = readSafeAreaInset('--sat') || readSafeAreaInset('padding-top');
  const safeBottom = readSafeAreaInset('--sab') || readSafeAreaInset('padding-bottom');
  const safeLeft = readSafeAreaInset('--sal') || readSafeAreaInset('padding-left');
  const safeRight = readSafeAreaInset('--sar') || readSafeAreaInset('padding-right');

  const isPortrait = h >= w;
  const isTablet = detectTablet(w, h);
  const isPhone = !isTablet;

  const hudHeight = clamp(isPhone ? h * 0.1 : h * 0.085, 64, isPhone ? 76 : 88);
  const hudY = safeTop + 8;
  const hud = {
    x: safeLeft + 12,
    y: hudY,
    w: Math.max(120, w - safeLeft - safeRight - 24),
    h: hudHeight,
  };

  const instructionH = clamp(isPhone ? h * 0.042 : h * 0.036, 30, 44);
  const playTop = hud.y + hud.h + instructionH + 10;
  const bottomPadding = Math.max(safeBottom + 20, isPhone ? 32 : 26);
  const playBottom = h - bottomPadding;

  const playArea = {
    x: safeLeft + 16,
    y: playTop,
    w: Math.max(160, w - safeLeft - safeRight - 32),
    h: Math.max(140, playBottom - playTop),
  };

  const skyH = Math.floor(h * clamp(isPortrait ? 0.6 : 0.58, 0.58, 0.62));
  const ground = {
    x: 0,
    y: skyH,
    w,
    h: h - skyH,
  };
  const sky = { x: 0, y: 0, w, h: skyH };

  const modalW = Math.min(Math.floor(w * clamp(isPhone ? 0.9 : 0.86, 0.86, 0.92)), 430);
  const modalH = Math.min(Math.floor(h * (isPhone ? 0.6 : 0.56)), 520);
  const modalY = clamp((h - modalH) / 2, safeTop + 12, h - safeBottom - modalH - 12);

  return {
    w,
    h,
    dpr,
    safeTop,
    safeBottom,
    safeLeft,
    safeRight,
    isPortrait,
    isPhone,
    isTablet,
    hud,
    playArea,
    ground,
    sky,
    buttons: {
      modal: {
        w: modalW,
        h: modalH,
        x: Math.floor((w - modalW) / 2),
        y: Math.floor(modalY),
      },
    },
  };
}
