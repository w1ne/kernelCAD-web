import { test, expect, type Page } from '@playwright/test';
import { extractHistoryItems } from '../src/lib/codeAnalysis';

async function waitForStability(page: Page, expectedCount?: number) {
  await page.waitForFunction((count) => {
    const currentCount = (window as any).getExecutionCount?.() || 0;
    const computing = (window as any).isComputing?.();
    if (count !== undefined) return currentCount >= count && computing === false;
    if (computing === undefined) return false;
    return computing === false;
  }, expectedCount, { timeout: 60000 });

  const error = await page.evaluate(() => (window as any).getError?.() || null);
  if (error) throw new Error(`CAD Engine Error: ${error}`);
}

async function getNextExecutionCount(page: Page): Promise<number> {
  const current = await page.evaluate(() => (window as any).getExecutionCount?.() || 0);
  return current + 1;
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
    await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
    await waitForStability(page);

    const code = `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();
return replicad.makeBox(10, 10, 10);
    `.trim();

    const count = await getNextExecutionCount(page);
    await page.evaluate((c) => (window as any).setCode?.(c), code);
    await waitForStability(page, count);

    await page.keyboard.press('Control+1');
  });

  test('R opens Revolve when not typing', async ({ page }) => {
    await page.locator('canvas[data-engine]').first().click({ position: { x: 50, y: 50 } });
    await page.keyboard.press('r');
    await expect(page.locator('[id^="panel-title-"]', { hasText: 'Revolve' })).toBeVisible();
  });

  test('R does not trigger while typing in editor', async ({ page }) => {
    await expect(page.locator('[id^="panel-title-"]', { hasText: 'Revolve' })).toHaveCount(0);

    // Focus Monaco input area (use focus() to ensure activeElement is the textarea).
    await page.evaluate(() => {
      const ta = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement | null;
      ta?.focus();
    });
    await page.waitForFunction(() => document.activeElement?.tagName?.toLowerCase() === 'textarea');
    await page.keyboard.press('r');
    await expect(page.locator('[id^="panel-title-"]', { hasText: 'Revolve' })).toHaveCount(0);
  });

  test('Escape closes dialogs even when input focused', async ({ page }) => {
    await page.locator('canvas[data-engine]').first().click({ position: { x: 50, y: 50 } });
    await page.keyboard.press('e');
    await expect(page.locator('[id^="panel-title-"]', { hasText: 'Extrude' })).toBeVisible();

    await page.locator('#extrude-distance').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('[id^="panel-title-"]', { hasText: 'Extrude' })).toHaveCount(0);
  });

  test('Delete removes selected history sketch even when editor is focused', async ({ page }) => {
    const code = `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();
return [replicad.makeBox(10, 10, 10), sketch];
    `.trim();

    const count = await getNextExecutionCount(page);
    await page.evaluate((c) => (window as any).setCode?.(c), code);
    await waitForStability(page, count);

    const selected = extractHistoryItems(code)[0];
    if (!selected) throw new Error('No history items parsed from test code');
    await page.evaluate((id) => (window as any).__TEST_SELECT_ITEM?.(id), selected.id);

    await page.evaluate(() => {
      const ta = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement | null;
      ta?.focus();
    });
    await page.waitForFunction(() => document.activeElement?.tagName?.toLowerCase() === 'textarea');
    await page.keyboard.press('Delete');

    await expect
      .poll(async () => {
        const nextCode = await page.evaluate(() => (window as any).getCode?.() || '');
        return {
          selectedVarRemoved: !nextCode.includes(`const ${selected.name}`),
          hasCorruption: nextCode.includes(`onst ${selected.name}`),
        };
      }, { timeout: 10000 })
      .toEqual({
        selectedVarRemoved: true,
        hasCorruption: false,
      });
  });

  test('Delete works after autosave reload when editor is focused', async ({ page }) => {
    const autosavedCode = `
const sketch = new Sketcher('XY')
  .movePointerTo([0, 0])
  .hLine(10)
  .vLine(10)
  .hLine(-10)
  .close();
return [replicad.makeBox(10, 10, 10), sketch];
    `.trim();

    await page.evaluate((code) => {
      localStorage.setItem('kernelcad_current_project', JSON.stringify({
        version: '1.0',
        name: 'Auto-saved Project',
        code,
        viewState: {
          viewMode: 'code',
          viewMode3D: 'shadedWithEdges',
          sidePanelVisible: true,
          showSketches: true,
        },
        lastUpdated: new Date('2026-02-13T00:00:00.000Z').toISOString(),
      }));
    }, autosavedCode);

    await page.reload();
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });
    await page.waitForFunction(() => (window as any).isEngineReady === true, { timeout: 30000 });
    await waitForStability(page);

    const selected = extractHistoryItems(autosavedCode)[0];
    if (!selected) throw new Error('No history items parsed from autosaved test code');
    await page.evaluate((id) => (window as any).__TEST_SELECT_ITEM?.(id), selected.id);

    await page.evaluate(() => {
      const ta = document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement | null;
      ta?.focus();
    });
    await page.waitForFunction(() => document.activeElement?.tagName?.toLowerCase() === 'textarea');
    await page.keyboard.press('Delete');

    await expect
      .poll(async () => {
        const nextCode = await page.evaluate(() => (window as any).getCode?.() || '');
        const error = await page.evaluate(() => (window as any).getError?.() || null);
        return {
          selectedVarRemoved: !nextCode.includes(`const ${selected.name}`),
          hasCorruption: nextCode.includes(`onst ${selected.name}`),
          hasRuntimeError: Boolean(error),
        };
      }, { timeout: 10000 })
      .toEqual({
        selectedVarRemoved: true,
        hasCorruption: false,
        hasRuntimeError: false,
      });
  });
});
