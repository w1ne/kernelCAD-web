// Capture the local, source-generated asset page through the user's existing
// Chrome/CDP session. This script creates and closes only its own tab.
// Invocation: node docs/demos/catalog-acquisition/capture.mjs [base-url] [asset-path]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4179';
const assetPath = process.argv[3] ?? '/catalog/characters/bear/';
const cdpUrl = process.env.KCAD_CDP_URL ?? 'http://127.0.0.1:9222';
const outputDir = resolve('docs/demos/catalog-acquisition');
const framesDir = join(outputDir, '.frames');
mkdirSync(framesDir, { recursive: true });

function glbTriangleCount(bytes) {
  if (bytes.byteLength < 20) throw new Error('GLB is shorter than its header and JSON chunk.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== bytes.byteLength) {
    throw new Error('Invalid GLB header.');
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || jsonLength + 20 > bytes.byteLength) throw new Error('Invalid GLB JSON chunk.');
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)));
  let triangles = 0;
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    const accessor = primitive.indices ?? primitive.attributes?.POSITION;
    const count = accessor === undefined ? undefined : json.accessors?.[accessor]?.count;
    if ((primitive.mode ?? 4) !== 4 || count === undefined) throw new Error('GLB primitive is not a readable triangle mesh.');
    triangles += Math.floor(count / 3);
  }
  return triangles;
}

const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
if (!context) throw new Error('The existing Chrome CDP session has no browser context.');
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));

try {
  await page.setViewportSize({ width: 1280, height: 940 });
  const response = await page.goto(new URL(assetPath, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (!response || response.status() !== 200) throw new Error(`Asset page returned HTTP ${response?.status() ?? 'no response'}.`);
  await page.waitForFunction(() => customElements.get('model-viewer') !== undefined, { timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector('#asset-viewer')?.loaded === true, { timeout: 30_000 });

  const pageFacts = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null,
    jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    viewerTag: document.querySelector('#asset-viewer')?.tagName.toLowerCase() ?? null,
    viewerLoaded: document.querySelector('#asset-viewer')?.loaded === true,
    variants: [...document.querySelectorAll('[data-asset-variant]')].map(button => button.textContent.trim()),
    studioHref: document.querySelector('.cta')?.getAttribute('href') ?? null,
  }));
  if (!pageFacts.title || !pageFacts.canonical || !pageFacts.ogImage || pageFacts.jsonLdCount < 2 || !pageFacts.h1) {
    throw new Error(`SEO metadata is incomplete: ${JSON.stringify(pageFacts)}`);
  }
  if (pageFacts.viewerTag !== 'model-viewer' || !pageFacts.viewerLoaded) throw new Error('The model-viewer element did not load its GLB.');

  const links = await page.locator('.downloads a').evaluateAll(elements => elements.map(element => ({
    href: new URL(element.getAttribute('href'), location.href).toString(),
    label: element.textContent.trim(),
  })));
  const downloadResponses = [];
  for (const link of links) {
    const result = await context.request.get(link.href);
    const contentLength = Number(result.headers()['content-length'] ?? '0');
    const disposition = result.headers()['content-disposition'] ?? null;
    if (result.status() !== 200 || contentLength <= 0 || !disposition?.startsWith('attachment; filename=')) {
      throw new Error(`${link.label}: HTTP ${result.status()}, Content-Length ${contentLength}, Content-Disposition ${disposition}`);
    }
    downloadResponses.push({ label: link.label, url: link.href, status: result.status(), contentLength, contentDisposition: disposition });
    await result.body();
  }

  const downloadReport = JSON.parse(readFileSync(join(outputDir, 'downloads.json'), 'utf8'));
  const assetKeys = ['characters/bear', 'characters/blocky-villager', 'characters/chef-npc', 'characters/chicken', 'characters/cow'];
  const fileVerifications = [];
  for (const assetKey of assetKeys) {
    const records = downloadReport.records.filter(record => record.path.startsWith(`catalog/${assetKey}/`));
    if (!records.some(record => record.format === 'glb' && record.preset === 'default')
      || !records.some(record => record.format === 'step')
      || records.filter(record => record.format === 'glb' && record.preset !== 'default').length < 1) {
      throw new Error(`${assetKey}: the build report does not include default GLB, STEP and at least one preset GLB.`);
    }
    for (const record of records) {
      const result = await context.request.get(new URL(record.path, baseUrl).toString());
      const body = await result.body();
      const sha256 = createHash('sha256').update(body).digest('hex');
      const contentLength = Number(result.headers()['content-length'] ?? '0');
      const disposition = result.headers()['content-disposition'] ?? '';
      const triangles = record.format === 'glb' ? glbTriangleCount(body) : record.triangles;
      if (result.status() !== 200 || contentLength <= 0 || contentLength !== body.byteLength || body.byteLength !== record.bytes
        || sha256 !== record.sha256 || !disposition.startsWith(`attachment; filename="${record.path.split('/').at(-1)}"`)
        || triangles === null || triangles <= 0 || triangles > record.triangleBudget) {
        throw new Error(`${record.path}: failed HTTP/file integrity verification.`);
      }
      fileVerifications.push({
        path: record.path,
        format: record.format,
        preset: record.preset,
        status: result.status(),
        bytes: body.byteLength,
        sha256,
        triangles,
        triangleBudget: record.triangleBudget,
        triangleCountSource: record.format === 'step' ? 'matching default GLB; STEP is exact CAD geometry' : 'downloaded GLB',
        contentDisposition: disposition,
      });
    }
  }

  const cdn = await context.newCDPSession(page);
  let frameNumber = 0;
  let lastFrameAt = 0;
  const frameErrors = [];
  cdn.on('Page.screencastFrame', event => {
    const now = Date.now();
    if (now - lastFrameAt >= 100) {
      lastFrameAt = now;
      const file = join(framesDir, `frame-${String(frameNumber++).padStart(4, '0')}.jpg`);
      try { writeFileSync(file, Buffer.from(event.data, 'base64')); }
      catch (error) { frameErrors.push(String(error)); }
    }
    void cdn.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(error => frameErrors.push(String(error)));
  });
  await cdn.send('Page.startScreencast', { format: 'jpeg', quality: 86, maxWidth: 1280, maxHeight: 940, everyNthFrame: 1 });
  await page.waitForTimeout(1_200);
  const variants = page.locator('[data-asset-variant]');
  if (await variants.count() > 1) {
    await variants.nth(1).click();
    await page.waitForFunction(() => document.querySelector('#download-glb')?.getAttribute('href') === document.querySelector('[data-asset-variant][aria-pressed="true"]')?.getAttribute('data-src'), { timeout: 5_000 });
    await page.waitForFunction(() => document.querySelector('#asset-viewer')?.loaded === true, { timeout: 20_000 });
    await page.waitForTimeout(1_500);
  }
  await page.locator('#mcp-prompt').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);
  await page.locator('.downloads').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);
  await cdn.send('Page.stopScreencast');
  await cdn.detach();
  if (frameErrors.length) throw new Error(`Screencast errors: ${frameErrors.join('; ')}`);
  if (frameNumber < 20) throw new Error(`Only ${frameNumber} video frames were captured.`);
  if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join('; ')}`);

  writeFileSync(join(outputDir, 'browser-check.json'), `${JSON.stringify({
    checkedAt: new Date().toISOString(),
    mode: 'local static build in existing Chrome/CDP session; no production deployment was tested',
    pageUrl: new URL(assetPath, baseUrl).toString(),
    pageFacts,
    downloadResponses,
    fileVerificationAssets: assetKeys,
    fileVerifications,
    pageErrors,
    video: { frameCount: frameNumber, frameRate: 10, sourceFrames: '.frames/frame-%04d.jpg' },
  }, null, 2)}\n`);
  console.log(JSON.stringify({ pageFacts, downloadResponses, fileVerificationAssets: assetKeys, fileVerifications, frameCount: frameNumber, pageErrors }, null, 2));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}
