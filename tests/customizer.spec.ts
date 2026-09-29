// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

// The model customizer on a shared model: readable labels with units, the
// key params first and "Show all", a slider edit that rebuilds and lands in
// the URL, a reset per value, and a shared link that restores the values.
//
// The project row comes from Supabase REST, answered here. The dev server
// needs a Supabase URL to make that request at all:
//   VITE_SUPABASE_URL=https://fake-sb.supabase.co VITE_SUPABASE_ANON_KEY=fake npm run dev
// Without it the embed shows its load error and this spec fails on the
// first expectation, by design.

const SLUG = 'e2e-customizer';

const CODE = `const plateW = param('plateW', 50, { min: 20, max: 120 });
const plateD = param('plateD', 50);
const plateT = param('plateT', 4, { min: 2, max: 12, label: 'Plate thickness', unit: 'mm', step: 0.5, group: 'Plate' });
const boreDia = param('boreDia', 30.2);
const ringH = param('ringH', 20);
const wallT = param('wallT', 3);
const m4HeadDia = param('m4HeadDia', 7.2, { group: 'Fasteners' });
const m4Clear = param('m4Clear', 4.5, { group: 'Fasteners' });
const hasRibs = param('hasRibs', true, { description: 'Add two stiffening ribs' });

const plate = box(plateW, plateD, plateT);
const ring = cylinder(ringH, boreDia.divide(2).add(wallT)).translate(plateW.divide(2), plateD.divide(2), plateT);
const bore = cylinder(ringH.add(plateT).add(2), boreDia.divide(2)).translate(plateW.divide(2), plateD.divide(2), -1);
return plate.union(ring).subtract(bore);
`;

const ROW = {
    id: 'e2e-customizer-id', slug: SLUG, title: 'Pipe clamp bracket', privacy: 'public_unlisted',
    featured_at: null, current_code: CODE, parameters: [], version: 1,
    updated_at: new Date().toISOString(), owner_id: null,
};

const SIZES = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
] as const;

async function serveProject(page: Page): Promise<void> {
    await page.route('**/rest/v1/**', (route) => {
        const body = route.request().url().includes(`slug=eq.${SLUG}`) ? [ROW] : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
}

async function openCustomizer(page: Page, search = ''): Promise<void> {
    await page.goto(`/embed/${SLUG}?customize=1${search}`);
    const panel = page.getByTestId('model-customizer');
    await expect(panel, 'the customizer needs the model to build; see the header comment').toBeVisible({ timeout: 90_000 });
    const toggle = page.getByTestId('customizer-toggle-panel');
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
}

for (const size of SIZES) {
    test(`customizer: labels, show all, slider edit, reset, shared link (${size.name})`, async ({ page }, testInfo) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await serveProject(page);
        await openCustomizer(page);

        // Words and units, not identifiers.
        const width = page.getByRole('slider', { name: 'Plate width' });
        await expect(width).toHaveAttribute('aria-valuetext', '50 mm');
        await expect(page.getByText('plateW', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('group', { name: 'Plate' })).toBeVisible();

        // Six key rows, the rest behind "Show all".
        await expect(page.getByTestId('customizer-row-hasRibs')).toHaveCount(0);
        await page.getByTestId('customizer-show-all').click();
        await expect(page.getByText('M4 clearance')).toBeVisible();
        await expect(page.getByText('Add two stiffening ribs')).toBeVisible();

        // A slider edit shows the rebuild, writes the URL and offers a reset.
        await width.focus();
        for (let i = 0; i < 10; i++) await width.press('ArrowRight');
        await expect(page.getByTestId('customizer-busy')).toBeVisible();
        await expect(page).toHaveURL(/[?&]p\.plateW=60(&|$)/);
        await expect(page.getByTestId('customizer-busy')).toHaveCount(0, { timeout: 60_000 });
        await page.screenshot({ path: testInfo.outputPath(`customizer-edited-${size.name}.png`) });

        await page.getByTestId('customizer-reset-plateW').click();
        await expect(width).toHaveAttribute('aria-valuetext', '50 mm');
        await expect(page).not.toHaveURL(/p\.plateW=/);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width);
    });
}

test('customizer: a shared link opens with its values, shown even when not key params', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await serveProject(page);
    await openCustomizer(page, '&p.plateW=80&p.hasRibs=false');
    await expect(page.getByRole('slider', { name: 'Plate width' })).toHaveAttribute('aria-valuetext', '80 mm');
    await expect(page.getByRole('switch', { name: 'Has ribs' })).not.toBeChecked();
    await page.getByTestId('customizer-reset').click();
    await expect(page.getByRole('slider', { name: 'Plate width' })).toHaveAttribute('aria-valuetext', '50 mm');
    await expect(page).not.toHaveURL(/p\./);
});
