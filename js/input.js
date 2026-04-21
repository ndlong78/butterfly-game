import { CANVAS } from './config.js';

const DRIFT_THRESHOLD = 10;

const _state = {
  x: CANVAS.WIDTH / 2,
  y: CANVAS.HEIGHT / 2,
  isDown: false,
  downSince: null,
  downOriginX: 0,
  downOriginY: 0,
};

const _logical = { x: 0, y: 0 };
const _pointerView = { x: _state.x, y: _state.y, isDown: _state.isDown };
const _tapView = { x: 0, y: 0 };

let _canvas = null;
let _listeners = [];
let _tapQueued = false;

function _distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function _toLogical(e) {
  const rect = _canvas.getBoundingClientRect();
  const scaleX = CANVAS.WIDTH / rect.width;
  const scaleY = CANVAS.HEIGHT / rect.height;

  let point = null;
  if (e.touches && e.touches.length > 0) {
    point = e.touches[0];
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    point = e.changedTouches[0];
  } else {
    point = e;
  }

  _logical.x = (point.clientX - rect.left) * scaleX;
  _logical.y = (point.clientY - rect.top) * scaleY;
  return _logical;
}

function _updateFromEvent(e) {
  const wasDown = _state.isDown;
  const pos = _toLogical(e);
  _state.x = pos.x;
  _state.y = pos.y;

  const type = e.type;
  const isDownEvent = type === 'mousedown' || type === 'touchstart';
  const isUpEvent = type === 'mouseup' || type === 'touchend' || type === 'touchcancel';

  if (isDownEvent) {
    _state.isDown = true;
    _state.downSince = Date.now();
    _state.downOriginX = pos.x;
    _state.downOriginY = pos.y;
  } else if (isUpEvent) {
    if (wasDown) {
      _tapQueued = true;
      _tapView.x = pos.x;
      _tapView.y = pos.y;
    }
    _state.isDown = false;
    _state.downSince = null;
    _state.downOriginX = 0;
    _state.downOriginY = 0;
  } else if (_state.isDown) {
    const drift = _distance(pos.x, pos.y, _state.downOriginX, _state.downOriginY);
    if (drift > DRIFT_THRESHOLD) {
      _state.downSince = Date.now();
      _state.downOriginX = pos.x;
      _state.downOriginY = pos.y;
    }
  }
}

function addEventListenerWithCleanup(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  _listeners.push(() => target.removeEventListener(event, handler, options));
}

export function initInput(canvas) {
  destroyInput();

  _canvas = canvas;

  const handler = (e) => {
    e.preventDefault();
    _updateFromEvent(e);
  };

  const releaseHandler = (e) => {
    _updateFromEvent(e);
  };

  addEventListenerWithCleanup(canvas, 'mousemove', handler);
  addEventListenerWithCleanup(canvas, 'mousedown', handler);
  addEventListenerWithCleanup(canvas, 'mouseup', handler);

  addEventListenerWithCleanup(canvas, 'touchstart', handler, { passive: false });
  addEventListenerWithCleanup(canvas, 'touchmove', handler, { passive: false });
  addEventListenerWithCleanup(canvas, 'touchend', handler, { passive: false });
  addEventListenerWithCleanup(canvas, 'touchcancel', handler, { passive: false });

  addEventListenerWithCleanup(window, 'mouseup', releaseHandler);
  addEventListenerWithCleanup(window, 'touchend', releaseHandler, { passive: true });
  addEventListenerWithCleanup(window, 'touchcancel', releaseHandler, { passive: true });
}

export function destroyInput() {
  for (let i = 0; i < _listeners.length; i += 1) {
    _listeners[i]();
  }
  _listeners = [];
  _canvas = null;
  _tapQueued = false;
}

export function getPointer() {
  _pointerView.x = _state.x;
  _pointerView.y = _state.y;
  _pointerView.isDown = _state.isDown;
  return _pointerView;
}

export function getHoldDuration() {
  if (!_state.isDown || _state.downSince === null) {
    return 0;
  }
  return Date.now() - _state.downSince;
}

export function consumeTap() {
  if (!_tapQueued) {
    return null;
  }

  _tapQueued = false;
  return _tapView;
}
