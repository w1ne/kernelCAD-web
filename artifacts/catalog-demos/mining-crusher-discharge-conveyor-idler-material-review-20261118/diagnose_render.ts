import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { findPlayerDist, startPlayerServer } from '../../../src/agent/render/playerServer';

const out = resolve('artifacts/catalog-demos/mining-crusher-discharge-conveyor-idler-material-review-20261118/verification');
const cdpUrl = process.env.PW_CDP_URL ?? 'http://127.0.0.1:9222';
const dist = findPlayerDist();
if (!dist) throw new Error('dist/headless-player not found');
await mkdir(out, { recursive: true });
const surface = await startPlayerServer(dist);
const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
const page = await context.newPage();
const events: string[] = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') events.push(`console.${message.type()}: ${message.text()}`);
});
page.on('pageerror', (error) => events.push(`pageerror: ${error.stack ?? error.message}`));
page.on('requestfailed', (request) => events.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`));
page.on('response', (response) => {
  if (response.status() >= 400) events.push(`http ${response.status()}: ${response.url()}`);
});
let result: Record<string, unknown>;
try {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const response = await page.goto(`${surface.baseUrl}/demo-player?headless=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  let ready = false;
  try {
    await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 90_000 });
    ready = true;
  } catch (error) {
    events.push(`ready timeout: ${error instanceof Error ? error.message : String(error)}`);
  }
  const pageState = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyText: document.body.innerText.slice(0, 2000),
    ready: window.__demoPlayer !== undefined,
    canvasCount: document.querySelectorAll('canvas').length,
    rootHtml: document.querySelector('#root')?.innerHTML.slice(0, 2000) ?? '',
  }));
  await page.screenshot({ path: resolve(out, 'render-player-diagnostic.png'), timeout: 15_000 });
  result = { cdpUrl, renderBase: surface.baseUrl, status: response?.status(), ready, pageState, events };
} finally {
  await page.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
  await surface.close();
}
await writeFile(resolve(out, 'render-player-diagnostic.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
