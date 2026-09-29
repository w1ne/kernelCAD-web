// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { test, expect, type Page } from '@playwright/test';

// Agent pane v2: progress steps, the proposed-change card (before/after in
// the viewer, diff, Accept), and a failed run with its next actions.
//
// The hosted agent needs a signed-in session and a non-localhost host, so
// this spec runs only against a dev server started for it:
//
//   __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=studio.test VITE_ENABLE_IN_APP_AGENT=true \
//   VITE_API_BASE_URL=http://127.0.0.1:5192 VITE_SUPABASE_URL=http://127.0.0.1:5192 \
//   VITE_SUPABASE_ANON_KEY=anon npx vite --host 127.0.0.1 --port 5191
//   KCAD_AGENT_E2E_BASE=http://studio.test:5191 npx playwright test tests/agent_pane.spec.ts
//
// The generate API and the auth session are mocked here; nothing leaves the machine.

const BASE = process.env.KCAD_AGENT_E2E_BASE;
test.skip(!BASE, 'Set KCAD_AGENT_E2E_BASE to a dev server with the in-app agent enabled (see the header).');
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP studio.test 127.0.0.1'] } });

const SIZES = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
] as const;

const PROPOSAL = [
    'const plate = box(60, 40, 5);',
    'let part = plate;',
    'for (const [x, y] of [[6, 6], [54, 6], [6, 34], [54, 34]]) {',
    '  part = part.subtract(cylinder(7, 1.6).translate(x, y, -1));',
    '}',
    'return part;',
].join('\n');

function sse(events: Array<[string, unknown]>): string {
    return events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join('');
}

const PROGRESS: Array<[string, unknown]> = [
    ['generation', { generationId: 'gen_e2e', anonId: 'anon' }],
    ['progress', { stage: 'planning', message: 'Planning the part', elapsedMs: 1000 }],
    ['progress', { stage: 'writing_code', message: 'Writing the script', elapsedMs: 8000 }],
    ['progress', { stage: 'evaluating', message: 'Building the geometry', elapsedMs: 15000 }],
];

async function openAgent(page: Page) {
    const session = {
        access_token: 'e2e', refresh_token: 'e2e', token_type: 'bearer', expires_in: 3_600_000,
        expires_at: Math.floor(Date.now() / 1000) + 3_600_000,
        user: { id: 'e2e', aud: 'authenticated', role: 'authenticated', email: 'e2e@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    };
    await page.addInitScript((s) => localStorage.setItem('sb-127-auth-token', JSON.stringify(s)), session);
    await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.goto(`${BASE}/studio`);
    await expect(page.getByTestId('activity-agent')).toBeVisible({ timeout: 60_000 });
    if (!(await page.getByTestId('left-pane-agent').isVisible())) await page.getByTestId('activity-agent').click();
    await expect(page.getByLabel('Agent rail')).toBeVisible();
}

async function send(page: Page, text: string) {
    const box = page.getByLabel('Generate prompt');
    await box.fill(text);
    await box.press('Enter');
}

for (const size of SIZES) {
    test(`agent pane: proposal, before/after and accept at ${size.width} px`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.route('**/api/v1/generate', (route) => route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: sse([...PROGRESS, ['done', {
                artifact: { title: 'Wall bracket', code: PROPOSAL, parameters: [], suggestions: ['Add a 2 mm fillet'] },
                generationId: 'gen_e2e', anonId: 'anon', durationMs: 20000,
            }]]),
        }));
        await openAgent(page);
        if (size.width >= 1024) {
            const rail = await page.getByLabel('Agent rail').boundingBox();
            expect(Math.round(rail!.width)).toBe(360);
        }

        await send(page, 'A 60 x 40 mm wall bracket with four M3 holes');
        const card = page.getByTestId('agent-proposal');
        await expect(card).toBeVisible();
        await expect(card.getByText('Verified')).toBeVisible();
        await card.getByRole('button', { name: 'After' }).click();
        await expect(card.getByText('Your code has not changed')).toBeVisible();
        await card.getByRole('button', { name: 'View diff' }).click();
        await page.screenshot({ path: testInfo.outputPath(`agent-proposal-${size.name}.png`) });

        await card.getByRole('button', { name: 'Accept' }).click();
        await expect(page.getByTestId('agent-resolution')).toContainText('Applied — Wall bracket');
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(size.width);
    });

    test(`agent pane: a failed run explains itself and offers repair at ${size.width} px`, async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        let calls = 0;
        await page.route('**/api/v1/generate', (route) => {
            calls += 1;
            return route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: sse([...PROGRESS, ['error', {
                    code: 'timeout',
                    message: 'The generation did not finish within 240 s. The last build failed: cut() needs a solid tool body.',
                    generationId: 'gen_e2e',
                }]]),
            });
        });
        await openAgent(page);
        await send(page, 'A hex nut, M8');

        const failure = page.getByTestId('agent-failure');
        await expect(failure.getByText('The run hit the time limit')).toBeVisible();
        const steps = page.getByTestId('agent-run-progress');
        await expect(steps.locator('li[data-status="failed"]')).toContainText('Build and check the geometry');
        await failure.getByText('Details').click();
        await expect(page.getByTestId('agent-failure-detail')).toContainText('cut() needs a solid tool body.');
        await expect(failure.getByRole('button', { name: 'Try again' })).toBeVisible();
        await expect(failure.getByRole('button', { name: 'Copy to your agent' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`agent-failure-${size.name}.png`) });

        await failure.getByRole('button', { name: 'Repair automatically' }).click();
        await expect.poll(() => calls).toBe(2);
    });
}
