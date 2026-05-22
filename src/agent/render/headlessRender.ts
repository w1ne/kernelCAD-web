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
import { loadScriptFeatures } from '../../modeling/runtime/scriptLoader';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { serializeForBridge } from '../../modeling/capture/featureMeshSerialize';
import type { RenderView } from '../../shared/render/views';

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
    showOnlyTailFeatures: () => void;
    applyObjectVisibilityFilter: (filter: HeadlessObjectFilter) => HeadlessObjectVisibility;
    captureMaskPng: () => HeadlessMaskCapture;
    captureInspectionChannels: (input: {
      channels: readonly HeadlessAuxInspectionChannel[];
      width: number;
      height: number;
    }) => HeadlessInspectionCapture;
    setRenderView: (view: RenderView) => void;
    setRenderPose: (azDeg: number, elDeg: number) => void;
    setReferenceImagesVisible: (visible: boolean) => void;
    setRenderEnvironment: (spec: unknown) => Promise<void>;
  };
};

export const ALL_VIEWS: readonly RenderView[] = ['front', 'right', 'top', 'iso'];

export interface HeadlessObjectFilter {
  mode: 'focus' | 'hide';
  patterns: string[];
}

export interface HeadlessRenderObject {
  featureId: string;
  names: string[];
}

export interface HeadlessObjectVisibility {
  filter: HeadlessObjectFilter;
  visible: HeadlessRenderObject[];
  hidden: HeadlessRenderObject[];
}

export interface HeadlessMaskObject extends HeadlessRenderObject {
  color: string;
  rgb: [number, number, number];
  visibleIndex: number;
}

export interface HeadlessMaskCapture {
  pngDataUrl: string;
  objects: HeadlessMaskObject[];
}

export type HeadlessAuxInspectionChannel = 'depth' | 'normals';
export type HeadlessInspectionChannel = 'rgb' | 'mask' | HeadlessAuxInspectionChannel;

export interface HeadlessDepthChannelMetadata {
  encoding: 'linear-camera-depth-rgba8';
  units: 'mm';
  near: number;
  far: number;
  background: 'rgba(0,0,0,0)';
  meaning: string;
}

export interface HeadlessNormalsChannelMetadata {
  encoding: 'view-space-normal-rgb8';
  mapping: string;
  background: 'rgba(0,0,0,0)';
  meaning: string;
}

export interface HeadlessInspectionCapture {
  channels: Partial<Record<HeadlessAuxInspectionChannel, { pngDataUrl: string }>>;
  metadata: {
    depth?: HeadlessDepthChannelMetadata;
    normals?: HeadlessNormalsChannelMetadata;
  };
}

export interface HeadlessRenderOpts {
  scriptPath: string;
  viewportWidth: number;
  viewportHeight: number;
  /** Subset of views to capture; defaults to all four. */
  views?: readonly RenderView[];
  /** Additional arbitrary-pose captures keyed by `"<az>,<el>"`. */
  poses?: readonly string[];
  /** URL of a running studio dev server; defaults to localhost:5173. */
  baseUrl?: string;
  /** When true, hides the `__referenceImages` overlay group before taking
   *  screenshots. Useful for clean engineering-view captures without overlays. */
  hideReferenceImages?: boolean;
  /** Override the script's setRenderEnvironment (or apply one when the
   *  script set none). 'none' suppresses any env (CI black-frame fallback).
   *  Preset keys map to bundled HDRIs; any other string is treated as a URL
   *  (relative paths are resolved against the dev server's `/hdri/` directory). */
  environment?: 'studio' | 'softbox' | 'neutral' | 'outdoor' | 'warehouse' | 'none' | string;
  /** Suppress the kernelCAD version watermark in the bottom-right of the
   *  captured frame. Used for clean hero artifacts intended for public posts;
   *  default false retains the watermark for traceability. */
  noWatermark?: boolean;
  /** Optional named object filter for RGB render and inspection captures. */
  objectFilter?: HeadlessObjectFilter;
  /** Inspection channels requested by the bundle writer. Defaults to RGB only. */
  inspectionChannels?: readonly HeadlessInspectionChannel[];
}

export interface HeadlessRenderResult {
  pngsByView: Partial<Record<RenderView, Buffer>>;
  /** Captured pose screenshots keyed by `"<az>,<el>"`. */
  pngsByPose: Record<string, Buffer>;
  maskPngsByView?: Partial<Record<RenderView, Buffer>>;
  maskObjects?: HeadlessMaskObject[];
  inspectionPngsByChannel?: Partial<Record<HeadlessAuxInspectionChannel, Partial<Record<RenderView, Buffer>>>>;
  inspectionChannelMetadata?: HeadlessInspectionCapture['metadata'];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  objectVisibility?: HeadlessObjectVisibility;
}

const HEADLESS_VIEWPORT = { width: 1920, height: 1080 } as const;
const SCENE_BACKGROUND = { r: 144, g: 144, b: 144, alpha: 1 } as const;

export async function headlessRender(opts: HeadlessRenderOpts): Promise<HeadlessRenderResult> {
  const baseUrl = opts.baseUrl ?? 'http://localhost:5173';
  const views = opts.views ?? ALL_VIEWS;
  const inspectionChannels = opts.inspectionChannels ?? ['rgb'];
  const captureRgb = inspectionChannels.includes('rgb');
  const captureMask = inspectionChannels.includes('mask');
  const auxInspectionChannels = inspectionChannels.filter(
    (channel): channel is HeadlessAuxInspectionChannel => channel === 'depth' || channel === 'normals',
  );

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
      // DemoPlayer's headless ViewerPane is currently fixed at 1920×1080.
      // Capturing a smaller viewport clips the top-left of that canvas and
      // produces false visual-review evidence. Capture the full pane, then
      // resize/pad to the requested tile dimensions below.
      viewport: HEADLESS_VIEWPORT,
    });
    page = await context.newPage();
    // ?headless=1 suppresses TanStackRouterDevtools (and any future dev-mode
    // chrome) in src/studio/routes/__root.tsx so the captured PNG contains
    // only scene pixels. See issue #173.
    // Build query string: headless=1 always, nowatermark=1 when requested.
    const queryParts = ['headless=1'];
    if (opts.noWatermark) queryParts.push('nowatermark=1');
    await page.goto(`${baseUrl}/demo-player?${queryParts.join('&')}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForFunction(() => window.__demoPlayer !== undefined, { timeout: 15000 });

    // 3. Load meshes + skip the fade-in animation.
    await page.evaluate(
      ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
      { feats: serialized, b: meshing.bounds },
    );
    await page.evaluate(() => window.__demoPlayer!.forceFullOpacity());
    // Hide intermediate construction-debris feature groups so engineering
    // captures show only the final shape — not stacked cutter boxes, sketch
    // profiles, or pre-fillet bodies. This is the headless-render analog of
    // running the AnimationEngine's build transitions to completion.
    await page.evaluate(() => window.__demoPlayer!.showOnlyTailFeatures());

    const objectVisibility = opts.objectFilter
      ? await page.evaluate((filter) => window.__demoPlayer!.applyObjectVisibilityFilter(filter), opts.objectFilter)
      : undefined;

    // 3b. Optionally hide reference-image overlays for clean engineering views.
    if (opts.hideReferenceImages) {
      await page.evaluate(() => window.__demoPlayer?.setReferenceImagesVisible(false));
    }

    // 3c. CLI --environment override: takes precedence over the script's
    // setRenderEnvironment() call. 'none' explicitly clears any env.
    if (opts.environment !== undefined) {
      const envArg = opts.environment;
      const PRESETS = new Set(['studio', 'softbox', 'neutral', 'outdoor', 'warehouse']);
      const spec: unknown = envArg === 'none'
        ? null
        : PRESETS.has(envArg)
          ? { preset: envArg }
          : { url: envArg };
      await page.evaluate((s) => window.__demoPlayer!.setRenderEnvironment(s), spec);
    }

    // Belt-and-suspenders: nuke ANY dev chrome AFTER mesh load and BEFORE the
    // first screenshot. The headless URL param + __root.tsx suppression doesn't
    // always catch the TanStack Router devtools badge — it can get re-injected
    // by React StrictMode double-render at mount. We run this once, post-load:
    // by then any mount-time re-injection has settled, and there is no HMR in
    // headless production (no file watcher). If a late re-injection ever bites
    // again, wire this through a MutationObserver — don't re-add the per-frame
    // scan.
    await page.evaluate(`
      (() => {
        const sels = [
          '[data-testid="tsr-devtools"]',
          '.TanStackRouterDevtools',
          '[data-tanstack-router-devtools]',
          'vite-error-overlay',
        ];
        for (const sel of sels) document.querySelectorAll(sel).forEach((n) => n.remove());
        // Heuristic: any fixed-position element with "TanStack" in text content.
        document.querySelectorAll('*').forEach((el) => {
          const cs = (el instanceof Element) ? getComputedStyle(el) : null;
          if (cs && cs.position === 'fixed' && /TanStack/i.test(el.textContent || '') && el.children.length < 8) {
            el.remove();
          }
        });
      })()
    `);

    // 4. Per-view: snap camera, screenshot, collect.
    const pngsByView: Partial<Record<RenderView, Buffer>> = {};
    const maskPngsByView: Partial<Record<RenderView, Buffer>> = {};
    const inspectionPngsByChannel: Partial<Record<HeadlessAuxInspectionChannel, Partial<Record<RenderView, Buffer>>>> = {};
    const inspectionChannelMetadata: HeadlessInspectionCapture['metadata'] = {};
    let maskObjects: HeadlessMaskObject[] | undefined;
    for (const view of views) {
      await page.evaluate((v) => window.__demoPlayer!.setRenderView(v), view);
      if (captureRgb) {
        const buf = await normalizeTile(await page.screenshot({ type: 'png' }), opts);
        pngsByView[view] = buf;
      }
      if (captureMask) {
        const mask = await page.evaluate(() => window.__demoPlayer!.captureMaskPng());
        const maskBuffer = Buffer.from(mask.pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        maskPngsByView[view] = await normalizeInspectionTile(maskBuffer, opts, 'mask');
        if (maskObjects === undefined) maskObjects = mask.objects;
      }
      if (auxInspectionChannels.length > 0) {
        const capture = await page.evaluate(
          ({ channels, width, height }) => window.__demoPlayer!.captureInspectionChannels({ channels, width, height }),
          {
            channels: auxInspectionChannels,
            width: HEADLESS_VIEWPORT.width,
            height: HEADLESS_VIEWPORT.height,
          },
        );
        if (capture.metadata.depth !== undefined) inspectionChannelMetadata.depth = capture.metadata.depth;
        if (capture.metadata.normals !== undefined) inspectionChannelMetadata.normals = capture.metadata.normals;
        for (const channel of auxInspectionChannels) {
          const channelCapture = capture.channels[channel];
          if (!channelCapture) continue;
          const rawBuffer = Buffer.from(channelCapture.pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
          inspectionPngsByChannel[channel] ??= {};
          inspectionPngsByChannel[channel]![view] = await normalizeInspectionTile(rawBuffer, opts, channel);
        }
      }
    }

    // 5. Per-pose: parse "<az>,<el>", set camera, screenshot, collect.
    const pngsByPose: Record<string, Buffer> = {};
    if (opts.poses) {
      for (const poseKey of opts.poses) {
        const [azStr, elStr] = poseKey.split(',').map((s) => s.trim());
        const az = Number(azStr);
        const el = Number(elStr);
        if (!Number.isFinite(az) || !Number.isFinite(el)) {
          throw new Error(`headlessRender: invalid --pose value '${poseKey}' (expected '<az>,<el>')`);
        }
        await page.evaluate(
          ({ a, e }) => window.__demoPlayer!.setRenderPose(a, e),
          { a: az, e: el },
        );
        const buf = await normalizeTile(await page.screenshot({ type: 'png' }), opts);
        pngsByPose[poseKey] = buf;
      }
    }

    return {
      pngsByView,
      pngsByPose,
      ...(captureMask ? { maskPngsByView, maskObjects: maskObjects ?? [] } : {}),
      ...(auxInspectionChannels.length > 0
        ? { inspectionPngsByChannel, inspectionChannelMetadata }
        : {}),
      bounds: meshing.bounds,
      ...(objectVisibility !== undefined ? { objectVisibility } : {}),
    };
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

async function normalizeTile(buf: Buffer, opts: HeadlessRenderOpts): Promise<Buffer> {
  if (opts.viewportWidth === HEADLESS_VIEWPORT.width && opts.viewportHeight === HEADLESS_VIEWPORT.height) {
    return buf;
  }
  return sharp(buf)
    .resize(opts.viewportWidth, opts.viewportHeight, {
      fit: 'contain',
      background: SCENE_BACKGROUND,
    })
    .png()
    .toBuffer();
}

async function normalizeInspectionTile(
  buf: Buffer,
  opts: Pick<HeadlessRenderOpts, 'viewportWidth' | 'viewportHeight'>,
  channel: 'mask' | HeadlessAuxInspectionChannel,
): Promise<Buffer> {
  if (opts.viewportWidth === HEADLESS_VIEWPORT.width && opts.viewportHeight === HEADLESS_VIEWPORT.height) {
    return buf;
  }
  const background = channel === 'mask'
    ? { r: 0, g: 0, b: 0, alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp(buf)
    .resize(opts.viewportWidth, opts.viewportHeight, {
      fit: 'contain',
      kernel: 'nearest',
      background,
    })
    .png()
    .toBuffer();
}

export async function normalizeInspectionTileForTest(
  buf: Buffer,
  opts: Pick<HeadlessRenderOpts, 'viewportWidth' | 'viewportHeight'> & { channel: 'mask' | HeadlessAuxInspectionChannel },
): Promise<Buffer> {
  return normalizeInspectionTile(buf, opts, opts.channel);
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
