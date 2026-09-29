// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Studio's first-run surfaces: the empty-viewport state (each starter
// must build a real body from it) and the once-per-browser coach marks.
import { test, expect, type BrowserContext } from '@playwright/test';

const VIEW_STATE = { viewMode: 'code', viewMode3D: 'shadedWithEdges', sidePanelVisible: true, showSketches: true };

/** One empty local project, opened on load. Coach marks already seen. */
async function seedEmptyProject(context: BrowserContext): Promise<void> {
    await context.addInitScript((viewState) => {
        if (sessionStorage.getItem('first-run-seeded')) return;
        sessionStorage.setItem('first-run-seeded', '1');
        localStorage.clear();
        const now = new Date().toISOString();
        localStorage.setItem('kernelcad_project_index', JSON.stringify([{ id: 'empty1', name: 'Empty', lastUpdated: now }]));
        localStorage.setItem('kernelcad_project_empty1', JSON.stringify({
            version: '1.1', name: 'Empty', code: 'return [];\n', viewState, lastUpdated: now,
        }));
        localStorage.setItem('kernelcad_last_project_id', 'empty1');
        localStorage.setItem('kernelcad.studio.coachMarks', 'done');
    }, VIEW_STATE);
}

test('an empty Studio offers starters, and each starter builds a body', async ({ browser }) => {
    test.setTimeout(240_000);
    for (const id of ['stand', 'bracket', 'box']) {
        // A fresh browser per starter: each one starts from the empty project.
        const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
        await seedEmptyProject(context);
        const page = await context.newPage();
        await page.goto('/');
        const empty = page.getByTestId('studio-empty-state');
        await expect(empty).toBeVisible({ timeout: 60_000 });
        await expect(empty.getByRole('heading', { name: 'Start a model' })).toBeVisible();
        await expect(empty.getByTestId('empty-connect')).toHaveAttribute('href', '/connect');
        await empty.getByTestId(`empty-starter-${id}`).click();
        await expect(page.getByTestId('studio-empty-state')).toBeHidden({ timeout: 60_000 });
        // The status bar counts what the viewer draws: never "0 bodies".
        await expect(page.getByText(/^[1-9]\d* bod(y|ies)$/)).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText('Ready', { exact: true })).toBeVisible();
        await context.close();
    }
});

test('coach marks show once per browser and step through the chrome', async ({ page }) => {
    test.setTimeout(120_000);
    // The tour stays off under automation; this test is the one exception.
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('kernelcad.studio.coachMarks'));
    await page.reload();
    await expect(page.getByTestId('workbench-ready')).toBeVisible();
    const card = page.getByTestId('coach-mark');
    await expect(card).toHaveAttribute('data-step', 'agent', { timeout: 30_000 });
    for (const step of ['palette', 'export', 'mark']) {
        await card.getByRole('button', { name: 'Next' }).click();
        await expect(card).toHaveAttribute('data-step', step);
    }
    await card.getByRole('button', { name: 'Done' }).click();
    await expect(card).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('workbench-ready')).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('coach-mark')).toHaveCount(0);
});
