// tests/e2e/phone-viewer.spec.ts
// Studio on a 390x844 phone: the floating model toolbar fits the screen and
// does not cover the Measure / Dimensions corner controls.
import { test, expect, type Locator } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('element has no box');
  return b;
}

test('phone toolbar stays on screen and clear of the Measure button', async ({ page }) => {
  await page.goto('/');
  const toolbar = page.getByTestId('studio-toolbar');
  const measure = page.getByTestId('measure-toggle');
  await expect(toolbar).toBeVisible({ timeout: 60_000 });
  await expect(measure).toBeVisible({ timeout: 60_000 });

  const bar = await box(toolbar);
  expect(bar.x).toBeGreaterThanOrEqual(0);
  expect(bar.x + bar.width).toBeLessThanOrEqual(390);
  // One row on a phone.
  expect(bar.height).toBeLessThanOrEqual(60);

  for (const id of ['toolbar-view-options', 'toolbar-fit', 'toolbar-order']) {
    const b = await box(page.getByTestId(id));
    expect(b.x + b.width, id).toBeLessThanOrEqual(bar.x + bar.width);
  }

  const m = await box(measure);
  expect(m.y, 'Measure sits below the toolbar').toBeGreaterThanOrEqual(bar.y + bar.height);
  await measure.click();
  await expect(measure).toHaveAttribute('aria-pressed', 'true');
});
