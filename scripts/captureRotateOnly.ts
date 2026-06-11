// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/captureRotateOnly.ts
//
// Minimal rotate-only capture for the pocket-watch demo.mp4. Bypasses the
// full captureDemo build animation (which captures ~900 frames sequentially —
// too slow under SwiftShader when one part uses transmission). Instead this
// fast-forwards the AnimationEngine to a settled state, then captures only
// the rotate phase (120 frames at 1280×720, ≤ 5 min wall-clock).
//
// Use only for re-capturing demos when the build animation is unchanged and
// the user-visible delta is the final static look (e.g. material/proportion
// fixes). For new demos, use captureDemo.ts which writes whats-new.md + the
// full provenance pipeline.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { loadScriptFeatures } from './lib/scriptLoader';
import { meshFeaturesPerFeature } from '../src/modeling/capture/featureMeshing';
import { serializeForBridge } from '../src/modeling/capture/featureMeshSerialize';

const SCRIPT_PATH = resolve('examples/portfolio/pocket-watch/build.kcad.ts');
const OUT_MP4 = resolve('docs/demos/v0.7/pocket-watch/demo.mp4');
const HERO_PNG = resolve('docs/demos/v0.7/pocket-watch/hero-frame.png');
// Match the demo-player's headless ViewerPane size (VIEWER_W + TERMINAL_W,
// VIEWER_H = 1280 + 640 = 1920 × 1080). Setting the Playwright viewport to
// the canvas size prevents the screenshot from capturing only the top-left
// portion of the rendered canvas (which would crop the model off-center and
// jam tall scenes against one edge — see the pocket-watch framing issue).
const W = 1920;
const H = 1080;
const FPS = 30;
const ROTATE_MS = 4000;
const TOTAL_FRAMES = Math.floor((ROTATE_MS / 1000) * FPS);

interface DemoWindow {
  loadFeatureMeshes: (perFeature: unknown, bounds: unknown) => unknown;
  forceFullOpacity: () => void;
  showOnlyTailFeatures: () => void;
  setVersion: (v: string) => void;
  setRotatePhase: (d: number) => void;
  advance: (ms: number) => void;
  onEvent: (e: unknown) => void;
  setRenderView: (v: string) => void;
}
declare const window: { __demoPlayer?: DemoWindow };

async function main(): Promise<void> {
  console.log(`Loading features from ${SCRIPT_PATH}...`);
  const loaded = await loadScriptFeatures(SCRIPT_PATH);
  const meshing = await meshFeaturesPerFeature(
    loaded.features.map((f) => f.record),
    loaded.paramTable,
    loaded.session,
  );
  if (meshing.failedFeatureIds.length > 0) {
    throw new Error(`feature failures: ${meshing.failedFeatureIds.join(',')}`);
  }
  const serialized = meshing.features.map(serializeForBridge);
  console.log(`Meshed ${serialized.length} features.`);

  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(180000);
    const port = process.env.VITE_PORT ?? '5173';
    await page.goto(`http://127.0.0.1:${port}/demo-player?headless=1`);
    await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 30000 });
    await page.evaluate(() => window.__demoPlayer!.setVersion('v0.7'));

    await page.evaluate(({ feats, b }: { feats: unknown; b: unknown }) => window.__demoPlayer!.loadFeatureMeshes(feats, b), { feats: serialized, b: meshing.bounds });

    // Fast-forward: emit all feature.compiled events so the AnimationEngine
    // settles every part to opacity 1 / final color in one shot. Without this,
    // groups stay at opacity 0 (the initial buildMeshFromFace state) and the
    // rotate would render a black screen.
    for (const fm of meshing.features) {
      await page.evaluate((e: unknown) => window.__demoPlayer!.onEvent(e), {
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
    // One large advance to settle all in-flight tweens (max anim duration is 600ms).
    await page.evaluate(() => window.__demoPlayer!.advance(2000));
    await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());
    await page.evaluate(() => window.__demoPlayer!.showOnlyTailFeatures());

    // Hero frame at iso view (same convention as captureDemo).
    console.log('Capturing hero frame at iso pose...');
    await page.evaluate(() => window.__demoPlayer!.setRenderView('iso'));
    await page.screenshot({ path: HERO_PNG, type: 'png' });
    console.log(`Wrote ${HERO_PNG}`);

    // Now the rotate-frame loop.
    await page.evaluate((d: number) => window.__demoPlayer!.setRotatePhase(d), ROTATE_MS);

    const ffmpeg = spawn('ffmpeg', [
      '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '24',
      OUT_MP4,
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    ffmpeg.stderr.on('data', () => {});

    const frameMs = 1000 / FPS;
    console.log(`Capturing ${TOTAL_FRAMES} rotate frames at ${W}×${H}@${FPS}fps...`);
    const t0 = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      await page.evaluate((dt: number) => window.__demoPlayer!.advance(dt), frameMs);
      const buf = await page.screenshot({ type: 'png' });
      await new Promise<void>((res, rej) => ffmpeg.stdin.write(buf, (err) => err ? rej(err) : res()));
      if ((i + 1) % 30 === 0) {
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  frame ${i + 1}/${TOTAL_FRAMES}  (${dt}s elapsed)`);
      }
    }
    ffmpeg.stdin.end();
    await new Promise<void>((res, rej) => ffmpeg.on('close', (c) => c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`))));
    console.log(`Wrote ${OUT_MP4}`);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
