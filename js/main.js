import { States, getCurrentState, transition } from './state.js';
import { CANVAS, GAME } from './config.js';
import { initBackground, updateBackground, drawBackground } from './background.js';
import { initInput, getPointer, getHoldDuration, destroyInput } from './input.js';
import { initLevel, updateGameplay, drawGameplay, getSessionData } from './gameplay.js';
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
import {
  drawMenuScreen,
  drawLevelEndScreen,
  drawProfileScreen,
  drawPinScreen,
  handleMenuClick,
  handleLevelEndClick,
  handleProfileClick,
  handlePinClick,
} from './screens.js';

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
const PRESET_NAMES = ['Bé An', 'Bé Bông', 'Bé Na', 'Bé Ben', 'Bé Sóc'];

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
let _eyeCheckFlowId = 0;

let _childName = '';
let _childAge = '';
let _profileNameIndex = 0;
let _profileAge = 6;
let _uiError = '';
let _pinMode = 'verify';
let _pinInput = '';
let _pinTarget = 'menu';

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
  const ageRaw = (localStorage.getItem(CHILD_AGE_KEY) || '').trim();
  const age = Number(ageRaw);
  _childAge = ageRaw;
  _profileAge = Number.isFinite(age) && age >= 2 && age <= 18 ? age : 6;

  const foundIdx = PRESET_NAMES.indexOf(_childName);
  _profileNameIndex = foundIdx >= 0 ? foundIdx : 0;
}

function openProfileScreen() {
  if (!_childName) {
    _profileNameIndex = 0;
  } else {
    const idx = PRESET_NAMES.indexOf(_childName);
    _profileNameIndex = idx >= 0 ? idx : 0;
  }

  const ageNum = Number(_childAge);
  if (ageNum >= 2 && ageNum <= 18) {
    _profileAge = ageNum;
  }

  _uiError = '';
  transition(States.PROFILE);
}

function saveProfileAndStart() {
  _childName = PRESET_NAMES[_profileNameIndex];
  _childAge = String(_profileAge);
  localStorage.setItem(CHILD_NAME_KEY, _childName);
  localStorage.setItem(CHILD_AGE_KEY, _childAge);
  speak('WELCOME');
  startEyeCheck();
}

function getParentPin() {
  return (localStorage.getItem(PARENT_PIN_KEY) || '').trim();
}

function openPinScreen(mode, target) {
  _pinMode = mode;
  _pinTarget = target;
  _pinInput = '';
  _uiError = '';
  transition(States.PARENT_PIN);
}

function requestParentAccess(target) {
  if (getParentPin()) {
    openPinScreen('verify', target);
  } else {
    openPinScreen('setup', target);
  }
}

function applyPinAction() {
  const savedPin = getParentPin();
  if (_pinMode === 'setup') {
    if (_pinInput.length < 4 || _pinInput.length > 8) {
      _uiError = 'Mã cần từ 4 đến 8 số.';
      return;
    }
    localStorage.setItem(PARENT_PIN_KEY, _pinInput);
    _pinInput = '';
    _uiError = '';
    if (_pinTarget === 'report') {
      transition(States.REPORT);
    } else {
      transition(States.MENU);
    }
    return;
  }

  if (_pinInput === savedPin) {
    _pinInput = '';
    _uiError = '';
    if (_pinTarget === 'report') {
      transition(States.REPORT);
    } else {
      transition(States.MENU);
    }
    return;
  }

  _uiError = 'Sai mã phụ huynh.';
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
      openProfileScreen();
    } else if (action === 'report') {
      requestParentAccess('report');
    }
    return;
  }

  if (state === States.PROFILE) {
    const action = handleProfileClick(x, y);
    if (action === 'name_prev') {
      _profileNameIndex = (_profileNameIndex - 1 + PRESET_NAMES.length) % PRESET_NAMES.length;
    } else if (action === 'name_next') {
      _profileNameIndex = (_profileNameIndex + 1) % PRESET_NAMES.length;
    } else if (action === 'age_minus') {
      _profileAge = Math.max(2, _profileAge - 1);
    } else if (action === 'age_plus') {
      _profileAge = Math.min(18, _profileAge + 1);
    } else if (action === 'continue') {
      saveProfileAndStart();
    } else if (action === 'cancel') {
      transition(States.MENU);
    }
    return;
  }

  if (state === States.PARENT_PIN) {
    const action = handlePinClick(x, y);
    if (!action) {
      return;
    }

    _uiError = '';
    if (action.startsWith('digit_')) {
      if (_pinInput.length < 8) {
        _pinInput += action.slice(6);
      }
    } else if (action === 'back') {
      _pinInput = _pinInput.slice(0, -1);
    } else if (action === 'clear') {
      _pinInput = '';
    } else if (action === 'submit') {
      applyPinAction();
    } else if (action === 'cancel') {
      _pinInput = '';
      transition(States.MENU);
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
  const state = getCurrentState();
  if (state !== States.MENU && state !== States.PLAYING) {
    return;
  }

  const ptr = getPointer();
  if (ptr.isDown && pointInCorner(ptr.x, ptr.y)) {
    _holdCornerTimer += dt;

    if (_holdCornerTimer > 3000) {
      requestParentAccess('report');
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
    case States.PROFILE:
      drawProfileScreen(ctx, { name: PRESET_NAMES[_profileNameIndex], age: _profileAge }, _uiError);
      break;
    case States.PARENT_PIN:
      drawPinScreen(ctx, _pinInput, _pinMode, _uiError);
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
