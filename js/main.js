import { States, getCurrentState, transition } from './state.js';
import { CANVAS, GAME } from './config.js';
import { initBackground, updateBackground, drawBackground } from './background.js';
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
import { initVoice, speak, destroyVoice } from './voice.js';
import { saveSession, drawReportScreen, exportPDF, handleReportClick } from './report.js';
import { drawMenuScreen, drawLevelEndScreen, handleMenuClick, handleLevelEndClick } from './screens.js';

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
  throw new Error('Không tìm thấy canvas #gameCanvas');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Không thể khởi tạo Canvas 2D context');
}

const CHILD_NAME_KEY = 'butterflygame_child_name';
const CHILD_AGE_KEY = 'butterflygame_child_age';
const PARENT_PIN_KEY = 'butterflygame_parent_pin';

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

let _childName = '';
let _childAge = '';

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const fitScale = Math.min(window.innerWidth / CANVAS.WIDTH, window.innerHeight / CANVAS.HEIGHT);
  const isPortrait = window.innerHeight > window.innerWidth;
  let scale = fitScale;

  if (isPortrait) {
    const mobileVisibleWidth = 760;
    const portraitZoomScale = window.innerWidth / mobileVisibleWidth;
    const maxScale = window.innerHeight / CANVAS.HEIGHT;
    scale = Math.max(fitScale, Math.min(portraitZoomScale, maxScale));
  }

  _canvasCssWidth = Math.floor(CANVAS.WIDTH * scale);
  _canvasCssHeight = Math.floor(CANVAS.HEIGHT * scale);

  canvas.width = Math.floor(_canvasCssWidth * dpr);
  canvas.height = Math.floor(_canvasCssHeight * dpr);
  canvas.style.width = `${_canvasCssWidth}px`;
  canvas.style.height = `${_canvasCssHeight}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${Math.floor((window.innerWidth - _canvasCssWidth) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - _canvasCssHeight) / 2)}px`;

  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
}

function loadChildProfile() {
  _childName = (localStorage.getItem(CHILD_NAME_KEY) || '').trim();
  _childAge = (localStorage.getItem(CHILD_AGE_KEY) || '').trim();
}

function requestChildProfile() {
  if (!_childName) {
    const name = prompt('Nhập tên bé:');
    if (name) {
      _childName = name.trim();
      localStorage.setItem(CHILD_NAME_KEY, _childName);
    }
  }

  if (!_childAge) {
    const age = prompt('Nhập tuổi bé (2-18):');
    if (age && /^\d+$/.test(age)) {
      const ageNum = Number(age);
      if (ageNum >= 2 && ageNum <= 18) {
        _childAge = String(ageNum);
        localStorage.setItem(CHILD_AGE_KEY, _childAge);
      }
    }
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

function goToPlaying() {
  stopCamera();
  initLevel(_currentLevel);
  transition(States.PLAYING);
}

function startEyeCheck() {
  _eyeCheckFlowId += 1;
  const flowId = _eyeCheckFlowId;

  _eyeCheckTimer = 0;
  _eyeAnalyzeTick = 0;
  _eyeCheckStatus = 'waiting';
  transition(States.EYE_CHECK);

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

function handleTap(x, y) {
  const state = getCurrentState();

  if (state === States.MENU) {
    const action = handleMenuClick(x, y);
    if (action === 'start') {
      requestChildProfile();
      speak('WELCOME');
      startEyeCheck();
    } else if (action === 'report') {
      if (verifyParentAccess()) {
        transition(States.REPORT);
      }
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
      transition(States.PLAYING);
    } else if (action === 'replay') {
      initLevel(_currentLevel);
      transition(States.PLAYING);
    } else if (action === 'menu') {
      _currentLevel = 0;
      transition(States.MENU);
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
      transition(States.MENU);
    }
  }
}

function updateHiddenTrigger(dt) {
  const ptr = getPointer();
  if (ptr.isDown && pointInCorner(ptr.x, ptr.y)) {
    _holdCornerTimer += dt;

    if (_holdCornerTimer > 3000) {
      if (verifyParentAccess()) {
        transition(States.REPORT);
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
      drawMenuScreen(ctx, _frameCount);
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
      drawEyeCheckScreen(ctx, _eyeCheckStatus, ratio);
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
        transition(States.LEVEL_END);
      }
      break;
    }
    case States.LEVEL_END: {
      _levelEndFrame += 1;
      const stars = _lastSession ? _lastSession.stars : 1;
      drawLevelEndScreen(ctx, stars, _currentLevel, _levelEndFrame);
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

function teardown() {
  stopCamera();
  destroyInput();
  destroyVoice();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', teardown);

loadChildProfile();
initBackground();
resizeCanvas();
initInput(canvas);
initVoice();
transition(States.MENU);
requestAnimationFrame(loop);

console.log(`[Main] Target FPS: ${CANVAS.TARGET_FPS}`);
console.log(`[Main] Hold: ${getHoldDuration()}ms`);
