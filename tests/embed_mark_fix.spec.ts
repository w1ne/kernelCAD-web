// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, test, type Page } from '@playwright/test';

// Mark in the host-chat embed. The host page plays the kernelCAD widget: it
// answers every viewer status from its instance with a hello and records the
// marks the embed posts. The mesh is the local soccer-ball fixture (features
// "ball" and "panel").

const INSTANCE = 'e2e-instance';

// First paint in a fresh dev server can take most of a minute.
test.describe.configure({ timeout: 120_000 });

async function hostAsWidget(
    page: Page,
    baseURL: string,
    size: { width: number; height: number },
    features: string[] = ['edit-request'],
) {
    const meshUrl = new URL('/fixtures/soccer-ball.mesh.json', baseURL).toString();
    const src = `${baseURL}/embed/soccer?meshUrl=${encodeURIComponent(meshUrl)}&instance=${INSTANCE}`;
    await page.setViewportSize({ width: size.width + 40, height: size.height + 40 });
    await page.route('http://host.example/', (route) => route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><body style="margin:0;padding:20px">
<iframe id="embed" src="${src}" style="width:${size.width}px;height:${size.height}px;border:0;display:block"></iframe>
<script>
  window.editRequests = [];
  window.marks = [];
  window.ackOk = true;
  const frame = document.getElementById('embed');
  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow) return;
    const d = event.data || {};
    if (d.source !== 'kernelcad-embed' || d.instanceId !== '${INSTANCE}') return;
    if (d.type === 'kernelcad.viewer-status') {
      frame.contentWindow.postMessage({ source: 'kernelcad-widget', type: 'kernelcad.widget-hello', v: 1, instanceId: '${INSTANCE}', features: ${JSON.stringify(features)} }, '*');
    }
    if (d.type === 'kernelcad.marks') window.marks.push(d);
    if (d.type === 'kernelcad.request-display-mode') (window.displayModes = window.displayModes || []).push(d.mode);
    if (d.type === 'kernelcad.edit-request') {
      window.editRequests.push(d);
      frame.contentWindow.postMessage({ source: 'kernelcad-widget', type: 'kernelcad.edit-request-ack', instanceId: '${INSTANCE}', requestId: d.requestId, ok: window.ackOk }, '*');
    }
  });
</script></body>`,
    }));
    await page.goto('http://host.example/', { waitUntil: 'commit' });
    return page.frameLocator('#embed');
}

type Marks = { seq: number; strokes: Array<{ points: number[][]; screen: number[][]; features: string[] }>; regions: Array<{ featureId?: string; share: number }>; picks: Array<{ featureId?: string; normal: number[] }>; camera?: unknown; viewport?: unknown; screenshot?: string };

async function lastMarks(page: Page): Promise<Marks | undefined> {
    return page.evaluate(() => (window as unknown as { marks: unknown[] }).marks.at(-1)) as Promise<Marks | undefined>;
}

async function cameraOf(frame: ReturnType<Page['frameLocator']>): Promise<string> {
    // The canvas pixels change when the view turns; compare a screenshot hash.
    const buf = await frame.locator('canvas').first().screenshot();
    let h = 0;
    for (let i = 0; i < buf.length; i += 97) h = (h * 31 + buf[i]!) >>> 0;
    return String(h);
}

// Phone-sized card inside a host chat: marking is only painting. A pencil in
// the toolbar; a drag that starts on the model paints, one that starts on the
// background turns the view. No panel, text box, hint or dialog.
test('Mark in a host chat: drag on the model paints, background drag orbits, nothing over the model', async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
    const size = { width: 390, height: 520 };
    const frame = await hostAsWidget(page, baseURL, size, ['edit-request', 'marks-context']);
    await expect(frame.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });
    await expect(frame.getByTestId('measure-toggle')).toBeVisible();

    const toggle = frame.getByTestId('mark-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(frame.getByTestId('mark-toolbar')).toHaveText('');
    await expect(frame.locator('textarea, [role="dialog"], [data-testid="mark-fix-panel"]')).toHaveCount(0);
    await expect(frame.getByText(/send to chat|tap the model|type the change/i)).toHaveCount(0);

    const canvas = frame.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no box');
    const bar = await frame.getByTestId('mark-toolbar').boundingBox();
    expect((bar?.y ?? 0) + (bar?.height ?? 0) - box.y).toBeLessThanOrEqual(56);

    // Drag across the ball: one stroke, and the view does not turn.
    const before = await cameraOf(frame);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height * 0.45;
    await page.mouse.move(cx - 12, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 12, cy + 6, { steps: 10 });
    await page.mouse.up();
    await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');
    await expect.poll(async () => (await lastMarks(page))?.strokes.length ?? 0).toBe(1);
    const m = (await lastMarks(page))!;
    expect(m.strokes[0]!.points.length).toBeGreaterThan(1);
    expect(m.strokes[0]!.screen.every(([x, y]) => x! >= 0 && x! <= 1 && y! >= 0 && y! <= 1)).toBe(true);
    expect(['ball', 'panel']).toContain(m.picks[0]!.featureId);
    expect(Math.hypot(...m.picks[0]!.normal)).toBeCloseTo(1, 2);
    expect(m.regions.length).toBeGreaterThan(0);
    expect(m.camera).toBeTruthy();
    expect(m.viewport).toBeTruthy();
    expect(m).not.toHaveProperty('note');
    if (m.screenshot) expect(m.screenshot.length).toBeLessThanOrEqual(200_000);
    await page.screenshot({ path: testInfo.outputPath('mark-paint-stroke.png') });

    // A drag that starts on the background turns the view and paints nothing.
    await page.mouse.move(box.x + 20, box.y + box.height - 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + box.height - 40, { steps: 10 });
    await page.mouse.up();
    await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');
    expect(await cameraOf(frame)).not.toBe(before);

    // Undo, then paint again and turn the pencil off: marks stay.
    await frame.getByTestId('mark-undo').click();
    await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '0');
    await expect.poll(async () => (await lastMarks(page))?.strokes.length ?? -1).toBe(0);
    await page.mouse.click(cx, cy);
    await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');

    // Pencil off: a drag on the model orbits again.
    await page.mouse.move(cx - 30, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 30, cy, { steps: 8 });
    await page.mouse.up();
    await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');

    const requests = await page.evaluate(() => (window as unknown as { editRequests: unknown[] }).editRequests);
    expect(requests).toHaveLength(0);

    await frame.getByTestId('mark-clear').click();
    await expect.poll(async () => (await lastMarks(page))?.strokes.length ?? -1).toBe(0);
});

test('Mark stays hidden without a widget hello (plain embed)', async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
    const meshUrl = new URL('/fixtures/soccer-ball.mesh.json', baseURL).toString();
    await page.goto(`${baseURL}/embed/soccer?meshUrl=${encodeURIComponent(meshUrl)}&instance=${INSTANCE}`);
    await expect(page.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('measure-toggle')).toBeVisible();
    await expect(page.getByTestId('mark-toggle')).toHaveCount(0);
});

// Touch: one finger on the model paints, a second finger right away turns the
// gesture into navigation (no stroke), a quick two-finger tap undoes, and
// turning the pencil on asks the host for fullscreen.
test.describe('Mark with touch', () => {
    test.use({ hasTouch: true, isMobile: true });

    test('paint, cancel on a quick second finger, two-finger tap undo, fullscreen request', async ({ page }, testInfo) => {
        const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
        const frame = await hostAsWidget(page, baseURL, { width: 390, height: 520 }, ['marks-context']);
        await expect(frame.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });
        await frame.getByTestId('mark-toggle').tap();
        await expect(frame.getByTestId('mark-toggle')).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => page.evaluate(() => (window as unknown as { displayModes?: string[] }).displayModes ?? [])).toEqual(['fullscreen']);

        const box = (await frame.locator('canvas').first().boundingBox())!;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height * 0.45;
        const cdp = await page.context().newCDPSession(page);
        const touch = (type: string, points: Array<{ x: number; y: number; id: number }>) =>
            cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id })) });

        // One finger across the ball paints.
        await touch('touchStart', [{ x: cx - 10, y: cy, id: 1 }]);
        for (let i = 1; i <= 6; i += 1) await touch('touchMove', [{ x: cx - 10 + i * 4, y: cy + i, id: 1 }]);
        await touch('touchEnd', []);
        await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');

        // A second finger right away: navigation, the partial stroke is dropped.
        await touch('touchStart', [{ x: cx, y: cy, id: 1 }]);
        await touch('touchStart', [{ x: cx, y: cy, id: 1 }, { x: cx + 60, y: cy + 40, id: 2 }]);
        for (let i = 1; i <= 5; i += 1) await touch('touchMove', [{ x: cx - i * 6, y: cy - i * 6, id: 1 }, { x: cx + 60 + i * 6, y: cy + 40 + i * 6, id: 2 }]);
        await touch('touchEnd', []);
        await page.waitForTimeout(300);
        await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '1');

        // A quick two-finger tap undoes the stroke.
        await touch('touchStart', [{ x: box.x + 60, y: box.y + box.height - 60, id: 3 }]);
        await touch('touchStart', [{ x: box.x + 60, y: box.y + box.height - 60, id: 3 }, { x: box.x + 120, y: box.y + box.height - 60, id: 4 }]);
        await touch('touchEnd', []);
        await expect(frame.getByTestId('mark-toolbar')).toHaveAttribute('data-count', '0');
        await expect.poll(async () => (await lastMarks(page))?.strokes.length ?? -1).toBe(0);
    });
});
