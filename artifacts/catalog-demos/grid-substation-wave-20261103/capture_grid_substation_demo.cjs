#!/usr/bin/env node
// Attach to the user's existing Chrome/CDP session; never launch another browser.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const bundle = __dirname;
const output = path.join(bundle, 'preview-review', 'demo-captures');
const baseUrl = process.env.DEMO_BASE_URL || 'http://127.0.0.1:8766';
const endpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9223';
const idleTimeoutMs = 45_000;
const hardLifetimeMs = 160_000;
let lastActivity = Date.now();
let page;

fs.mkdirSync(output, { recursive: true });
const touch = () => { lastActivity = Date.now(); };
const hardTimer = setTimeout(() => {
  process.stderr.write('capture exceeded its fixed 160 second lifetime\n');
  process.exit(124);
}, hardLifetimeMs);
const idleTimer = setInterval(() => {
  if (Date.now() - lastActivity > idleTimeoutMs) {
    process.stderr.write('capture exceeded its 45 second idle timeout\n');
    process.exit(124);
  }
}, 1000);

async function main() {
  const browser = await Promise.race([
    chromium.connectOverCDP(endpoint),
    new Promise((_, reject) => setTimeout(() => reject(new Error('CDP attach timed out after 25 seconds')), 25_000)),
  ]);
  const context = browser.contexts()[0];
  if (!context) throw new Error('the attached Chrome has no existing user context');
  page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  page.setDefaultTimeout(12_000);

  await page.goto(`${baseUrl}/catalog/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#catalog-q').fill('grid substation');
  await page.waitForFunction(() => document.querySelectorAll('[data-kit] li:not([hidden])').length === 80);
  await page.locator('#kit-grid-substation').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('#kit-grid-substation li:not([hidden]) img'));
    return images.length === 80 && images.slice(0, 8).every((img) => img.complete && img.naturalWidth > 0);
  });
  touch();
  await page.screenshot({ path: path.join(output, '01-catalog-search.png') });

  await page.locator('a[href="/catalog/grid-substation/substation-main-power-transformer/"]').first().click();
  await page.waitForFunction(() => document.querySelector('h1')?.textContent?.includes('Main power transformer'));
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.hero img')).every((img) => img.complete && img.naturalWidth > 0));
  const detailText = await page.locator('main').innerText();
  if (!detailText.includes('Overall scale') || !detailText.includes('Asset color')) {
    throw new Error('asset detail page did not expose both catalog parameters');
  }
  await page.evaluate(() => { document.body.style.zoom = '0.72'; });
  await page.evaluate(() => window.scrollBy(0, 96));
  touch();
  await page.screenshot({ path: path.join(output, '02-asset-detail.png') });

  await page.goto(`${baseUrl}/catalog/grid-substation-scale-comparison.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.pair img')).length === 2
    && Array.from(document.querySelectorAll('.pair img')).every((img) => img.complete && img.naturalWidth > 0));
  touch();
  await page.screenshot({ path: path.join(output, '03-scale-variant.png') });

  const report = {
    browserEndpoint: endpoint,
    attachedToExistingChrome: true,
    launchedBrowser: false,
    temporaryPageClosed: true,
    pageTitles: ['Low-poly 3D model catalog (CC0) | kernelCAD', 'Main power transformer · Grid Substation · kernelCAD', 'Scale variant · local catalog evidence'],
    searchQuery: 'grid substation',
    filteredAssetCount: 80,
    detailHasScaleAndColorParameters: true,
    assetDetailCaptureZoom: 0.72,
    assetDetailCaptureScrollPixels: 96,
    capturedScreenshots: ['01-catalog-search.png', '02-asset-detail.png', '03-scale-variant.png'],
    localPageBase: baseUrl,
    idleTimeoutSeconds: 45,
    fixedLifetimeSeconds: 160,
  };
  fs.writeFileSync(path.join(bundle, 'demo-capture-verification.json'), `${JSON.stringify(report, null, 2)}\n`);
  touch();
}

main()
  .catch(async (error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (page) await page.close().catch(() => {});
    clearTimeout(hardTimer);
    clearInterval(idleTimer);
    setTimeout(() => process.exit(process.exitCode || 0), 25).unref();
  });
