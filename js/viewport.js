/**
 * Xác định layout mobile theo nhiều tín hiệu để ổn định trên iPhone/Safari:
 * - màn hình nhỏ (short-side <= 900)
 * - thiết bị chạm/coarse pointer
 * - user-agent iOS
 */
export function isMobileLayout() {
  const width = Math.max(
    0,
    window.visualViewport ? window.visualViewport.width : 0,
    window.innerWidth || 0,
    document.documentElement ? document.documentElement.clientWidth : 0,
  );
  const height = Math.max(
    0,
    window.visualViewport ? window.visualViewport.height : 0,
    window.innerHeight || 0,
    document.documentElement ? document.documentElement.clientHeight : 0,
  );

  const shortSide = Math.min(width || 0, height || 0);
  const touchCapable = navigator.maxTouchPoints > 0;
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const ua = navigator.userAgent || '';
  const iosUA = /iPhone|iPad|iPod/i.test(ua);

  if (shortSide > 0 && shortSide <= 900) {
    return true;
  }

  return (touchCapable && coarsePointer) || iosUA;
}

export function isPortraitLayout() {
  const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  return height > width;
}

