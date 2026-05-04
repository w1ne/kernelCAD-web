import { test, expect } from '@playwright/test';

test('demo-player route renders without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/demo-player');
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 10000 });
  await expect(page.locator('[data-testid="demo-player"]')).toBeVisible();

  // Expose handle and verify base API contract.
  const ready = await page.evaluate(() => window.__demoPlayer!.isFrameReady());
  expect(ready).toBe(true);

  // Verify loadFeatureMeshes API is present and returns expected shape.
  const fakeFace = {
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    indices: [0, 1, 2],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    faceId: 0,
  };
  const result = await page.evaluate(
    ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
    {
      feats: [{ featureId: 'box_1', featureKind: 'box', predecessors: [], faces: [fakeFace] }],
      b: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] },
    },
  );
  expect(result.groupCount).toBe(1);

  expect(errors).toEqual([]);
});
