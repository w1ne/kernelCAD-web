import { test, expect, type Page } from '@playwright/test';

// Studio inspector tabs: Code / Params / Checks first, conditional tabs only
// when the model has them, reserved tabs never shown, and a Checks tab that
// lists findings by severity with fix actions. The review payload is mocked
// into the dev mesh response so the findings are deterministic.

const REVIEW = {
    ok: false,
    validator: { status: 'error', partCount: 4, jointCount: 2 },
    mechanism: 'broken',
    mechanismFailures: [
        { code: 'mechanism.disconnect', message: 'The drive gear does not reach the output shaft.', hint: 'Move the shaft 2 mm toward the gear.' },
    ],
    diagnostics: [
        { code: 'assembly.part.floating', severity: 'error', message: 'lid is not attached to anything.', hint: 'Add a mate from lid to base.', partName: 'lid' },
        { code: 'dfm.fdm.overhang-unsupported', severity: 'warning', message: 'Overhang of 62° under the lid lip.', hint: 'Add a 45° chamfer under the lip.', partName: 'lid' },
        { code: 'assembly.part.orphan', severity: 'info', message: 'spacer is not placed.', hint: '', partName: 'spacer' },
    ],
    rawInterferencePairs: [{ a: 'gear', b: 'shaft', volumeMm3: 312.4 }],
    interferenceSummary: { rawCount: 1, contactNoiseCount: 0, actionableCount: 1, capMm3: 20 },
};

async function openStudioWithReview(page: Page): Promise<void> {
    await page.route('**/__kernelcad/mesh**', async (route) => {
        const res = await route.fetch();
        let body: Record<string, unknown>;
        try {
            body = (await res.json()) as Record<string, unknown>;
        } catch {
            await route.fulfill({ response: res });
            return;
        }
        await route.fulfill({ response: res, json: { ...body, review: REVIEW } });
    });
    await page.goto('/studio');
    await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60000 });
    // The Checks badge appears once the mocked review reached the shell.
    await expect(page.getByTestId('inspector-tab-validity')).toContainText(/Checks\s*\d/, { timeout: 60000 });
}

test.describe('Studio inspector tabs', () => {
    test('primary tabs first, no reserved or disabled tabs, keyboard navigation', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openStudioWithReview(page);

        const tablist = page.getByRole('tablist', { name: 'Inspector' });
        await expect(tablist.getByRole('tab', { name: /^Code/ })).toHaveAttribute('aria-selected', 'true');
        await expect(tablist.getByRole('tab', { name: /^Checks/ })).toBeVisible();
        for (const id of ['sections', 'cut', 'render']) {
            await expect(page.getByTestId(`inspector-tab-${id}`)).toHaveCount(0);
        }
        await expect(page.locator('[role="tab"][disabled], [role="tab"][aria-disabled="true"]')).toHaveCount(0);

        // Arrow keys move along the tab list.
        await tablist.getByRole('tab', { name: /^Code/ }).focus();
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('[role="tab"][aria-selected="true"]')).not.toHaveText(/^Code/);
    });

    test('Checks lists findings by severity with fix actions', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openStudioWithReview(page);

        const checksTab = page.getByTestId('inspector-tab-validity');
        await expect(checksTab).toContainText('Checks');
        await checksTab.click();

        await expect(page.getByTestId('checks-headline')).toHaveText(/2 errors · 2 warnings · 1 note/);
        await expect(page.getByTestId('mechanism-banner')).toBeVisible();
        const groups = page.getByTestId('checks-group');
        await expect(groups.first()).toHaveAttribute('data-category', 'assembly');
        await expect(page.getByRole('button', { name: 'Fix assembly.part.floating with agent' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Fix assembly.part.orphan with agent' })).toHaveCount(0);
        await expect(page.getByTestId('checks-interference-row')).toContainText('gear ↔ shaft');
    });

    test('the inspector resizes from the keyboard', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await openStudioWithReview(page);

        const handle = page.getByRole('separator', { name: 'Resize inspector' });
        await handle.focus();
        const before = Number(await handle.getAttribute('aria-valuenow'));
        await page.keyboard.press('ArrowLeft');
        await expect(handle).toHaveAttribute('aria-valuenow', String(Math.min(560, before + 16)));
        await page.keyboard.press('Home');
        await expect(handle).toHaveAttribute('aria-valuenow', '280');
    });
});
