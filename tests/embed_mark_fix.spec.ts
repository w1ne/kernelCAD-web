// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { expect, test, type Page } from '@playwright/test';

// "Mark & fix" in the ChatGPT embed. The host page plays the kernelCAD
// widget: it answers every viewer status from its instance with a hello,
// records the edit request the embed posts, and acks it. The mesh is the
// local soccer-ball fixture (features "ball" and "panel").

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

test('Mark & fix: tap to pin, note, send a targeted edit request', async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
    const size = { width: 390, height: 520 };
    const frame = await hostAsWidget(page, baseURL, size);
    await expect(frame.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });

    const toggle = frame.getByTestId('mark-fix-toggle');
    await expect(toggle).toBeEnabled();
    // Measure and Dimensions still share the top row.
    await expect(frame.getByTestId('measure-toggle')).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(36);
    await toggle.click();
    await expect(frame.getByTestId('mark-fix-panel')).toBeVisible();

    // Tap the middle of the canvas: the ball sits there.
    const canvas = frame.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no box');
    await page.screenshot({ path: testInfo.outputPath('mark-fix-open.png') });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(1);
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.52);
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(2);
    await expect(frame.getByTestId('mark-fix-chip').first()).toContainText(/ball|panel/);

    await frame.getByTestId('mark-fix-note').fill('make this smoother');
    await page.screenshot({ path: testInfo.outputPath('mark-fix-panel.png') });

    // A drag orbits and drops nothing.
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.35, { steps: 8 });
    await page.mouse.up();
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(2);

    // Tapping a pin removes it.
    await frame.getByTestId('mark-fix-pin').nth(1).click();
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(1);

    await frame.getByTestId('mark-fix-send').click();
    await expect(frame.getByTestId('mark-fix-sent')).toBeVisible();
    await expect(frame.getByTestId('mark-fix-panel')).toHaveCount(0);
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('mark-fix-sent.png') });

    const requests = await page.evaluate(() => (window as unknown as { editRequests: unknown[] }).editRequests);
    expect(requests).toHaveLength(1);
    const req = requests[0] as {
        v: number; slug: string; instanceId: string; note: string; screenshot?: string;
        picks: Array<{ featureId?: string; surface: string; point: number[]; normal: number[] }>;
    };
    expect(req).toMatchObject({ v: 1, slug: 'soccer', instanceId: INSTANCE, note: 'make this smoother' });
    expect(req.picks).toHaveLength(1);
    expect(['ball', 'panel']).toContain(req.picks[0]!.featureId);
    expect(req.picks[0]!.point.every((n) => Number.isFinite(n))).toBe(true);
    expect(Math.hypot(...req.picks[0]!.normal)).toBeCloseTo(1, 2);
    if (req.screenshot) expect(req.screenshot.length).toBeLessThanOrEqual(200_000);
    expect(JSON.stringify(req).length).toBeLessThan(210_000);
});

// Phone-sized card inside a host chat whose widget forwards marks into the
// model context: marking is only painting. No note box, no Send, nothing over
// the model; the user types the change in the host chat's own composer.
test('Mark in a host chat: paint only, marks reach the widget, nothing covers the model', async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
    const size = { width: 390, height: 520 };
    const frame = await hostAsWidget(page, baseURL, size, ['edit-request', 'marks-context']);
    await expect(frame.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });

    await frame.getByTestId('mark-fix-toggle').click();
    await expect(frame.getByTestId('mark-paint-bar')).toHaveAttribute('data-active', 'true');
    await expect(frame.getByTestId('mark-fix-panel')).toHaveCount(0);
    await expect(frame.locator('textarea')).toHaveCount(0);
    await expect(frame.getByText(/send to chat/i)).toHaveCount(0);

    const canvas = frame.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no box');
    // The controls stay in the top band of the card, clear of the model.
    const bar = await frame.getByTestId('mark-paint-bar').boundingBox();
    const hint = await frame.getByTestId('mark-paint-hint').boundingBox();
    expect((bar?.y ?? 0) + (bar?.height ?? 0) - box.y).toBeLessThanOrEqual(56);
    expect((hint?.y ?? 0) + (hint?.height ?? 0) - box.y).toBeLessThanOrEqual(90);
    expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeLessThanOrEqual(box.x + box.width);

    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.45);
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(1);
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.52);
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(2);
    await expect(frame.getByTestId('mark-fix-count')).toHaveText('2');
    await expect.poll(async () => page.evaluate(() => {
        const marks = (window as unknown as { marks: Array<{ picks: unknown[] }> }).marks;
        return marks.at(-1)?.picks.length ?? 0;
    })).toBe(2);
    await page.screenshot({ path: testInfo.outputPath('mark-paint-active.png') });

    // Undo drops the last one, for the host too.
    await frame.getByTestId('mark-fix-undo').click();
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(1);
    await expect.poll(async () => page.evaluate(() => {
        const marks = (window as unknown as { marks: Array<{ picks: unknown[] }> }).marks;
        return marks.at(-1)?.picks.length ?? -1;
    })).toBe(1);

    // Done leaves mark mode; the mark stays drawn and in context.
    await frame.getByTestId('mark-fix-done').click();
    await expect(frame.getByTestId('mark-paint-bar')).toHaveAttribute('data-active', 'false');
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('mark-paint-done.png') });

    const last = await page.evaluate(() => (window as unknown as { marks: unknown[] }).marks.at(-1));
    const msg = last as { v: number; slug: string; instanceId: string; seq: number; screenshot?: string; picks: Array<{ featureId?: string; normal: number[] }> };
    expect(msg).toMatchObject({ v: 1, slug: 'soccer', instanceId: INSTANCE });
    expect(msg).not.toHaveProperty('note');
    expect(['ball', 'panel']).toContain(msg.picks[0]!.featureId);
    expect(Math.hypot(...msg.picks[0]!.normal)).toBeCloseTo(1, 2);
    if (msg.screenshot) expect(msg.screenshot.length).toBeLessThanOrEqual(200_000);
    const requests = await page.evaluate(() => (window as unknown as { editRequests: unknown[] }).editRequests);
    expect(requests).toHaveLength(0);

    // Clear from the idle bar removes it everywhere.
    await frame.getByTestId('mark-fix-clear').click();
    await expect(frame.getByTestId('mark-fix-pin')).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => {
        const marks = (window as unknown as { marks: Array<{ picks: unknown[] }> }).marks;
        return marks.at(-1)?.picks.length ?? -1;
    })).toBe(0);
});

test('Mark & fix stays hidden without a widget hello (plain embed)', async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173');
    const meshUrl = new URL('/fixtures/soccer-ball.mesh.json', baseURL).toString();
    await page.goto(`${baseURL}/embed/soccer?meshUrl=${encodeURIComponent(meshUrl)}&instance=${INSTANCE}`);
    await expect(page.locator('[data-embed-phase="model_displayed"]')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('measure-toggle')).toBeVisible();
    await expect(page.getByTestId('mark-fix-toggle')).toHaveCount(0);
});
