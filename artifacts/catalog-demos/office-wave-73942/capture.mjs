import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.cwd();
const demoRoot = dirname(fileURLToPath(import.meta.url));
const cdpBase = process.env.KCAD_CDP_ENDPOINT ?? 'http://127.0.0.1:9222';
const maxRuntimeMs = 120_000;
const idleTimeoutMs = 30_000;
const width = 1280;
const height = 720;
const secondsPerSlide = 4;
const outputFps = 24;
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const index = JSON.parse(readFileSync(join(repoRoot, 'catalog/index.json'), 'utf8'));
const officeAssets = index.assets.filter((asset) => asset.kit === 'office');
if (officeAssets.length !== 40) throw new Error(`Expected 40 office assets in catalog/index.json, found ${officeAssets.length}`);

const heroIds = ['calculator', 'letter-tray', 'pencil-cup'];
const byId = new Map(officeAssets.map((asset) => [asset.id, asset]));
const img = (asset, className = '') => `<img class="${className}" src="/preview/${encodeURIComponent(asset.id)}.png" alt="${escapeHtml(asset.title)} preview">`;
const footer = '<footer>LOCAL PREVIEW REPLAY · PR BRANCH · NO DEPLOYMENT OR HARDWARE ACCEPTANCE</footer>';
const cards = (batch) => officeAssets.slice(batch * 10, batch * 10 + 10).map((asset, offset) => `
  <article class="asset-card">
    <div class="preview">${img(asset)}</div>
    <div class="asset-copy"><strong>${escapeHtml(asset.title)}</strong><span>${escapeHtml(asset.category)} · ${asset.stats.triangles} tris · ${String(batch * 10 + offset + 1).padStart(2, '0')}</span></div>
  </article>`).join('');

const slides = [
  `<section class="slide hero active" data-slide="0">
    <div class="hero-copy"><p class="eyebrow">KERNELCAD · ORIGINAL PARAMETRIC CATALOG</p><h1>40 new<br><em>office assets</em></h1>
      <p class="subtitle">Desk supplies, document handling and workstation accessories, authored as editable <code>.kcad.ts</code> models.</p>
      <div class="chips"><span>CC0 1.0</span><span>millimetres · Z up</span><span>format + colour knobs</span></div>
      <p class="hero-note">Local catalog build from original kernelCAD source. No imported store meshes.</p></div>
    <div class="hero-objects">${heroIds.map((id) => `<figure>${img(byId.get(id))}<figcaption>${escapeHtml(byId.get(id).title)}</figcaption></figure>`).join('')}</div>
    ${footer}
  </section>`,
  `<section class="slide workflow" data-slide="1">
    <header><p class="eyebrow">SOURCE → CHECK → PREVIEW</p><h1>One kit, 40 editable sources</h1></header>
    <div class="steps">
      <article><b>01</b><h2>Author</h2><code>catalog/kits/office/*.kcad.ts</code><p>Each model has CC0 metadata, labelled knobs and a low-poly triangle budget.</p></article>
      <article><b>02</b><h2>Check</h2><code>checkCatalogAsset.ts</code><p><strong>40 / 40 passed</strong><br>Each stands at z = 0 with one material.</p></article>
      <article><b>03</b><h2>Build</h2><code>npm run catalog:build</code><p><strong>413 assets</strong><br>12 kits in the generated index.</p></article>
      <article><b>04</b><h2>Preview + gate</h2><code>npm run catalog:previews</code><p><strong>40 office previews</strong><br>Catalog integration gate: 2 / 2 tests passed.</p></article>
    </div>
    <div class="evidence"><span><b>Replay</b> generated local PNGs</span><span><b>Simulation</b> not run</span><span><b>Deployment</b> not verified; PR branch only</span><span><b>Hardware</b> not applicable</span></div>
    ${footer}
  </section>`,
  ...[0, 1, 2, 3].map((batch) => `<section class="slide gallery" data-slide="${batch + 2}">
    <header><div><p class="eyebrow">OFFICE KIT · ORIGINAL PARAMETRIC MODELS</p><h1>${String(batch * 10 + 1).padStart(2, '0')}–${String(batch * 10 + 10).padStart(2, '0')} <em>of 40</em></h1></div><span class="counter">${String(batch + 1).padStart(2, '0')} / 04</span></header>
    <div class="grid">${cards(batch)}</div>
    ${footer}
  </section>`),
].join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${width}, initial-scale=1">
<title>kernelCAD office asset wave</title>
<style>
:root{color-scheme:dark;--bg:#111923;--panel:#1a2632;--line:#304455;--text:#edf2f3;--muted:#a6b5be;--accent:#8ed3c4;--warm:#e0b677}
*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:var(--bg);color:var(--text);font:16px/1.35 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.slide{display:none;width:100%;height:100%;position:relative;padding:28px 34px 52px}.slide.active{display:flex;flex-direction:column}h1,h2,p{margin:0}h1{font-size:34px;line-height:1.04;letter-spacing:-.035em}h1 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--warm);font-size:12px;font-weight:750;letter-spacing:.15em;margin-bottom:10px}footer{position:absolute;left:34px;right:34px;bottom:16px;border-top:1px solid var(--line);padding-top:9px;color:var(--muted);font-size:10px;letter-spacing:.11em;font-weight:650}
.hero{display:none;grid-template-columns:1.1fr .9fr;align-items:center;gap:24px;padding-bottom:60px}.hero.active{display:grid}.hero-copy h1{font-size:66px;margin:4px 0 18px}.subtitle{max-width:560px;color:#c8d3d8;font-size:20px}.subtitle code{color:var(--accent);font-size:.86em}.chips{display:flex;gap:8px;margin:24px 0 0;flex-wrap:wrap}.chips span{border:1px solid #456171;background:#192a34;padding:7px 11px;border-radius:999px;color:#d6e4e6;font-size:12px}.hero-note{margin-top:25px;color:var(--muted);font-size:13px}.hero-objects{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:center}.hero-objects figure{margin:0;background:#edf2f5;border-radius:12px;overflow:hidden;text-align:center;color:#26343e;font-weight:650;font-size:13px}.hero-objects figure:first-child{grid-column:1 / -1;width:58%;justify-self:center}.hero-objects img{display:block;width:100%;height:178px;object-fit:contain}.hero-objects figure:first-child img{height:202px}.hero-objects figcaption{padding:0 8px 10px}
.workflow header{display:flex;align-items:end;justify-content:space-between;margin:4px 0 22px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;flex:1}.steps article{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:17px 14px}.steps b{color:var(--warm);font-size:13px;letter-spacing:.12em}.steps h2{font-size:21px;margin:8px 0}.steps code{display:block;min-height:34px;color:var(--accent);font-size:11px;overflow-wrap:anywhere}.steps p{color:#bdc9ce;font-size:13px;margin-top:13px}.steps p strong{color:#fff;font-size:16px}.evidence{display:flex;justify-content:space-between;gap:10px;margin:16px 0 0;padding:12px 14px;background:#182730;border:1px solid #355062;border-radius:9px;color:#cbd6da;font-size:11px}.evidence b{color:var(--accent);margin-right:4px}
.gallery{padding-top:23px}.gallery header{height:64px;display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.gallery header h1{font-size:31px}.counter{color:var(--warm);font-weight:700;font-size:14px}.grid{display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);gap:10px;flex:1;min-height:0}.asset-card{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:9px;overflow:hidden;display:flex;flex-direction:column}.preview{background:#edf2f5;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}.preview img{width:100%;height:100%;object-fit:contain}.asset-copy{height:43px;display:flex;justify-content:center;flex-direction:column;padding:4px 9px;gap:1px}.asset-copy strong{font-size:12px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.asset-copy span{font-size:9px;color:var(--muted)}
</style></head><body>${slides}<script>window.setSlide=(index)=>{document.querySelectorAll('.slide').forEach((slide,i)=>slide.classList.toggle('active',i===index));document.body.dataset.slide=String(index)};</script></body></html>`;

const presentationPath = join(demoRoot, 'presentation.html');
writeFileSync(presentationPath, html);
const framesDir = join(demoRoot, 'frames');
mkdirSync(framesDir, { recursive: true });

let target;
let socket;
let server;
let lastActivity = Date.now();
let completed = false;
let nextId = 0;
const pending = new Map();
let loadResolver;
let pageLoaded = false;
const pageReady = new Promise((resolvePromise) => { loadResolver = resolvePromise; });
const touch = () => { lastActivity = Date.now(); };
const cleanup = async () => {
  completed = true;
  clearInterval(idleWatch);
  clearTimeout(deadline);
  for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(new Error('Capture ended')); }
  pending.clear();
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (target) await fetch(`${cdpBase}/json/close/${target.id}`).catch(() => undefined);
  if (server) await new Promise((resolvePromise) => server.close(() => resolvePromise()));
};
const idleWatch = setInterval(() => {
  if (!completed && Date.now() - lastActivity > idleTimeoutMs) {
    console.error(`CDP capture idle timeout after ${idleTimeoutMs} ms; closing only the owned tab.`);
    void cleanup().finally(() => process.exit(2));
  }
}, 1_000);
const deadline = setTimeout(() => {
  console.error(`CDP capture exceeded ${maxRuntimeMs} ms; closing only the owned tab.`);
  void cleanup().finally(() => process.exit(3));
}, maxRuntimeMs);

try {
  server = createServer((request, response) => {
    touch();
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (requestUrl.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    const match = /^\/preview\/([a-z0-9-]+)\.png$/.exec(requestUrl.pathname);
    if (match) {
      const asset = byId.get(match[1]);
      const previewPath = join(repoRoot, 'catalog/kits/office/previews', `${match[1]}.png`);
      if (asset && existsSync(previewPath)) {
        response.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
        createReadStream(previewPath).pipe(response);
        return;
      }
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const localUrl = `http://127.0.0.1:${server.address().port}/`;
  const versionResponse = await fetch(`${cdpBase}/json/version`);
  if (!versionResponse.ok) throw new Error(`CDP endpoint unavailable at ${cdpBase}; no browser was launched.`);
  const browserVersion = await versionResponse.json();
  const targetResponse = await fetch(`${cdpBase}/json/new?about:blank`, { method: 'PUT' });
  if (!targetResponse.ok) throw new Error(`Could not create an owned tab through ${cdpBase}: HTTP ${targetResponse.status}`);
  target = await targetResponse.json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.addEventListener('message', (event) => {
    touch();
    const message = JSON.parse(String(event.data));
    if (message.method === 'Page.loadEventFired') {
      pageLoaded = true;
      loadResolver();
    }
    if (message.id !== undefined) {
      const task = pending.get(message.id);
      if (!task) return;
      clearTimeout(task.timer);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    }
  });
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener('open', resolvePromise, { once: true });
    socket.addEventListener('error', () => reject(new Error('CDP WebSocket connection failed')), { once: true });
  });
  const send = (method, params = {}) => new Promise((resolvePromise, reject) => {
    touch();
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP command timed out: ${method}`));
    }, 10_000);
    pending.set(id, { resolve: resolvePromise, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: localUrl });
  await Promise.race([pageReady, sleep(15_000).then(() => { throw new Error('Local presentation page did not load in time'); })]);
  if (!pageLoaded) throw new Error('Local presentation load event was not observed');
  await send('Runtime.evaluate', { expression: 'Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)))', awaitPromise: true });
  await sleep(400);

  for (let slide = 0; slide < 6; slide++) {
    await send('Runtime.evaluate', { expression: `window.setSlide(${slide})` });
    await sleep(500);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const output = join(framesDir, `frame-${String(slide + 1).padStart(2, '0')}.png`);
    writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
    console.log(`captured slide ${slide + 1}/6 -> ${output}`);
  }
  writeFileSync(join(demoRoot, 'settings.json'), JSON.stringify({
    title: 'kernelCAD office asset wave',
    catalogAssets: officeAssets.length,
    catalogIndexAssets: index.assets.length,
    catalogKits: index.kits.length,
    browser: browserVersion.Browser,
    cdpEndpoint: cdpBase,
    attachedTab: 'new temporary tab, closed by capture cleanup',
    launchedNewBrowser: false,
    width,
    height,
    secondsPerSlide,
    outputFps,
    maxRuntimeMs,
    idleTimeoutMs,
  }, null, 2) + '\n');
  console.log('capture complete; the existing browser remains open and the owned tab is closed');
} finally {
  await cleanup();
}
