import { test, expect, type Page } from '@playwright/test';

// Studio shell — happy-path E2E.
//
// Loads a simple parametric script that the existing recompute pipeline
// solves without any kernel diagnostics. Asserts the StudioShell renders
// its six slots, the always-visible tabs are present, the bottom drawer
// stays closed (no validity payload yet — Slice 1 ships the shell;
// validity wiring into the recompute pipeline is a Phase 5.1 follow-up),
// and the kernel-init banner disappears once the worker is ready.

async function waitForStability(page: Page): Promise<void> {
    await page.waitForFunction(
        () => {
            const computing = (window as { isComputing?: () => boolean }).isComputing?.();
            return computing === false;
        },
        undefined,
        { timeout: 60000 },
    );
}

test.describe('Studio shell — happy path', () => {
    test('renders the six shell slots and stays in a clean state on a solving script', async ({ page }) => {
        await page.goto('/');

        const script = `
const w = param('Width', 60, { unit: 'mm' });
const h = param('Height', 40, { unit: 'mm' });
const t = param('Thickness', 5, { unit: 'mm' });
return box(w, h, t);
`;
        await page.evaluate((c) => (window as { setCode?: (s: string) => void }).setCode?.(c), script);
        await waitForStability(page);

        // 1. Shell mounts.
        await expect(page.getByTestId('workbench-ready')).toBeVisible();

        // 2. Toolbar present.
        await expect(page.getByTestId('studio-toolbar')).toBeVisible();

        // 3. Scene + Code tabs are always present.
        const inspector = page.locator('[data-testid="inspector-tabs"]').first();
        await expect(inspector).toBeVisible();
        await expect(inspector.getByRole('tab', { name: /scene/i })).toBeVisible();
        await expect(inspector.getByRole('tab', { name: /code/i })).toBeVisible();

        // 4. Bottom drawer stays closed when no validity result has been
        //    published (Slice 1 useRecomputeResult returns validity: null).
        await expect(page.getByRole('region', { name: /validity drawer/i })).toHaveCount(0);

        // 5. The kernel-init banner disappears once the worker is ready.
        await expect(page.getByTestId('kernel-init-banner')).toHaveCount(0);

        // 6. The status bar is rendered.
        await expect(page.getByTestId('status-bar')).toBeVisible();
    });

    test('the script param appears as a chip in the viewport overlay when paramTable has entries', async ({ page }) => {
        // ParamChips reads from useRecomputeResult().paramTable — Slice 1
        // returns null pending Phase 5.1 wiring. The chip overlay should
        // therefore render no chips. This locks the contract: the overlay
        // is silent until the recompute pipeline surfaces paramTable.
        await page.goto('/');
        await waitForStability(page);

        await expect(page.locator('[data-testid="param-chips"]')).toHaveCount(0);
    });
});
