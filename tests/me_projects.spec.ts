// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

// "Your projects" (/me) and the Studio project switcher, signed in with a stub
// session and a mocked database and API. The page needs Supabase env, so the
// dev server must run with the stub values:
//
//   VITE_SUPABASE_URL=https://stub.supabase.co VITE_SUPABASE_ANON_KEY=stub \
//   VITE_API_BASE_URL=https://api.stub.test npx playwright test tests/me_projects.spec.ts
//
// Without them the spec skips.

const SUPABASE = 'https://stub.supabase.co';
const API = 'https://api.stub.test';
const USER = '11111111-1111-4111-8111-111111111111';
const SIZES = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
] as const;

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const PROJECTS = [
    ['clamp', 'Pipe clamp bracket', 'public_unlisted', 6, 30],
    ['gear', 'Spur gear pair', 'public_unlisted', 2, 300],
    ['lamp', 'Desk lamp', 'private', 3, 3000],
    ['hinge', 'Hinge', 'public_unlisted', 9, 9000],
].map(([slug, title, privacy, version, min], i) => ({
    id: `id-${i}`, slug, title, privacy, featured_at: null, version, updated_at: ago(min as number), owner_id: USER,
}));

async function signedIn(page: Page, rows: typeof PROJECTS): Promise<{ deleted: string[] }> {
    const deleted: string[] = [];
    const session = {
        access_token: 'stub', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 36_000, refresh_token: 'stub',
        user: { id: USER, aud: 'authenticated', role: 'authenticated', email: 'maker@example.com', app_metadata: {}, user_metadata: {}, created_at: ago(1e5) },
    };
    await page.addInitScript((s) => localStorage.setItem('sb-stub-auth-token', s), JSON.stringify(session));
    await page.route(`${SUPABASE}/**`, (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (!url.pathname.endsWith('/rest/v1/projects')) return route.fulfill({ json: {} });
        if (req.method() === 'DELETE') {
            deleted.push(url.searchParams.get('id') ?? '');
            return route.fulfill({ json: [{ id: 'x' }] });
        }
        // The list must be scoped to the signed-in owner.
        expect(url.searchParams.get('owner_id')).toBe(`eq.${USER}`);
        return route.fulfill({ json: rows });
    });
    await page.route(`${API}/**`, (route) => {
        const url = route.request().url();
        if (url.includes('/me/plan')) return route.fulfill({ json: { plan: 'free', generationsRemaining: 7, currentPeriodEnd: null } });
        return route.fulfill({ status: 404, json: { error: 'not_found' } });
    });
    return { deleted };
}

test.skip(process.env.VITE_SUPABASE_URL !== SUPABASE, 'needs the dev server with the stub Supabase env (see the header)');

for (const size of SIZES) {
    test(`/me lists projects, searches, copies a resume prompt and deletes (${size.name})`, async ({ page, context }, testInfo) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.setViewportSize({ width: size.width, height: size.height });
        const { deleted } = await signedIn(page, PROJECTS);
        await page.goto('/me?moved=2');

        await expect(page.getByRole('status').filter({ hasText: '2 projects moved to your account' })).toBeVisible();
        const grid = page.getByTestId('me-project-grid');
        await expect(grid.getByTestId('me-project-card')).toHaveCount(4);
        await expect(page.getByTestId('me-continue').getByRole('listitem')).toHaveCount(3);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width);
        await page.screenshot({ path: testInfo.outputPath(`me-${size.name}.png`), fullPage: true });

        await page.getByRole('searchbox', { name: 'Search projects' }).fill('gear');
        await expect(grid.getByTestId('me-project-card')).toHaveCount(1);
        const card = grid.getByTestId('me-project-card').first();
        await card.getByTestId('copy-resume-prompt').click();
        await expect(card.getByText('Copied')).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText()))
            .toBe(`Continue my kernelCAD project "Spur gear pair" (project: 'gear').`);

        await card.getByRole('button', { name: 'More actions' }).click();
        // The dev-only router devtools badge can sit over the menu on a phone;
        // dispatch the click so the badge does not intercept it.
        await page.getByRole('menuitem', { name: 'Delete…' }).dispatchEvent('click');
        await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(deleted).toEqual(['eq.id-1']);
        await page.getByRole('searchbox', { name: 'Search projects' }).fill('');
        await expect(grid.getByTestId('me-project-card')).toHaveCount(3);
    });

    test(`/me with no projects explains how to start (${size.name})`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await signedIn(page, []);
        await page.goto('/me');
        const empty = page.getByTestId('me-empty-state');
        await expect(empty.getByRole('heading', { name: 'Connect your agent' })).toBeVisible();
        await expect(empty.getByText('https://mcp.kernelcad.com/mcp')).toBeVisible();
        await expect(empty.getByRole('link', { name: 'Describe a part' })).toHaveAttribute('href', '/generate');
        await page.screenshot({ path: testInfo.outputPath(`me-empty-${size.name}.png`), fullPage: true });
    });
}

test('the Studio project switcher lists recent saved projects', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signedIn(page, PROJECTS);
    await page.goto('/studio');
    await page.getByRole('button', { name: 'Open project manager' }).click();
    const dialog = page.getByRole('dialog', { name: 'Projects' });
    await expect(dialog.getByTestId('switcher-saved-project')).toHaveCount(4);
    await expect(dialog.getByTestId('switcher-saved-project').first()).toHaveAttribute('href', '/p/clamp');
    await expect(dialog.getByRole('searchbox', { name: 'Search projects' })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('switcher.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
});
