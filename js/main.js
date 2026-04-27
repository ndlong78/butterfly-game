import { States, getCurrentState, transition } from './state.js';
import { CANVAS, GAME } from './config.js';
import { initBackground, updateBackground, drawBackground, refreshBackgroundLayout } from './background.js';
import { initInput, getPointer, getHoldDuration, consumeTap, destroyInput } from './input.js';
import { initLevel, updateGameplay, drawGameplay, getSessionData, handleGameplayClick } from './gameplay.js';
import {
  startCamera,
  stopCamera,
  analyzeFrame,
  drawEyeCheckScreen,
  isSkipButton,
  getCameraErrorCode,
} from './camera.js';
import { initVoice, speak, destroyVoice, unlockAudio } from './voice.js';
import { saveSession, drawReportScreen, exportPDF, handleReportClick } from './report.js';
import { drawMenuScreen, drawLevelEndScreen, handleMenuClick, handleLevelEndClick } from './screens.js';
import { isMobileLayout, isPortraitLayout } from './viewport.js';

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
  throw new Error('Không tìm thấy canvas #gameCanvas');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Không thể khởi tạo Canvas 2D context');
}

const APP_PROFILE_KEY = 'butterflygame_profile_v2';
const PARENT_PIN_KEY = 'butterflygame_parent_pin';
const DEFAULT_CHILD_NAME = 'Bé 4-7 tuổi';
const DEFAULT_CHILD_AGE = '5';

let _currentLevel = 0;
let _frameCount = 0;
let _eyeCheckTimer = 0;
let _eyeCheckStatus = 'waiting';
let _levelEndFrame = 0;
let _holdCornerTimer = 0;
let _lastSession = null;

let _lastTime = 0;
let _canvasCssWidth = 0;
let _canvasCssHeight = 0;
let _eyeAnalyzeTick = 0;
let _eyeCheckFlowId = 0;

/**
 * Mắt đang được kiểm tra trong phiên hiện tại.
 * Hiện game chỉ kiểm tra 1 mắt mỗi phiên — mở rộng sau.
 * @type {'left'|'right'}
 */
let _eyeSide = 'left';

let _childName = DEFAULT_CHILD_NAME;
let _childAge = DEFAULT_CHILD_AGE;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const mobilePortrait = isMobileLayout() && isPortraitLayout();

  let scaleX = 1;
  let scaleY = 1;

  if (mobilePortrait) {
    _canvasCssWidth = Math.max(1, Math.floor(viewportW));
    _canvasCssHeight = Math.max(1, Math.floor(viewportH));
    scaleX = _canvasCssWidth / CANVAS.WIDTH;
    scaleY = _canvasCssHeight / CANVAS.HEIGHT;
  } else {
    const uniformScale = Math.min(viewportW / CANVAS.WIDTH, viewportH / CANVAS.HEIGHT);
    _canvasCssWidth = Math.max(1, Math.floor(CANVAS.WIDTH * uniformScale));
    _canvasCssHeight = Math.max(1, Math.floor(CANVAS.HEIGHT * uniformScale));
    scaleX = uniformScale;
    scaleY = uniformScale;
  }

  canvas.width = Math.floor(Math.max(1, _canvasCssWidth * dpr));
  canvas.height = Math.floor(Math.max(1, _canvasCssHeight * dpr));
  canvas.style.width = `${_canvasCssWidth}px`;
  canvas.style.height = `${_canvasCssHeight}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${Math.floor((viewportW - _canvasCssWidth) / 2)}px`;
  canvas.style.top = `${Math.floor((viewportH - _canvasCssHeight) / 2)}px`;

  ctx.setTransform(dpr * scaleX, 0, 0, dpr * scaleY, 0, 0);

  refreshBackgroundLayout();
}

function ensureDefaultProfile() {
  const raw = localStorage.getItem(APP_PROFILE_KEY);
  if (!raw) {
    localStorage.setItem(
      APP_PROFILE_KEY,
      JSON.stringify({
        name: DEFAULT_CHILD_NAME,
        age: DEFAULT_CHILD_AGE,
      }),
    );
    _childName = DEFAULT_CHILD_NAME;
    _childAge = DEFAULT_CHILD_AGE;
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    _childName = (parsed.name || DEFAULT_CHILD_NAME).trim() || DEFAULT_CHILD_NAME;
    _childAge = (parsed.age || DEFAULT_CHILD_AGE).trim() || DEFAULT_CHILD_AGE;
  } catch {
    _childName = DEFAULT_CHILD_NAME;
    _childAge = DEFAULT_CHILD_AGE;
  }
}

function getParentPin() {
  return (localStorage.getItem(PARENT_PIN_KEY) || '').trim();
}

function ensureParentPinConfigured() {
  const currentPin = getParentPin();
  if (currentPin) {
    return true;
  }

  const createdPin = prompt('Thiết lập mã phụ huynh (4-8 chữ số):');
  if (!createdPin) {
    return false;
  }

  const pin = createdPin.trim();
  if (!/^\d{4,8}$/.test(pin)) {
    alert('Mã phụ huynh cần từ 4 đến 8 chữ số.');
    return false;
  }

  localStorage.setItem(PARENT_PIN_KEY, pin);
  alert('Đã lưu mã phụ huynh. Giữ kín mã để bảo vệ báo cáo của bé.');
  return false;
}

function verifyParentAccess() {
  if (!ensureParentPinConfigured()) {
    return false;
  }

  const pin = getParentPin();
  const input = prompt('Nhập mã phụ huynh:');
  return Boolean(input && input.trim() === pin);
}

function showScreen(name) {
  const from = getCurrentState();
  if (from === States.EYE_CHECK && name !== States.EYE_CHECK) {
    stopCamera();
  }

  transition(name);
}

function goToPlaying() {
  initLevel(_currentLevel);
  showScreen(States.PLAYING);
}

function startEyeCheck() {
  _eyeCheckFlowId += 1;
  const flowId = _eyeCheckFlowId;

  _eyeCheckTimer = 0;
  _eyeAnalyzeTick = 0;
  _eyeCheckStatus = 'waiting';

  const sessions = JSON.parse(localStorage.getItem('butterflygame_sessions') || '[]');
  _eyeSide = sessions.length % 2 === 0 ? 'left' : 'right';

  showScreen(States.EYE_CHECK);

  startCamera().catch(() => {
    if (flowId !== _eyeCheckFlowId || getCurrentState() !== States.EYE_CHECK) {
      return;
    }

    stopCamera();
    const code = getCameraErrorCode();
    window.__eyeCheckResult = code || 'camera_error';
    _eyeCheckStatus = 'camera_error';
    goToPlaying();
  });
}

function pointInCorner(x, y) {
  return x >= CANVAS.WIDTH - 50 && y >= CANVAS.HEIGHT - 50;
}

async function clearPwaCacheAndReload() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (let i = 0; i < regs.length; i += 1) {
      await regs[i].unregister();
    }

    const keys = await caches.keys();
    for (let i = 0; i < keys.length; i += 1) {
      await caches.delete(keys[i]);
    }

    window.location.reload();
  } catch (error) {
    alert('Không thể reset cache. Vui lòng đóng app và mở lại.');
    console.warn('[PWA] Reset cache lỗi:', error);
  }
}

function mountDebugResetButton() {
  const btn = document.getElementById('resetCacheBtn');
  if (!btn) {
    return;
  }

  btn.addEventListener('click', () => {
    clearPwaCacheAndReload();
  });
}

function handleTap(x, y) {
  const state = getCurrentState();

  if (state === States.MENU) {
    const action = handleMenuClick(x, y);
    if (action === 'start') {
      unlockAudio()
        .then(() => speak('WELCOME'))
        .catch(() => null);
      startEyeCheck();
    } else if (action === 'report') {
      if (verifyParentAccess()) {
        showScreen(States.REPORT);
      }
    } else if (action === 'reset_cache') {
      clearPwaCacheAndReload();
    }
    return;
  }

  if (state === States.EYE_CHECK) {
    if (isSkipButton(x, y)) {
      _eyeCheckFlowId += 1;
      window.__eyeCheckResult = 'skipped';
      _currentLevel = 0;
      goToPlaying();
    }
    return;
  }

  if (state === States.LEVEL_END) {
    const action = handleLevelEndClick(x, y);

    if (action === 'next') {
      _currentLevel = Math.min(_currentLevel + 1, 3);
      initLevel(_currentLevel);
      showScreen(States.PLAYING);
    } else if (action === 'replay') {
      unlockAudio().catch(() => null);
      initLevel(_currentLevel);
      showScreen(States.PLAYING);
    } else if (action === 'menu') {
      _currentLevel = 0;
      showScreen(States.MENU);
    }
    return;
  }

  if (state === States.PLAYING) {
    handleGameplayClick(x, y);
    return;
  }

  if (state === States.REPORT) {
    const action = handleReportClick(x, y);
    if (action === 'pdf') {
      exportPDF(_childName, _childAge);
    } else if (action === 'menu') {
      showScreen(States.MENU);
    }
  }
}

function updateHiddenTrigger(dt) {
  const ptr = getPointer();
  if (ptr.isDown && pointInCorner(ptr.x, ptr.y)) {
    _holdCornerTimer += dt;

    if (_holdCornerTimer > 3000) {
      if (verifyParentAccess()) {
        showScreen(States.REPORT);
      }
      _holdCornerTimer = 0;
    }
  } else {
    _holdCornerTimer = 0;
  }
}

function loop(timestamp) {
  if (_lastTime === 0) {
    _lastTime = timestamp;
  }

  const dt = Math.min(timestamp - _lastTime, 50);
  _lastTime = timestamp;
  _frameCount += 1;

  const tap = consumeTap();
  if (tap) {
    handleTap(tap.x, tap.y);
  }

  updateHiddenTrigger(dt);
  updateBackground(dt);

  ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  switch (getCurrentState()) {
    case States.MENU:
      drawMenuScreen(ctx, _frameCount, { hasProfile: Boolean(_childName) });
      break;

    case States.EYE_CHECK: {
      _eyeCheckTimer += dt;
      _eyeAnalyzeTick += dt;

      if (_eyeAnalyzeTick >= 500) {
        const result = analyzeFrame();
        _eyeCheckStatus = result.result;
        _eyeAnalyzeTick = 0;
      }

      if (_eyeCheckTimer >= GAME.EYE_CHECK_SECONDS * 1000 || _eyeCheckStatus === 'covered') {
        _eyeCheckFlowId += 1;
        window.__eyeCheckResult = _eyeCheckStatus;
        if (_eyeCheckStatus === 'covered') {
          speak('EYE_COVERED_OK');
        }
        goToPlaying();
      }

      const ratio = _eyeCheckTimer / (GAME.EYE_CHECK_SECONDS * 1000);
      drawEyeCheckScreen(ctx, _eyeCheckStatus, ratio, { eyeSide: _eyeSide });
      break;
    }

    case States.PLAYING: {
      const result = updateGameplay(dt);
      drawGameplay(ctx);

      if (result === 'complete') {
        const data = getSessionData();
        saveSession(data);
        _lastSession = data;
        _levelEndFrame = 0;
        showScreen(States.LEVEL_END);
      }
      break;
    }

    case States.LEVEL_END: {
      _levelEndFrame += 1;
      const stars = _lastSession ? _lastSession.stars : 1;
      drawLevelEndScreen(ctx, stars, _currentLevel, _levelEndFrame, _lastSession);
      break;
    }

    case States.REPORT:
      drawReportScreen(ctx, _childName);
      break;

    default:
      drawBackground(ctx);
      break;
  }

  requestAnimationFrame(loop);
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('[PWA] Không thể đăng ký service worker:', error);
    });
  });
}

function teardown() {
  stopCamera();
  destroyInput();
  destroyVoice();
}

window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
}
window.addEventListener('beforeunload', teardown);

ensureDefaultProfile();
initBackground();
resizeCanvas();
initInput(canvas);
initVoice();
mountDebugResetButton();
setupServiceWorker();
showScreen(States.MENU);
requestAnimationFrame(loop);

console.log(`[Main] Target FPS: ${CANVAS.TARGET_FPS}`);
console.log(`[Main] Hold: ${getHoldDuration()}ms`);
