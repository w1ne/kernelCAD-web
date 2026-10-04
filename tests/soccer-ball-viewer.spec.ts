import { expect, test } from '@playwright/test';

/**
 * Loads a revision-pinned soccer-ball mesh through the embed viewer.
 * Displayed means the embed reached model_displayed (nonempty geometry,
 * fitted camera, first frame). Dragging the canvas must change the picture.
 */
test('soccer ball mesh renders and rotates', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
  const meshUrl = new URL('/fixtures/soccer-ball.mesh.json', baseURL).toString();
  await page.goto(
    `/embed/soccer?revision=1&instance=soccer-1&meshUrl=${encodeURIComponent(meshUrl)}`,
  );
  await expect(page.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const before = await canvas.screenshot();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 140, startY + 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
});
