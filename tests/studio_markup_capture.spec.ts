// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { parseMarkupSnapshot } from '../src/studio/markup/markupSnapshot';

const WEBM_PATH = resolve('docs/demos/studio-markup/demo.webm');
const NOTE = 'Keep the mounting face flat';
const MOCK_SESSION = {
  access_token: 'markup-capture',
  refresh_token: 'markup-capture',
  token_type: 'bearer',
  expires_in: 3_600_000,
  expires_at: Math.floor(Date.now() / 1000) + 3_600_000,
  user: {
    id: 'markup-capture',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'markup-capture@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  },
};

test.use({ launchOptions: { args: ['--host-resolver-rules=MAP studio.test 127.0.0.1'] } });

// This point lies on the Bracket starter's upright face after the model's
// initial fit. The test waits for the worker before using the fixed projection.
const BRACKET_FACE_POINT = { x: 0.32, y: 0.43 } as const;

const MEASURE_POINTS = [
  [0.42, 0.48], [0.54, 0.48], [0.42, 0.58], [0.54, 0.58],
  [0.34, 0.43], [0.5, 0.43], [0.35, 0.62], [0.52, 0.64],
] as const;

async function clickUntilMeasurement(page: Page, canvas: Locator, width: number, height: number) {
  const measurement = page.getByRole('region', { name: 'Measurements' }).getByText(/Distance ·/);
  for (const [x, y] of MEASURE_POINTS) {
    await canvas.click({ position: { x: Math.round(width * x), y: Math.round(height * y) } });
    try {
      await expect(measurement).toBeVisible({ timeout: 900 });
      return;
    } catch { /* Continue until two snapped points complete a measurement. */ }
  }
  throw new Error('Could not take a point-to-point measurement on the visible model.');
}

test.describe('Studio markup capture', () => {
  test.skip(process.env.KCAD_CAPTURE !== '1', 'Run via npm run capture:studio-markup to record the workflow.');

  test('capture the Studio note, measurement, saved snapshot and replay workflow', async ({ browser }, testInfo) => {
    test.setTimeout(180_000);
    const recordingDir = await mkdtemp(join(tmpdir(), 'studio-markup-capture-'));
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: recordingDir, size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    let completed = false;
    try {
      await page.addInitScript((session) => {
        for (const key of ['sb-studio-auth-token', 'sb-studio.test-auth-token', 'sb-127-auth-token']) {
          localStorage.setItem(key, JSON.stringify(session));
        }
      }, MOCK_SESSION);
      await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
      let submittedPrompt = '';
      await page.route('**/api/v1/generate', (route) => {
        submittedPrompt = (route.request().postDataJSON() as { prompt: string }).prompt;
        return route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: [
            'event: generation\ndata: {"generationId":"markup-capture","anonId":"capture"}\n\n',
            'event: done\ndata: {"artifact":{"title":"Markup context demo","code":"return box(20, 20, 4);","parameters":[],"suggestions":[]},"generationId":"markup-capture","anonId":"capture","durationMs":1}\n\n',
          ].join(''),
        });
      });
      await page.goto('http://studio.test:5173/studio');
      await expect(page.getByTestId('workbench-ready')).toBeVisible({ timeout: 60_000 });

      await page.getByTestId('activity-projects').click();
      await page.getByTestId('projects-pane').getByRole('button', { name: 'Bracket', exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Bracket is open' })).toBeVisible();
      await expect(page.getByTestId('status-bar')).toContainText('Ready', { timeout: 60_000 });

      const canvas = page.getByTestId('viewer-container').locator('canvas');
      await expect(canvas).toBeVisible();
      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error('Studio viewer canvas has no visible bounds.');

      await page.getByRole('button', { name: 'Markup', exact: true }).click();
      await page.getByLabel('New note text').fill(NOTE);
      await canvas.click({ position: {
        x: Math.round(bounds.width * BRACKET_FACE_POINT.x),
        y: Math.round(bounds.height * BRACKET_FACE_POINT.y),
      } });
      await expect(page.getByLabel('Edit note 1')).toHaveValue(NOTE);

      await page.getByTestId('measure-toggle').click();
      await clickUntilMeasurement(page, canvas, bounds.width, bounds.height);
      const measurementList = page.getByRole('region', { name: 'Measurements' });
      await expect(measurementList.getByText(/Distance ·/)).toBeVisible();
      await page.getByTestId('measure-toggle').click();

      await page.getByTestId('activity-agent').click();
      await expect(page.getByLabel('Agent rail')).toBeVisible();
      await page.getByLabel('Generate prompt').fill('Use the note and measured dimension to guide the next edit.');
      await page.getByLabel('Generate prompt').press('Enter');
      await expect(page.getByTestId('agent-proposal')).toBeVisible({ timeout: 30_000 });
      expect(submittedPrompt).toContain('Studio markup snapshot JSON (schemaVersion 1):');
      const sentSnapshot = submittedPrompt.match(/Studio markup snapshot JSON \(schemaVersion 1\):\n(`{3,})json\n([\s\S]*?)\n\1/);
      expect(sentSnapshot).not.toBeNull();
      const promptSnapshot = parseMarkupSnapshot(sentSnapshot![2]!);
      expect(promptSnapshot.notes.some((note) => note.text === NOTE)).toBe(true);
      expect(promptSnapshot.measurements.some((measurement) => measurement.type === 'distance')).toBe(true);

      await page.getByTestId('activity-projects').click();
      await expect(page.getByTestId('markup-panel')).toBeVisible();
      const downloadWait = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save JSON' }).click();
      const download = await downloadWait;
      const downloadedSnapshot = await download.path();
      if (!downloadedSnapshot) throw new Error('Studio did not produce the snapshot download.');
      const snapshot = parseMarkupSnapshot(await readFile(downloadedSnapshot, 'utf8'));
      expect(snapshot.notes.some((note) => note.text === NOTE)).toBe(true);
      expect(snapshot.measurements.some((measurement) => measurement.type === 'distance')).toBe(true);

      await page.getByLabel('Choose markup snapshot').setInputFiles(downloadedSnapshot);
      await expect(page.getByTestId('markup-panel').getByRole('status')).toContainText('Snapshot loaded');
      await expect(page.getByLabel('Edit note 1')).toHaveValue(NOTE);
      await expect(page.getByRole('region', { name: 'Measurements' }).getByText(/Distance ·/)).toBeVisible();

      completed = true;
    } finally {
      const video = page.video();
      await context.close();
      if (video) {
        if (completed) await video.saveAs(WEBM_PATH);
        else await testInfo.attach('studio-markup-capture-failed.webm', { path: await video.path() });
      }
      await rm(recordingDir, { recursive: true, force: true });
    }
  });
});
