export const States = {
  MENU: 'MENU',
  EYE_CHECK: 'EYE_CHECK',
  PLAYING: 'PLAYING',
  LEVEL_END: 'LEVEL_END',
  REPORT: 'REPORT',
};

let _current = States.MENU;
const _listeners = {};

export function getCurrentState() {
  return _current;
}

export function on(event, callback) {
  if (!_listeners[event]) {
    _listeners[event] = [];
  }

  _listeners[event].push(callback);
}

export function emit(event, data) {
  const callbacks = _listeners[event];
  if (!callbacks || callbacks.length === 0) {
    return;
  }

  for (let i = 0; i < callbacks.length; i += 1) {
    callbacks[i](data);
  }
}

export function transition(newState) {
  const from = _current;
  console.log(`[State] ${_current} → ${newState}`);
  _current = newState;
  emit('stateChange', { from, to: newState });
}
