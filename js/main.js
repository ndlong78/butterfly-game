import { States, getCurrentState, transition } from './state.js';
import { CANVAS, GAME } from './config.js';
import { initBackground, updateBackground, drawBackground } from './background.js';
import { initInput, getPointer, getHoldDuration } from './input.js';
import { initLevel, updateGameplay, drawGameplay, getSessionData } from './gameplay.js';
import { startCamera, stopCamera, analyzeFrame, drawEyeCheckScreen, isSkipButton } from './camera.js';
import { initVoice, speak } from './voice.js';
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
let _lastPointerDown = false;
let _eyeAnalyzeTick = 0;

let _childName = '';
let _childAge = '';

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(window.innerWidth / CANVAS.WIDTH, window.innerHeight / CANVAS.HEIGHT);

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

function startEyeCheck() {
  _eyeCheckTimer = 0;
  _eyeAnalyzeTick = 0;
  _eyeCheckStatus = 'waiting';
  transition(States.EYE_CHECK);

  startCamera().catch(() => {
    window.__eyeCheckResult = 'camera_error';
    initLevel(_currentLevel);
    transition(States.PLAYING);
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
      speak('WELCOME');
      startEyeCheck();
    } else if (action === 'report') {
      transition(States.REPORT);
    }
    return;
  }

  if (state === States.EYE_CHECK) {
    if (isSkipButton(x, y)) {
      window.__eyeCheckResult = 'skipped';
      stopCamera();
      _currentLevel = 0;
      initLevel(0);
      transition(States.PLAYING);
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
      const pwd = prompt('Mật khẩu:');
      if (pwd === GAME.PARENT_PASSWORD) {
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

  const ptr = getPointer();
  const isTap = ptr.isDown && !_lastPointerDown;
  _lastPointerDown = ptr.isDown;

  if (isTap) {
    handleTap(ptr.x, ptr.y);
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
        window.__eyeCheckResult = _eyeCheckStatus;
        if (_eyeCheckStatus === 'covered') {
          speak('EYE_COVERED_OK');
        }
        stopCamera();
        initLevel(_currentLevel);
        transition(States.PLAYING);
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

window.addEventListener('resize', resizeCanvas);

initBackground();
resizeCanvas();
initInput(canvas);
initVoice();
transition(States.MENU);
requestAnimationFrame(loop);

console.log(`[Main] Target FPS: ${CANVAS.TARGET_FPS}`);
console.log(`[Main] Hold: ${getHoldDuration()}ms`);
