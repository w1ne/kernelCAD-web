// scripts/captureAnimationView.mjs
//
// Reads an `animationView({...})` virtual feature record from a .kcad.ts
// script, samples the declared param sweep at `ceil(durationMs / 1000 * fps)`
// frames, and stitches an MP4 via ffmpeg. Each frame's recompute uses the
// per-session mesh cache so warm frame meshing is ~5 ms even for 24-part
// assemblies.
//
// Usage:
//   npx tsx scripts/captureAnimationView.mjs <script.kcad.ts> [outFile.mp4]
//
// Defaults: writes <scriptDir>/animation.mp4 next to the script.
// Frame layout matches captureRotateOnly.ts (1920x1080); ffmpeg ingests the
// PNG bytes via stdin to avoid touching disk between encoder and frames.

import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { buildModel, updateModelParams } from '../src/modeling/buildModel.ts';
import { meshFeaturesPerFeature } from '../src/modeling/capture/featureMeshing.ts';
import { serializeForBridge } from '../src/modeling/capture/featureMeshSerialize.ts';

const SCRIPT_PATH = resolve(process.argv[2] ?? 'examples/gallery/gearfinity-planetary-stage.kcad.ts');
const OUT_MP4 = resolve(process.argv[3] ?? resolve(SCRIPT_PATH, '..', basename(SCRIPT_PATH).replace(/\.kcad\.ts$/, '') + '-animation.mp4'));
const W = 1920;
const H = 1080;

const code = readFileSync(SCRIPT_PATH, 'utf8');
const scriptDir = dirname(SCRIPT_PATH);

console.log(`script:    ${SCRIPT_PATH}`);
console.log(`out:       ${OUT_MP4}`);

console.log('Building model...');
let t = performance.now();
const model = await buildModel({ code, fileName: SCRIPT_PATH, scriptDir });
console.log(`  buildModel: ${(performance.now() - t).toFixed(0)} ms  records=${model.records.length}`);

const session = model.session;

// Find the last animationView record (last-wins, mirroring cameraTarget).
const animRecords = model.records.filter((r) => r.kind === 'animationView');
if (animRecords.length === 0) {
  console.error(`No animationView({...}) call found in ${SCRIPT_PATH}.`);
  console.error(`Add e.g. animationView({ param: 'driveAngleDeg', from: 0, to: 360, durationMs: 4000 });`);
  process.exit(1);
}
const spec = animRecords[animRecords.length - 1].metadata;
const fps = spec.fps ?? 30;
const frames = Math.max(2, Math.ceil((spec.durationMs / 1000) * fps));
console.log(`anim:      param=${spec.param}  from=${spec.from}  to=${spec.to}  durationMs=${spec.durationMs}  fps=${fps}  frames=${frames}`);

// Cold mesh — populates the per-session triangle cache.
t = performance.now();
const initial = await meshFeaturesPerFeature(model.records, session.paramTable, session);
console.log(`  cold mesh: ${(performance.now() - t).toFixed(0)} ms  features=${initial.features.length}`);

console.log('Launching Playwright...');
const cdpUrl = process.env.PW_CDP_URL ?? 'http://127.0.0.1:9222';
let browser;
let ctx;
let connectedExisting = false;
try {
  browser = await chromium.connectOverCDP(cdpUrl);
  // Reuse the first existing context (a fresh Playwright-launched chromium
  // would always create a new one; CDP-attached chromes already have one).
  const contexts = browser.contexts();
  ctx = contexts[0] ?? await browser.newContext({ viewport: { width: W, height: H } });
  connectedExisting = true;
  console.log(`  attached to existing Chrome via CDP at ${cdpUrl}`);
} catch (e) {
  console.log(`  CDP attach failed (${e.message}); falling back to fresh chromium.launch`);
  browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  ctx = await browser.newContext({ viewport: { width: W, height: H } });
}

try {
  const page = await ctx.newPage();
  // Resize the viewport so screenshots are 1920×1080 regardless of the
  // attached Chrome window size.
  await page.setViewportSize({ width: W, height: H });
  page.setDefaultTimeout(180000);
  const port = process.env.VITE_PORT ?? '5173';
  await page.goto(`http://127.0.0.1:${port}/demo-player?headless=1&nowatermark=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 30000 });
  await page.evaluate(() => window.__demoPlayer.setVersion('animation'));

  // Initial load — populates the scene with the cold-mesh contents.
  const serialized0 = initial.features.map(serializeForBridge);
  await page.evaluate(
    ({ feats, b }) => window.__demoPlayer.loadFeatureMeshes(feats, b),
    { feats: serialized0, b: initial.bounds },
  );

  // Settle the AnimationEngine to final state (matches captureRotateOnly).
  for (const fm of initial.features) {
    await page.evaluate((e) => window.__demoPlayer.onEvent(e), {
      kind: 'feature.compiled',
      featureId: fm.featureId,
      featureKind: fm.featureKind,
      predecessors: fm.predecessors,
      diagnostics: [],
      health: 'healthy',
      shape: null,
      op: fm.op,
    });
  }
  await page.evaluate(() => window.__demoPlayer.advance(2000));
  await page.evaluate(() => window.__demoPlayer.forceFullOpacity());
  await page.evaluate(() => window.__demoPlayer.showOnlyTailFeatures());
  await page.evaluate(() => window.__demoPlayer.setRenderView('iso'));

  console.log('ffmpeg start...');
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '22',
    OUT_MP4,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  ffmpeg.stderr.on('data', () => {});

  console.log(`Capturing ${frames} frames at ${W}×${H}@${fps}fps...`);
  const t0 = Date.now();
  for (let i = 0; i < frames; i += 1) {
    const u = frames === 1 ? 0 : i / (frames - 1);
    const value = spec.from + (spec.to - spec.from) * u;
    await updateModelParams(model, [{ name: spec.param, value }]);
    const meshing = await meshFeaturesPerFeature(model.records, session.paramTable, session);
    const serialized = meshing.features.map(serializeForBridge);
    await page.evaluate(
      ({ feats, b }) => {
        window.__demoPlayer.loadFeatureMeshes(feats, b);
        window.__demoPlayer.forceFullOpacity();
      },
      { feats: serialized, b: meshing.bounds },
    );
    // Tick the AnimationEngine so Three.js renders the updated scene.
    await page.evaluate(() => window.__demoPlayer.advance(16));
    const buf = await page.screenshot({ type: 'png' });
    await new Promise((res, rej) => ffmpeg.stdin.write(buf, (err) => (err ? rej(err) : res())));
    if ((i + 1) % 15 === 0 || i === frames - 1) {
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  frame ${i + 1}/${frames}  ${spec.param}=${value.toFixed(1)}  (${dt}s elapsed)`);
    }
  }
  ffmpeg.stdin.end();
  await new Promise((res, rej) => ffmpeg.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  console.log(`Wrote ${OUT_MP4}`);
} finally {
  if (connectedExisting) {
    await browser.close().catch(() => undefined); // disconnect, don't kill the attached Chrome
  } else {
    await browser.close().catch(() => undefined);
  }
}
