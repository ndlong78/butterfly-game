import { States, getCurrentState, transition } from './state.js';
import { CANVAS } from './config.js';

// import { drawBackground } from './background.js';
// import { updateGameplay, drawGameplay } from './gameplay.js';
// import { handleInputClick } from './input.js';
// import { speak } from './voice.js';
// import { drawMenuScreen, drawEyeCheckScreen, drawLevelEndScreen, drawReportScreen } from './screens.js';

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
  throw new Error('Không tìm thấy canvas #gameCanvas');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Không thể khởi tạo Canvas 2D context');
}

let frameCount = 0;
let lastTime = 0;
let canvasCssWidth = 0;
let canvasCssHeight = 0;
let dpr = 1;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  canvasCssWidth = window.innerWidth;
  canvasCssHeight = window.innerHeight;

  canvas.width = Math.floor(canvasCssWidth * dpr);
  canvas.height = Math.floor(canvasCssHeight * dpr);
  canvas.style.width = `${canvasCssWidth}px`;
  canvas.style.height = `${canvasCssHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawMenuScreen(drawCtx, currentFrame) {
  drawCtx.fillStyle = '#ffffff';
  drawCtx.font = '32px sans-serif';
  drawCtx.fillText('Bướm Bay Mắt Vui', 40, 60);
  drawCtx.font = '20px sans-serif';
  drawCtx.fillText(`Màn hình chờ • frame: ${currentFrame}`, 40, 100);
}

function drawEyeCheckScreen(drawCtx) {
  drawCtx.fillStyle = '#ffffff';
  drawCtx.font = '28px sans-serif';
  drawCtx.fillText('Kiểm tra che mắt...', 40, 60);
}

function updateGameplay(_dt) {
  // TODO: Kết nối gameplay.js
}

function drawGameplay(drawCtx) {
  drawCtx.fillStyle = '#ffffff';
  drawCtx.font = '28px sans-serif';
  drawCtx.fillText('Đang chơi...', 40, 60);
}

function drawLevelEndScreen(drawCtx) {
  drawCtx.fillStyle = '#ffffff';
  drawCtx.font = '28px sans-serif';
  drawCtx.fillText('Kết thúc màn', 40, 60);
}

function drawReportScreen(drawCtx) {
  drawCtx.fillStyle = '#ffffff';
  drawCtx.font = '28px sans-serif';
  drawCtx.fillText('Báo cáo', 40, 60);
}

function speak(key) {
  // TODO: Kết nối voice.js
  console.log('[Voice]', key);
}

function handleClick(x, y) {
  const state = getCurrentState();

  switch (state) {
    case States.MENU:
      transition(States.EYE_CHECK);
      return 'START_EYE_CHECK';
    case States.EYE_CHECK:
      transition(States.PLAYING);
      return 'START_PLAYING';
    case States.PLAYING:
      return 'PLAYING_CLICK';
    case States.LEVEL_END:
      transition(States.REPORT);
      return 'OPEN_REPORT';
    case States.REPORT:
      transition(States.MENU);
      return 'BACK_TO_MENU';
    default:
      return null;
  }
}

function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

canvas.addEventListener('click', (event) => {
  const point = getCanvasPoint(event.clientX, event.clientY);
  handleClick(point.x, point.y);
});

canvas.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const point = getCanvasPoint(touch.clientX, touch.clientY);
    handleClick(point.x, point.y);
    event.preventDefault();
  },
  { passive: false },
);

window.addEventListener('resize', resizeCanvas);

function loop(timestamp) {
  if (lastTime === 0) {
    lastTime = timestamp;
  }

  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  ctx.clearRect(0, 0, canvasCssWidth, canvasCssHeight);

  switch (getCurrentState()) {
    case States.MENU:
      drawMenuScreen(ctx, frameCount);
      break;
    case States.EYE_CHECK:
      drawEyeCheckScreen(ctx, frameCount);
      break;
    case States.PLAYING:
      updateGameplay(dt);
      drawGameplay(ctx);
      break;
    case States.LEVEL_END:
      drawLevelEndScreen(ctx, frameCount);
      break;
    case States.REPORT:
      drawReportScreen(ctx, frameCount);
      break;
    default:
      break;
  }

  frameCount += 1;
  requestAnimationFrame(loop);
}

resizeCanvas();
speak('WELCOME');
transition(States.MENU);
requestAnimationFrame(loop);

console.log(`[Main] Target FPS: ${CANVAS.TARGET_FPS}`);
