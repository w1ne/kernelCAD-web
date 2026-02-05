import { test, expect } from '@playwright/test';

test('tooltips include keyboard shortcuts', async ({ page }) => {
    await page.goto('/');

    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(() => (window as any).isEditorReady === true, { timeout: 30000 });

    const sketchTitle = await page.getByRole('button', { name: 'Sketch', exact: true }).getAttribute('title');
    expect(sketchTitle).toContain('(S)');

    const extrudeTitle = await page.getByRole('button', { name: 'Extrude' }).getAttribute('title');
    expect(extrudeTitle).toContain('(E)');

    const constructionPlaneTitle = await page.getByRole('button', { name: 'Construction Plane' }).getAttribute('title');
    expect(constructionPlaneTitle).toContain('(P)');

    const undoTitle = await page.getByRole('button', { name: 'Undo' }).getAttribute('title');
    expect(undoTitle).toContain('Ctrl/Cmd+Z');

    const redoTitle = await page.getByRole('button', { name: 'Redo' }).getAttribute('title');
    expect(redoTitle).toContain('Ctrl/Cmd+Shift+Z');
});
