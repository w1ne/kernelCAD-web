// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

// The Studio chrome on real phone sizes (touch, DPR 3): nothing spills past
// the screen, the floating toolbar is one row, and every control in the
// header, toolbar and tab bar is a 44 px target. Runs on /studio and on a
// shared project page (/p/<slug>), whose header carries the route's own
// controls (search, Remix, Report, Share, history).

const PHONES = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
] as const;
// A phone held sideways: short and touch, so it gets the phone shell too.
const LANDSCAPE = { width: 915, height: 412 } as const;

const HIDE_DEVTOOLS = 'button[aria-label="Open TanStack Router Devtools"] { display: none !important; }';

const SLUG = 'e2e-mobile-layout';
const ROW = {
    id: 'p-e2e-mobile',
    slug: SLUG,
    title: 'DRAW 01 v8 - four-axis SG90 drawing instrument with a long title',
    privacy: 'public_unlisted',
    featured_at: null,
    current_code: 'return box(120, 80, 40);\n',
    parameters: [],
    version: 3,
    updated_at: new Date().toISOString(),
    owner_id: null,
};

async function mockProject(page: Page): Promise<void> {
    await page.route('**/rest/v1/projects**', (route) => {
        const body = route.request().url().includes(`slug=eq.${SLUG}`) ? [ROW] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/api/v1/projects/**', (route) => {
        if (route.request().url().includes('/events')) {
            return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' });
        }
        return route.fulfill({ status: 404, body: '' });
    });
}

interface LayoutReport {
    scrollWidth: number;
    /** Visible elements whose on-screen box crosses the left or right edge. */
    spill: string[];
    /** Distinct row tops of the toolbar's controls (1 = one row). */
    toolbarRows: number;
    /** Controls in the header, toolbar and tab bar under 44 x 44. */
    small: string[];
}

/** Measures the page as laid out. An element inside a scroll or clip box
 *  counts only by the part its box shows. */
function measure(page: Page): Promise<LayoutReport> {
    return page.evaluate(() => {
        const width = window.innerWidth;
        const clipOf = (el: Element): DOMRect | null => {
            for (let a = el.parentElement; a; a = a.parentElement) {
                if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) return a.getBoundingClientRect();
            }
            return null;
        };
        const spill: string[] = [];
        for (const el of document.querySelectorAll('body *')) {
            const box = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') continue;
            // Monaco parks its hidden input far off-screen on purpose.
            if (el.closest('.monaco-editor')) continue;
            const clip = clipOf(el);
            const left = clip ? Math.max(box.left, clip.left) : box.left;
            const right = clip ? Math.min(box.right, clip.right) : box.right;
            if (right <= left) continue;
            if (left < -1 || right > width + 1) {
                const id = el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? el.tagName.toLowerCase();
                spill.push(`${id} [${Math.round(left)}..${Math.round(right)}] "${(el.textContent ?? '').trim().slice(0, 40)}"`);
            }
        }
        const row = document.querySelector('[data-testid="studio-toolbar-row"]') ?? document.querySelector('[data-testid="studio-toolbar"]');
        const tops = new Set<number>();
        for (const el of row?.querySelectorAll('button') ?? []) {
            const box = el.getBoundingClientRect();
            if (box.width > 0) tops.add(Math.round(box.top / 4));
        }
        const small: string[] = [];
        const controls = document.querySelectorAll(
            '[data-testid="header"] button, [data-testid="header"] a[href], [data-testid="studio-toolbar"] button, [data-testid="mobile-tabbar"] [role="tab"]',
        );
        for (const el of controls) {
            const box = el.getBoundingClientRect();
            if (box.width === 0) continue;
            if (box.width < 44 || box.height < 44) {
                small.push(`${el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 24)} ${Math.round(box.width)}x${Math.round(box.height)}`);
            }
        }
        return { scrollWidth: document.documentElement.scrollWidth, spill, toolbarRows: tops.size, small };
    });
}

async function expectPhoneLayout(page: Page, width: number): Promise<void> {
    const report = await measure(page);
    expect.soft(report.scrollWidth, 'page scrolls sideways').toBeLessThanOrEqual(width);
    expect.soft(report.spill, 'elements past the screen edge').toEqual([]);
    expect.soft(report.toolbarRows, 'toolbar wraps').toBe(1);
    expect.soft(report.small, 'touch targets under 44 px').toEqual([]);
}

for (const size of [...PHONES, LANDSCAPE]) {
    const name = `${size.width}x${size.height}`;

    test.describe(`phone ${name}`, () => {
        test.use({ viewport: size, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

        test(`/studio chrome fits at ${name}`, async ({ page }, testInfo) => {
            test.setTimeout(120_000);
            await page.goto('/studio');
            await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
            await page.addStyleTag({ content: HIDE_DEVTOOLS });
            await expect(page.getByTestId('mobile-tabbar')).toBeVisible();
            await expect(page.getByTestId('studio-toolbar')).toBeVisible();
            await expectPhoneLayout(page, size.width);
            await page.screenshot({ path: testInfo.outputPath(`studio-${name}.png`) });
        });

        test(`/p/<slug> Studio header fits at ${name}`, async ({ page }, testInfo) => {
            test.setTimeout(120_000);
            await mockProject(page);
            await page.goto(`/p/${SLUG}`);
            const loadFailed = page.getByRole('alert').filter({ hasText: 'Could not load this project' });
            if (await loadFailed.isVisible({ timeout: 3_000 }).catch(() => false)) {
                test.skip(true, 'The dev server has no VITE_SUPABASE_URL; the project row cannot be mocked.');
            }
            await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
            await page.addStyleTag({ content: HIDE_DEVTOOLS });
            await expect(page.getByTestId('studio-toolbar')).toBeVisible();
            await expectPhoneLayout(page, size.width);
            await page.screenshot({ path: testInfo.outputPath(`project-${name}.png`) });

            // The route's controls are one tap away in ⋯, at touch size.
            if (size.width < 768) {
                await page.getByTestId('header-overflow').click();
                const menu = page.getByTestId('header-overflow-panel');
                // Let the pop-in scale animation finish before measuring.
                await expect(menu).toBeVisible();
                await page.waitForTimeout(400);
                await expect(menu.getByRole('button', { name: /Share|Link copied/ })).toBeVisible();
                await expect(menu.getByTestId('header-overflow-feedback')).toBeVisible();
                const share = (await menu.getByRole('button', { name: /Share|Link copied/ }).boundingBox())!;
                expect(share.height).toBeGreaterThanOrEqual(44);
                const box = (await menu.boundingBox())!;
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(size.width);
            }
        });
    });
}

test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('/studio keeps the desktop chrome at 1440 px', async ({ page }) => {
        test.setTimeout(120_000);
        await page.goto('/studio');
        await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });
        await expect(page.getByTestId('mobile-tabbar')).toHaveCount(0);
        await expect(page.getByTestId('activity-bar')).toBeVisible();
        await expect(page.getByTestId('toolbar-move')).toBeVisible();
        await expect(page.getByTestId('toolbar-section')).toBeVisible();
        await expect(page.getByTestId('toolbar-more-tools')).toHaveCount(0);
    });
});
