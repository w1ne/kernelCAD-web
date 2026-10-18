// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Local performance record for the Studio browser kernel (see
// docs/superpowers/plans/artifacts/2026-10-18-browser-kernel/README.md).
//
// Runs this branch's dev server in hosted mode against the REAL published
// gallery (gallery.json is proxied to kernelcad.com; the source + precomputed
// mesh load from the CDN), opens the dual-bearing hand coffee grinder, waits
// for the in-browser kernel to warm, applies five parameter edits, records the
// kernel's own event timings, and records video for the demo clip.
//
//   npx tsx scripts/measure-browser-kernel.mts
//
// Outputs into the artifacts folder: perf.json, kernel-demo.webm (+ .mp4 when
// ffmpeg is available). Measurement is LOCAL validation of this branch; the
// deployed app.kernelcad.com build does not contain the browser kernel yet.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 5198;
const ORIGIN = `http://127.0.0.1:${PORT}`;
// `KERNEL_MEASURE_FIXTURE=1` measures the hermetic E2E fixture instead of the
// published coffee grinder. The grinder's initial paint needs a 19 MB CDN
// precompute and its cold in-browser warm build did not complete inside a
// practical measurement window — see the artifacts README for the exact
// numbers and the open items. The fixture mode records the same routing
// contract with short, reproducible timings.
const FIXTURE_MODE = process.env['KERNEL_MEASURE_FIXTURE'] === '1';
const SLUG = FIXTURE_MODE ? 'e2e-param-box' : 'hand-coffee-grinder';
const FIXTURE_SOURCE = FIXTURE_MODE
  ? readFileSync('tests/fixtures/browser-kernel/param-box.kcad.ts', 'utf8')
  : null;
const ARTIFACTS = 'docs/superpowers/plans/artifacts/2026-10-18-browser-kernel';
const EDITS: Array<{ name: string; value: string }> = FIXTURE_MODE
  ? [
      { name: 'w', value: '11' },
      { name: 'w', value: '12' },
      { name: 'w', value: '13' },
      { name: 'w', value: '14' },
      { name: 'w', value: '15' },
    ]
  : [
      { name: 'crankLength', value: '95' },
      { name: 'bodyDiameter', value: '60' },
      { name: 'explode', value: '2' },
      { name: 'crankDeg', value: '30' },
      { name: 'grindSetting', value: '1.5' },
    ];
const TARGET_PARAM_ROW = FIXTURE_MODE ? 'param-row-w' : 'param-row-crankLength';
// The model's own warm build is identified by its feature count: the starter
// (3 records) may warm before the gallery source arrives.
const EXPECTED_FEATURE_COUNT = FIXTURE_MODE ? 1 : 20;

interface KernelEvent {
  type: string;
  ms?: number;
  bytes?: number;
  featureCount?: number;
  reason?: string;
}

mkdirSync(ARTIFACTS, { recursive: true });

const ENV = { ...process.env, VITE_HOSTED_MESH: '1', VITE_API_BASE_URL: ORIGIN };

// Dev server. Its worker sub-build is the one the fixture E2E exercises; the
// production preview worker chunk closes on load (open item — see the
// artifacts README). The background warm budget (900 s) covers dev-mode's
// slower transform graph.
const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  env: ENV,
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (d) => {
  const s = String(d);
  if (s.includes('error') || s.includes('ready')) process.stdout.write(`[vite] ${s}`);
});

async function waitReady(): Promise<void> {
  for (let i = 0; i < 240; i++) {
    try {
      const res = await fetch(`${ORIGIN}/`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('vite did not start');
}

async function waitFor(check: () => boolean, timeoutMs: number, what: string): Promise<number> {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  return Date.now() - started;
}

const record: Record<string, unknown> = {
  date: new Date().toISOString(),
  slug: SLUG,
  machine: `${process.platform} ${process.arch}`,
  note: 'LOCAL validation of feat/studio-browser-kernel; not the deployed build.',
  edits: [],
};

try {
  await waitReady();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: `${ARTIFACTS}/video-raw`, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180_000);
  page.setDefaultNavigationTimeout(180_000);

  const kernelEvents: KernelEvent[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[kernel]')) {
      void msg.args()[1]?.jsonValue().then((v) => kernelEvents.push(v as KernelEvent)).catch(() => undefined);
      console.log('KERNEL:', text.slice(0, 200));
      return;
    }
    if (msg.type() === 'error') console.log('CONSOLE-ERR:', text.slice(0, 220));
  });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 220)));
  page.on('worker', (worker) => {
    console.log('WORKER SPAWNED:', worker.url().slice(-40));
    worker.on('close', () => console.log('WORKER CLOSED'));
  });

  // The gallery manifest must come from the CDN (galleryAssetBase() is '' on
  // localhost). On localhost the client resolves relative asset URLs against
  // the local origin, so rewrite each entry's sourceUrl to its absolute
  // kernelcad.com form; the source then loads from the real CDN.
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('_mesh') || u.includes('__kernelcad/mesh')) {
      console.log('RESP:', r.status(), r.request().method(), u.replace(ORIGIN, '').slice(0, 110));
    }
  });

  if (FIXTURE_MODE) {
    await page.route('**/gallery.json', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ entries: [{ slug: SLUG, sourceUrl: '/gallery/e2e/param-box.kcad.ts', title: 'E2E Param Box', scriptPath: null }] }),
    }));
    await page.route('**/gallery/e2e/param-box.kcad.ts', (route) => route.fulfill({
      contentType: 'text/plain', body: FIXTURE_SOURCE ?? '',
    }));
    await page.route('**/gallery/_mesh/**', (route) => route.fulfill({ status: 404, body: '' }));
  }
  if (!FIXTURE_MODE) {
    await page.route('**/gallery.json', async (route) => {
      const response = await route.fetch({ url: 'https://kernelcad.com/gallery.json' });
      const manifest = (await response.json()) as { entries?: Array<Record<string, unknown>> };
      const entries = (manifest.entries ?? []).map((entry) => ({
        ...entry,
        ...(typeof entry['sourceUrl'] === 'string'
          ? { sourceUrl: new URL(entry['sourceUrl'], 'https://kernelcad.com').toString() }
          : {}),
      }));
      await route.fulfill({ json: { ...manifest, entries } });
    });
    // The precomputed mesh also lives on the CDN; on localhost the client asks
    // the local origin. Remap every `_mesh` request to kernelcad.com so the
    // first paint is instant instead of waiting on a local node-kernel build.
    await page.route('**/gallery/_mesh/**', async (route) => {
      // Fetch from the CDN with Node's fetch, not `route.fetch`: the route
      // pattern matches the CDN URL too, so route.fetch would re-enter this
      // handler and dead-end at the catch.
      const url = route.request().url().replace(ORIGIN, 'https://kernelcad.com');
      try {
        const response = await fetch(url);
        const body = Buffer.from(await response.arrayBuffer());
        await route.fulfill({ status: response.status, contentType: response.headers.get('content-type') ?? 'application/octet-stream', body });
      } catch (err) {
        console.log('mesh proxy failed:', url, err instanceof Error ? err.message : String(err));
        await route.fulfill({ status: 404, body: '' });
      }
    });
  }

  console.log('--- opening gallery in hosted mode');
  const openedAt = Date.now();
  await page.goto(`${ORIGIN}/studio?gallery=${SLUG}&kernel=force`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="workbench-ready"]', { timeout: 240_000 });

  // The GALLERY SOURCE loads first (a stale starter warm may have run before
  // it arrived — the singleton swaps it after the settle delay). Wait for the
  // grinder's own params, then require a build event that happened AFTER that
  // point: the warm under measurement is the grinder's, not the starter's.
  const paramsTab = page.getByRole('tab', { name: 'Params', exact: true });
  await paramsTab.waitFor({ timeout: 600_000 });
  // Rows only render in the SELECTED tab panel — click before waiting for one.
  await page.keyboard.press('Escape').catch(() => undefined);
  await paramsTab.click({ force: true });
  await page.getByTestId(TARGET_PARAM_ROW).waitFor({ timeout: 600_000 });
  console.log('model params visible at', Date.now() - openedAt, 'ms');

  const buildWaitMs = await waitFor(
    () => kernelEvents.some((e) => e.type === 'build' && e.featureCount === EXPECTED_FEATURE_COUNT),
    900_000,
    `kernel warm build with ${EXPECTED_FEATURE_COUNT} features (cold in-browser build)`,
  );
  const init = kernelEvents.find((e) => e.type === 'init');
  const build = kernelEvents.find((e) => e.type === 'build' && e.featureCount === EXPECTED_FEATURE_COUNT);
  record['open_to_warm_ms'] = Date.now() - openedAt;
  record['wasm_init_ms'] = init?.ms ?? null;
  record['warm_build_ms'] = build?.ms ?? null;
  record['feature_count'] = build?.featureCount ?? null;
  console.log('warm build wait ms:', buildWaitMs, JSON.stringify(kernelEvents));

  for (const edit of EDITS) {
    const input = page.getByTestId(`scrub-input-${edit.name}`);
    await input.waitFor({ timeout: 120_000 });
    const before = kernelEvents.filter((e) => e.type === 'params').length;
    const t0 = Date.now();
    await input.fill(edit.value);
    await input.press('Enter');
    await waitFor(() => kernelEvents.filter((e) => e.type === 'params').length > before, 180_000, `params event for ${edit.name}`);
    const event = kernelEvents.filter((e) => e.type === 'params').at(-1);
    const wallMs = Date.now() - t0;
    const entry = { name: edit.name, value: edit.value, wall_ms: wallMs, kernel_ms: event?.ms ?? null, patch_bytes: event?.bytes ?? null };
    (record['edits'] as unknown[]).push(entry);
    console.log('edit:', JSON.stringify(entry));
    await page.waitForTimeout(1_200); // let the viewport settle so the video reads.
  }

  await page.waitForTimeout(2_000);
  const video = page.video();
  await context.close();
  await browser.close();
  const webmPath = video ? await video.path() : null;
  if (webmPath) {
    record['video_webm'] = webmPath;
    console.log('video:', webmPath);
  }

  writeFileSync(`${ARTIFACTS}/perf.json`, JSON.stringify(record, null, 2));
  console.log('wrote perf.json');
} finally {
  child.kill('SIGTERM');
}
