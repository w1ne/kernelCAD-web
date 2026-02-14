import { test, expect, type Page } from '@playwright/test';

type HistoryItem = { id: string; name: string };

async function waitForWorkbenchReady(page: Page) {
  await page.waitForSelector('[data-testid="viewer-container"] canvas', { timeout: 20000 });
  await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 60000 });
}

async function seedSingleBox(page: Page) {
  const code = `
const box1 = replicad.makeBox(10, 10, 10);
return box1;
  `.trim();

  await page.evaluate((nextCode) => (window as any).setCode?.(nextCode), code);

  await page.waitForFunction(() => {
    const w = window as any;
    const items = w.getHistoryItems?.() || [];
    return w.getExecutionCount?.() > 0 && !w.isComputing?.() && items.length > 0;
  }, undefined, { timeout: 30000 });
}

async function getFirstHistoryItem(page: Page): Promise<HistoryItem> {
  const item = await page.evaluate(() => {
    const items = ((window as any).getHistoryItems?.() || []) as Array<{ id: string; name: string }>;
    return items[0] ?? null;
  });
  expect(item).toBeTruthy();
  return item as HistoryItem;
}

test.describe('Visibility and Selection System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForWorkbenchReady(page);
    await page.evaluate(() => window.localStorage.clear());
    await seedSingleBox(page);
    await page.mouse.move(1200, 100);
  });

  test('should sync hover from SceneBrowser to global state', async ({ page }) => {
    const item = await getFirstHistoryItem(page);
    const row = page.getByTestId(`scene-item-${item.id}`).first();
    await row.waitFor({ state: 'visible' });
    await row.hover();

    const hoveredId = await page.evaluate(() => (window as any).getHoveredItemId?.());
    expect(hoveredId).toBe(item.id);

    await page.mouse.move(1200, 100);
    await page.waitForFunction(() => (window as any).getHoveredItemId?.() === null, undefined, { timeout: 5000 });
    const clearedId = await page.evaluate(() => (window as any).getHoveredItemId?.());
    expect(clearedId).toBe(null);
  });

  test('should sync hover from global state to SceneBrowser', async ({ page }) => {
    const item = await getFirstHistoryItem(page);
    const row = page.getByTestId(`scene-item-${item.id}`).first();
    await row.waitFor({ state: 'visible' });

    await page.evaluate((id) => (window as any).__TEST_SET_HOVERED?.(id), item.id);
    await expect(row).toHaveClass(/bg-\[#333\]/);

    await page.evaluate(() => (window as any).__TEST_SET_HOVERED?.(null));
    await expect(row).not.toHaveClass(/bg-\[#333\]/);
  });

  test('should show context menu on right click in SceneBrowser', async ({ page }) => {
    const item = await getFirstHistoryItem(page);
    const row = page.getByTestId(`scene-item-${item.id}`).first();
    await row.waitFor({ state: 'visible' });
    await row.click({ button: 'right' });

    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Isolate' })).toBeVisible();

    await page.getByRole('button', { name: 'Isolate' }).click();
    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
  });

  test('should render selection highlight in SceneBrowser when selected', async ({ page }) => {
    const item = await getFirstHistoryItem(page);
    await page.evaluate((id) => (window as any).__TEST_SELECT_ITEM?.(id), item.id);

    const row = page.getByTestId(`scene-item-${item.id}`).first();
    await row.waitFor({ state: 'visible' });
    await expect(row).toHaveClass(/border-l-2/);
  });

  test('should persist hidden items across reloads', async ({ page }) => {
    const item = await getFirstHistoryItem(page);
    const row = page.getByTestId(`scene-item-${item.id}`).first();
    await row.waitFor({ state: 'visible' });

    await row.getByTitle('Hide Operation').click();
    await expect(row.getByTitle('Show Operation')).toBeVisible();

    await page.reload();
    await waitForWorkbenchReady(page);
    await seedSingleBox(page);

    const reloadedItem = await page.evaluate((name) => {
      const items = ((window as any).getHistoryItems?.() || []) as Array<{ id: string; name: string }>;
      return items.find((it) => it.name === name) ?? null;
    }, item.name);
    expect(reloadedItem).toBeTruthy();

    const newRow = page.getByTestId(`scene-item-${(reloadedItem as HistoryItem).id}`).first();
    await newRow.waitFor({ state: 'visible' });
    await expect(newRow.getByTitle('Show Operation')).toBeVisible();
  });

  test('should select plane by clicking in Scene Browser', async ({ page }) => {
    const planeItem = page.getByTestId('scene-item-base-xy').first();
    await planeItem.waitFor({ state: 'visible' });
    await planeItem.click();

    const selectedId = await page.evaluate(() => (window as any).selectedItemId?.());
    expect(selectedId).toBe('base-xy');
  });
});
