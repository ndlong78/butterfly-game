import { GAME, LEVELS } from './config.js';
import { Butterfly, setButterflyBounds } from './butterfly.js';
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
let _layoutRef = null;

function _distance(x1, y1, x2, y2) { const dx = x2 - x1; const dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
function _getElapsedMs() { return performance.now() - _startTime; }
function _getTrackPct() { return _trackSamples <= 0 ? 0 : _trackHits / _trackSamples; }
function _catchRadius() { return _layoutRef && _layoutRef.isPhone ? Math.max(72, _layoutRef.playArea.w * 0.12) : 60; }

export function initLevel(levelIndex, layout) {
  _layoutRef = layout;
  _level = levelIndex;
  _score = 0;
  _trackSamples = 0;
  _trackHits = 0;
  _sampleTimer = 0;
  _startTime = performance.now();

  setButterflyBounds(layout.playArea, layout.isPhone);

  const cfg = LEVELS[levelIndex];
  _butterflies = new Array(cfg.butterflies);
  _startDelay = new Array(cfg.butterflies);
  for (let i = 0; i < cfg.butterflies; i += 1) {
    _butterflies[i] = new Butterfly(i, levelIndex, cfg.speedMultiplier);
    _startDelay[i] = i * 800;
  }
}

export function updateGameplay(dt, layout) {
  _layoutRef = layout;
  const ptr = getPointer();
  const hold = getHoldDuration();
  const radius = _catchRadius();

  for (let i = 0; i < _butterflies.length; i += 1) {
    if (_startDelay[i] > 0) {
      _startDelay[i] = Math.max(0, _startDelay[i] - dt);
      if (_startDelay[i] > 0) continue;
    }

    const butterfly = _butterflies[i];
    butterfly.update(dt);

    if (!butterfly.caught) {
      const dist = _distance(butterfly.pos.x, butterfly.pos.y, ptr.x, ptr.y);
      if (dist <= radius && hold / GAME.CATCH_DURATION >= 1) {
        butterfly.triggerCaught();
        _score += 1;
      }
    }
  }

  _sampleTimer += dt;
  if (_sampleTimer >= TRACK_SAMPLE_MS) {
    _trackSamples += 1;
    const trackingRadius = radius * 2;
    for (let i = 0; i < _butterflies.length; i += 1) {
      if (_distance(ptr.x, ptr.y, _butterflies[i].pos.x, _butterflies[i].pos.y) <= trackingRadius) { _trackHits += 1; break; }
    }
    _sampleTimer = 0;
  }

  for (let i = 0; i < _butterflies.length; i += 1) {
    if (!_butterflies[i].caught) return _getElapsedMs() > MAX_LEVEL_TIME_MS ? 'complete' : 'playing';
  }
  return 'complete';
}

export function handleGameplayClick(x, y, layout) {
  _layoutRef = layout;
  const radius = _catchRadius();
  let nearest = null;
  let nearestDist = Infinity;
  for (let i = 0; i < _butterflies.length; i += 1) {
    if (_startDelay[i] > 0 || _butterflies[i].caught) continue;
    const dist = _distance(x, y, _butterflies[i].pos.x, _butterflies[i].pos.y);
    if (dist <= radius && dist < nearestDist) { nearest = _butterflies[i]; nearestDist = dist; }
  }
  if (!nearest) return null;
  nearest.triggerCaught();
  _score += 1;
  return 'caught';
}

export function drawGameplay(ctx, layout) {
  _layoutRef = layout;
  drawBackground(ctx, layout);
  for (let i = 0; i < _butterflies.length; i += 1) _butterflies[i].draw(ctx);

  const remainMs = Math.max(0, MAX_LEVEL_TIME_MS - _getElapsedMs());
  const hud = layout.hud;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  drawRoundRect(ctx, hud.x, hud.y, hud.w, hud.h, 24);
  ctx.fill();

  const slotW = hud.w / 3;
  ctx.fillStyle = '#2C3E50';
  ctx.font = `bold ${layout.isPhone ? 24 : 28}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⭐ ${_score}`, hud.x + slotW * 0.5, hud.y + hud.h / 2);
  ctx.fillText(`🦋 ${_butterflies.length - _score}`, hud.x + slotW * 1.5, hud.y + hud.h / 2);
  ctx.fillText(`⏱ ${Math.ceil(remainMs / 1000)}s`, hud.x + slotW * 2.5, hud.y + hud.h / 2);
  ctx.font = `${layout.isPhone ? 18 : 20}px Arial`;
  ctx.fillStyle = 'rgba(44,62,80,0.88)';
  ctx.fillText('Giữ tay lên bướm để bắt nhanh hơn', layout.w / 2, hud.y + hud.h + 24);
  ctx.restore();

  const ptr = getPointer();
  const hold = getHoldDuration();
  const radius = _catchRadius();
  let nearestDist = Infinity;
  for (let i = 0; i < _butterflies.length; i += 1) {
    if (_butterflies[i].caught) continue;
    nearestDist = Math.min(nearestDist, _distance(ptr.x, ptr.y, _butterflies[i].pos.x, _butterflies[i].pos.y));
  }
  if (nearestDist <= radius) {
    const progress = Math.max(0, Math.min(1, hold / GAME.CATCH_DURATION));
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,100,0.85)';
    ctx.lineWidth = layout.isPhone ? 6 : 4;
    ctx.beginPath();
    ctx.arc(ptr.x, ptr.y, layout.isPhone ? 48 : 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }
}

export function calculateStars() {
  const elapsed = _getElapsedMs() / 1000;
  const trackPct = _getTrackPct();
  let allCaught = true;
  for (let i = 0; i < _butterflies.length; i += 1) if (!_butterflies[i].caught) allCaught = false;
  if (allCaught && elapsed <= 45 && trackPct >= 0.8) return 3;
  if (allCaught && trackPct >= 0.6) return 2;
  if (_score >= 1) return 1;
  return 0;
}

export function getSessionData() {
  return {
    date: new Date().toISOString(),
    level: _level + 1,
    stars: calculateStars(),
    timeSeconds: Math.round(_getElapsedMs() / 1000),
    trackingPercent: Math.round(_getTrackPct() * 100),
    eyeCoverResult: window.__eyeCheckResult || 'skipped',
  };
}
