import { CANVAS, GAME, LEVELS } from './config.js';
import { Butterfly } from './butterfly.js';
import { drawBackground } from './background.js';
import { drawRoundRect } from './canvas-utils.js';
import { getHoldDuration, getPointer } from './input.js';

const MAX_LEVEL_TIME_MS = 60000;
const TRACK_SAMPLE_MS = 500;

let _butterflies = [];
let _startDelay = [];
let _level = 0;
let _score = 0;
let _startTime = 0;
let _sampleTimer = 0;
let _trackSamples = 0;
let _trackHits = 0;

function _distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function _getElapsedMs() {
  return performance.now() - _startTime;
}

function _getTrackPct() {
  if (_trackSamples <= 0) {
    return 0;
  }
  return _trackHits / _trackSamples;
}

export function initLevel(levelIndex) {
  _level = levelIndex;
  _score = 0;
  _trackSamples = 0;
  _trackHits = 0;
  _sampleTimer = 0;
  _startTime = performance.now();

  const cfg = LEVELS[levelIndex];
  _butterflies = new Array(cfg.butterflies);
  _startDelay = new Array(cfg.butterflies);

  for (let i = 0; i < cfg.butterflies; i += 1) {
    _butterflies[i] = new Butterfly(i, levelIndex, cfg.speedMultiplier);
    _startDelay[i] = i * 800;
  }
}

export function updateGameplay(dt) {
  const ptr = getPointer();
  const hold = getHoldDuration();

  for (let i = 0; i < _butterflies.length; i += 1) {
    if (_startDelay[i] > 0) {
      _startDelay[i] = Math.max(0, _startDelay[i] - dt);
      if (_startDelay[i] > 0) {
        continue;
      }
    }

    const butterfly = _butterflies[i];
    butterfly.update(dt);

    if (!butterfly.caught) {
      const result = butterfly.checkCatch(ptr.x, ptr.y, hold);
      if (result === 'caught') {
        butterfly.triggerCaught();
        _score += 1;
      }
    }
  }

  _sampleTimer += dt;
  if (_sampleTimer >= TRACK_SAMPLE_MS) {
    _trackSamples += 1;
    const trackingRadius = GAME.CATCH_RADIUS * 2;

    for (let i = 0; i < _butterflies.length; i += 1) {
      const butterfly = _butterflies[i];
      const dist = _distance(ptr.x, ptr.y, butterfly.pos.x, butterfly.pos.y);
      if (dist <= trackingRadius) {
        _trackHits += 1;
        break;
      }
    }

    _sampleTimer = 0;
  }

  let allCaught = true;
  for (let i = 0; i < _butterflies.length; i += 1) {
    if (!_butterflies[i].caught) {
      allCaught = false;
      break;
    }
  }

  const elapsed = _getElapsedMs();
  if (allCaught || elapsed > MAX_LEVEL_TIME_MS) {
    return 'complete';
  }
  return 'playing';
}

export function drawGameplay(ctx) {
  drawBackground(ctx);

  for (let i = 0; i < _butterflies.length; i += 1) {
    _butterflies[i].draw(ctx);
  }

  const elapsed = _getElapsedMs();
  const remainMs = Math.max(0, MAX_LEVEL_TIME_MS - elapsed);

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  drawRoundRect(ctx, CANVAS.WIDTH / 2 - 320, 12, 640, 58, 28);
  ctx.fill();

  ctx.fillStyle = '#2C3E50';
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = 4;
  ctx.font = 'bold 32px Arial';

  const remaining = _butterflies.length - _score;
  ctx.textAlign = 'left';
  ctx.fillText(`⭐ ${_score}`, CANVAS.WIDTH / 2 - 280, 52);

  ctx.textAlign = 'center';
  ctx.fillText(`🦋 ${remaining}`, CANVAS.WIDTH / 2, 52);

  ctx.textAlign = 'right';
  ctx.fillText(`⏱ ${Math.ceil(remainMs / 1000)}s`, CANVAS.WIDTH / 2 + 280, 52);
  ctx.restore();

  const ptr = getPointer();
  const hold = getHoldDuration();

  let nearest = null;
  let nearestDist = Infinity;

  for (let i = 0; i < _butterflies.length; i += 1) {
    const butterfly = _butterflies[i];
    if (butterfly.caught) {
      continue;
    }

    const dist = _distance(ptr.x, ptr.y, butterfly.pos.x, butterfly.pos.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = butterfly;
    }
  }

  if (nearest && nearestDist <= GAME.CATCH_RADIUS) {
    const progress = Math.max(0, Math.min(1, hold / GAME.CATCH_DURATION));
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,100,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ptr.x, ptr.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }
}

export function calculateStars() {
  const elapsed = _getElapsedMs() / 1000;
  const trackPct = _getTrackPct();

  let allCaught = true;
  for (let i = 0; i < _butterflies.length; i += 1) {
    if (!_butterflies[i].caught) {
      allCaught = false;
      break;
    }
  }

  if (allCaught && elapsed <= 45 && trackPct >= 0.8) {
    return 3;
  }
  if (allCaught && trackPct >= 0.6) {
    return 2;
  }
  if (_score >= 1) {
    return 1;
  }
  return 0;
}

export function getSessionData() {
  const elapsed = _getElapsedMs();
  const trackPct = _getTrackPct();

  return {
    date: new Date().toISOString(),
    level: _level + 1,
    stars: calculateStars(),
    timeSeconds: Math.round(elapsed / 1000),
    trackingPercent: Math.round(trackPct * 100),
    eyeCoverResult: window.__eyeCheckResult || 'skipped',
  };
}
