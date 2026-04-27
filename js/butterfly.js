import { COLORS, GAME, LEVELS } from './config.js';

const WING_EFFECT_MS = 800;
const _bounds = { x: 80, y: 80, w: 1120, h: 560, minSize: 44, maxSize: 64 };

function randomInBounds() {
  return {
    x: _bounds.x + Math.random() * _bounds.w,
    y: _bounds.y + Math.random() * _bounds.h,
  };
}

export function setButterflyBounds(bounds, isPhone) {
  const pad = isPhone ? 20 : 30;
  _bounds.x = bounds.x + pad;
  _bounds.y = bounds.y + pad;
  _bounds.w = Math.max(60, bounds.w - pad * 2);
  _bounds.h = Math.max(60, bounds.h - pad * 2);
  _bounds.minSize = isPhone ? 44 : 40;
  _bounds.maxSize = isPhone ? 64 : 70;
}

export class Butterfly {
  constructor(id, level, speedMult) {
    this.id = id;
    this.caught = false;
    this.effectMs = 0;
    this.color = COLORS.butterflies[id % 6];
    this.size = _bounds.minSize + ((id * 7) % Math.max(4, _bounds.maxSize - _bounds.minSize));
    this.wingPhase = id * 1.3;
    this.wingSpeed = 0.006 + id * 0.0003;
    this.segmentMs = LEVELS[level].segmentMs / speedMult;
    this.elapsed = 0;
    this.p0 = randomInBounds();
    this.p1 = randomInBounds();
    this.p2 = randomInBounds();
    this.p3 = randomInBounds();
    this.pos = { x: this.p0.x, y: this.p0.y };
    this.angle = 0;
    this._tmpBezier = { x: 0, y: 0 };
    this._tmpDerivative = { x: 0, y: 0 };
  }

  _bezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    this._tmpBezier.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    this._tmpBezier.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return this._tmpBezier;
  }

  _bezierDerivative(p0, p1, p2, p3, t) {
    const u = 1 - t;
    this._tmpDerivative.x = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
    this._tmpDerivative.y = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
    return this._tmpDerivative;
  }

  _ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2; }

  _nextSegment() {
    this.p0.x = this.p3.x;
    this.p0.y = this.p3.y;
    const p1 = randomInBounds();
    const p2 = randomInBounds();
    const p3 = randomInBounds();
    this.p1.x = p1.x; this.p1.y = p1.y;
    this.p2.x = p2.x; this.p2.y = p2.y;
    this.p3.x = p3.x; this.p3.y = p3.y;
  }

  update(dt) {
    if (this.caught) { if (this.effectMs > 0) this.effectMs = Math.max(0, this.effectMs - dt); return; }
    this.elapsed += dt;
    if (this.elapsed >= this.segmentMs) { this._nextSegment(); this.elapsed = 0; }
    const ratio = this.segmentMs > 0 ? this.elapsed / this.segmentMs : 1;
    const t = this._ease(Math.max(0, Math.min(1, ratio)));
    const pos = this._bezier(this.p0, this.p1, this.p2, this.p3, t);
    const derivative = this._bezierDerivative(this.p0, this.p1, this.p2, this.p3, t);
    this.pos.x = pos.x; this.pos.y = pos.y;
    this.angle = Math.atan2(derivative.y, derivative.x);
    this.wingPhase += dt * this.wingSpeed;
  }

  _drawCaughtEffect(ctx) { if (this.effectMs <= 0) return; const progress = 1 - this.effectMs / WING_EFFECT_MS; const dist = progress * 60; const scale = (1 - progress) * 20; const opacity = 1 - progress; ctx.save(); ctx.translate(this.pos.x, this.pos.y); ctx.globalAlpha = Math.max(0, opacity); for (let i = 0; i < 8; i += 1) { const angle = (Math.PI / 4) * i; const sx = Math.cos(angle) * dist; const sy = Math.sin(angle) * dist; ctx.save(); ctx.translate(sx, sy); ctx.rotate(angle); ctx.fillStyle = i % 2 === 0 ? '#FFD54A' : '#FFB347'; ctx.beginPath(); ctx.moveTo(0, -scale * 0.5); ctx.lineTo(scale * 0.18, -scale * 0.18); ctx.lineTo(scale * 0.5, 0); ctx.lineTo(scale * 0.18, scale * 0.18); ctx.lineTo(0, scale * 0.5); ctx.lineTo(-scale * 0.18, scale * 0.18); ctx.lineTo(-scale * 0.5, 0); ctx.lineTo(-scale * 0.18, -scale * 0.18); ctx.closePath(); ctx.fill(); ctx.restore(); } ctx.restore(); }

  draw(ctx) {
    if (this.caught) { this._drawCaughtEffect(ctx); return; }
    const flap = Math.abs(Math.cos(this.wingPhase));
    const wingScaleY = Math.max(0.2, flap);
    const size = this.size;
    ctx.save(); ctx.translate(this.pos.x, this.pos.y); ctx.rotate(this.angle);
    const wingGradient = ctx.createRadialGradient(-size * 0.15, -size * 0.15, 8, 0, 0, size * 0.95);
    wingGradient.addColorStop(0, '#FFFFFF'); wingGradient.addColorStop(0.45, this.color); wingGradient.addColorStop(1, '#A45CB8');
    ctx.fillStyle = wingGradient;
    ctx.save(); ctx.scale(1, wingScaleY); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(size * 0.2, -size * 0.95, size * 1.15, -size * 0.45, size * 0.25, 0); ctx.bezierCurveTo(size * 0.95, size * 0.4, size * 0.15, size * 0.8, 0, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-size * 0.2, -size * 0.95, -size * 1.15, -size * 0.45, -size * 0.25, 0); ctx.bezierCurveTo(-size * 0.95, size * 0.4, -size * 0.15, size * 0.8, 0, 0); ctx.closePath(); ctx.fill(); ctx.restore();
    const lowerSize = size * 0.6;
    ctx.save(); ctx.translate(0, size * 0.08); ctx.scale(1, wingScaleY); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(lowerSize * 0.2, lowerSize * 0.2, lowerSize * 0.8, lowerSize * 0.95, lowerSize * 0.18, lowerSize * 1.05); ctx.bezierCurveTo(lowerSize * 0.5, lowerSize * 0.1, lowerSize * 0.1, -lowerSize * 0.2, 0, 0); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-lowerSize * 0.2, lowerSize * 0.2, -lowerSize * 0.8, lowerSize * 0.95, -lowerSize * 0.18, lowerSize * 1.05); ctx.bezierCurveTo(-lowerSize * 0.5, lowerSize * 0.1, -lowerSize * 0.1, -lowerSize * 0.2, 0, 0); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#3F2A50'; ctx.beginPath(); ctx.ellipse(0, -size * 0.2, size * 0.1, size * 0.14, 0, 0, Math.PI * 2); ctx.ellipse(0, 0, size * 0.11, size * 0.18, 0, 0, Math.PI * 2); ctx.ellipse(0, size * 0.25, size * 0.1, size * 0.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3F2A50'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-size * 0.05, -size * 0.32); ctx.quadraticCurveTo(-size * 0.25, -size * 0.7, -size * 0.1, -size * 0.88); ctx.moveTo(size * 0.05, -size * 0.32); ctx.quadraticCurveTo(size * 0.25, -size * 0.7, size * 0.1, -size * 0.88); ctx.stroke();
    ctx.fillStyle = '#3F2A50'; ctx.beginPath(); ctx.arc(-size * 0.1, -size * 0.88, 2.5, 0, Math.PI * 2); ctx.arc(size * 0.1, -size * 0.88, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  checkCatch(px, py, holdMs) {
    const dx = this.pos.x - px; const dy = this.pos.y - py; const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > GAME.CATCH_RADIUS) return null;
    const progress = holdMs / GAME.CATCH_DURATION;
    return progress >= 1 ? 'caught' : progress;
  }

  triggerCaught() { this.caught = true; this.effectMs = WING_EFFECT_MS; }
}
