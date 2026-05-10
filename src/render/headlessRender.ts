// src/render/headlessRender.ts
//
// Headless multi-view PNG renderer. Powers `kernelcad render`. Reuses the
// browser-based demo-player path (puppeteer + Three.js + WebGL) but skips
// captureDemo's build/rotate animation: just load → snap to view → screenshot.
//
// Cold start dominates wall-clock time (puppeteer launch + vite bundle +
// kernel WASM init); the screenshot itself is sub-second per view.

import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import { loadScriptFeatures } from '../script-runtime/scriptLoader';
import { meshFeaturesPerFeature } from '../capture/featureMeshing';
import { serializeForBridge } from '../capture/featureMeshSerialize';
import type { RenderView } from './views';

export type { RenderView };

// `page.evaluate(...)` callbacks execute inside the browser, where `window`
// is the page's global. The CLI tsconfig (lib: ES2022 only, no DOM) doesn't
// know that, so declare a narrow shim here. The full demo-player API lives
// in src/components/demoPlayer/DemoPlayerPage.tsx (`DemoPlayerWindow`),
// which the CLI build deliberately excludes.
declare const window: {
  __demoPlayer?: {
    loadFeatureMeshes: (perFeature: unknown, bounds: unknown) => unknown;
    forceFullOpacity: () => void;
    setRenderView: (view: RenderView) => void;
  };
};

export const ALL_VIEWS: readonly RenderView[] = ['front', 'right', 'top', 'iso'];

export interface HeadlessRenderOpts {
  scriptPath: string;
  viewportWidth: number;
  viewportHeight: number;
  /** Subset of views to capture; defaults to all four. */
  views?: readonly RenderView[];
  /** URL of a running studio dev server; defaults to localhost:5173. */
  baseUrl?: string;
}

export interface HeadlessRenderResult {
  pngsByView: Partial<Record<RenderView, Buffer>>;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export async function headlessRender(opts: HeadlessRenderOpts): Promise<HeadlessRenderResult> {
  const baseUrl = opts.baseUrl ?? 'http://localhost:5173';
  const views = opts.views ?? ALL_VIEWS;

  // 1. Mesh on Node side — same path captureDemo uses.
  const loaded = await loadScriptFeatures(opts.scriptPath);
  const meshing = await meshFeaturesPerFeature(
    loaded.features.map((f) => f.record),
    loaded.paramTable,
    loaded.session,
  );
  if (meshing.failedFeatureIds.length > 0) {
    throw new Error(
      `headlessRender: ${meshing.failedFeatureIds.length} feature(s) failed to compile: ${meshing.failedFeatureIds.join(', ')}`,
    );
  }
  const serialized = meshing.features.map(serializeForBridge);

  // 2. Launch headless chromium.
  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
    const context = await browser.newContext({
      viewport: { width: opts.viewportWidth, height: opts.viewportHeight },
    });
    page = await context.newPage();
    await page.goto(`${baseUrl}/demo-player`);
    await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 15000 });

    // 3. Load meshes + skip the fade-in animation.
    await page.evaluate(
      ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
      { feats: serialized, b: meshing.bounds },
    );
    await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());

    // 4. Per-view: snap camera, screenshot, collect.
    const pngsByView: Partial<Record<RenderView, Buffer>> = {};
    for (const view of views) {
      await page.evaluate((v) => window.__demoPlayer!.setRenderView(v), view);
      const buf = await page.screenshot({ type: 'png' });
      pngsByView[view] = buf;
    }

    return { pngsByView, bounds: meshing.bounds };
  } finally {
    // captureDemo has a known timeout-on-close issue; mirror its tolerance.
    if (browser) {
      await Promise.race([
        browser.close(),
        new Promise<void>((r) => setTimeout(r, 3000).unref()),
      ]).catch(() => undefined);
    }
  }
}

/** Compose four view PNGs into a single 2×2 grid PNG.
 *
 *  Layout:
 *    +---------+---------+
 *    |  front  |  right  |
 *    +---------+---------+
 *    |   top   |   iso   |
 *    +---------+---------+
 *
 *  All input tiles must share the same dimensions (`tileWidth × tileHeight`).
 *  Output is `2 * tileWidth × 2 * tileHeight`.
 */
export async function composite2x2(
  pngsByView: Partial<Record<RenderView, Buffer>>,
  tileWidth: number,
  tileHeight: number,
): Promise<Buffer> {
  const required: RenderView[] = ['front', 'right', 'top', 'iso'];
  for (const v of required) {
    if (!pngsByView[v]) throw new Error(`composite2x2: missing view '${v}'`);
  }
  const W = tileWidth * 2;
  const H = tileHeight * 2;
  return sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: pngsByView.front!, top: 0, left: 0 },
      { input: pngsByView.right!, top: 0, left: tileWidth },
      { input: pngsByView.top!, top: tileHeight, left: 0 },
      { input: pngsByView.iso!, top: tileHeight, left: tileWidth },
    ])
    .png()
    .toBuffer();
}
