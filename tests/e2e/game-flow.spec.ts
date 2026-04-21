import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const speech = {
      getVoices: () => [],
      speak: () => {},
      cancel: () => {},
      onvoiceschanged: null,
    };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speech,
    });

    // @ts-expect-error mock browser API for deterministic flow
    window.SpeechSynthesisUtterance = function MockUtterance(text) {
      this.text = text;
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException('Permission denied', 'NotAllowedError');
        },
      },
    });
  });
});

test('flow start game qua màn hồ sơ canvas và fallback camera an toàn', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.mouse.click(640, 400); // mở màn hồ sơ
  await page.mouse.click(640, 480); // tiếp tục

  await expect
    .poll(async () =>
      page.evaluate(() => ({
        childName: localStorage.getItem('butterflygame_child_name'),
        childAge: localStorage.getItem('butterflygame_child_age'),
        eye: window.__eyeCheckResult,
      }))
    )
    .toEqual({
      childName: 'Bé An',
      childAge: '6',
      eye: 'permission_denied',
    });
});

test('flow report qua bàn phím PIN canvas', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.mouse.click(640, 655); // vào setup PIN

  // nhập 5678 từ keypad canvas
  await page.mouse.click(745, 335); // 5
  await page.mouse.click(635, 420); // 6
  await page.mouse.click(525, 505); // 7
  await page.mouse.click(635, 505); // 8
  await page.mouse.click(860, 554); // xác nhận

  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('butterflygame_parent_pin')))
    .toBe('5678');
});
