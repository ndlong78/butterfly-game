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

    const mediaDevices = {
      getUserMedia: async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      },
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: mediaDevices,
    });
  });

  page.on('dialog', async (dialog) => {
    const msg = dialog.message();
    if (msg.includes('Nhập tên bé')) {
      await dialog.accept('Bé Na');
      return;
    }
    if (msg.includes('Nhập tuổi bé')) {
      await dialog.accept('6');
      return;
    }
    if (msg.includes('Thiết lập mã phụ huynh')) {
      await dialog.accept('5678');
      return;
    }
    if (msg.includes('Nhập mã phụ huynh')) {
      await dialog.accept('5678');
      return;
    }
    await dialog.dismiss();
  });
});

test('flow start game lưu profile và fallback camera an toàn', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.mouse.click(640, 400);

  await expect
    .poll(async () =>
      page.evaluate(() => ({
        childName: localStorage.getItem('butterflygame_child_name'),
        childAge: localStorage.getItem('butterflygame_child_age'),
        eye: window.__eyeCheckResult,
      }))
    )
    .toEqual({
      childName: 'Bé Na',
      childAge: '6',
      eye: 'permission_denied',
    });
});

test('flow report yêu cầu thiết lập PIN rồi xác thực PIN', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.mouse.click(640, 655);

  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('butterflygame_parent_pin')))
    .toBe('5678');

  await page.mouse.click(640, 655);

  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('butterflygame_parent_pin')))
    .toBe('5678');
});
