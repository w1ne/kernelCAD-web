// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/render/headlessRender.ts
//
// Headless multi-view PNG renderer. Powers `kernelcad render`. Reuses the
// browser-based demo-player path (puppeteer + Three.js + WebGL) but skips
// captureDemo's build/rotate animation: just load → snap to view → screenshot.
//
// Cold start dominates wall-clock time (puppeteer launch + vite bundle +
// kernel WASM init); the screenshot itself is sub-second per view.

import type { Browser, Page } from 'playwright';
import sharp from 'sharp';
import { loadScriptFeatures } from '../../modeling/runtime/scriptLoader';
import { meshFeaturesPerFeature } from '../../modeling/capture/featureMeshing';
import { serializeForBridge, type FeatureMeshSerialized } from '../../modeling/capture/featureMeshSerialize';
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
    setRenderView: (view: RenderView, outputAspect?: number) => void;
    setRenderPose: (azDeg: number, elDeg: number, outputAspect?: number) => void;
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
  /** URL of a running studio dev server; defaults to DEFAULT_RENDER_BASE_URL. */
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
  /** Clip the model with a single axis-aligned section plane so captures show
   *  interior structure. Forwarded to the demo-player as
   *  `?section=<axis>:<pos>` (+ `?sectionflip=1`); the page applies it via
   *  global renderer clipping. Unflipped keeps the negative-axis side.
   *  `positionRaw` is the validated `--section` digits forwarded verbatim —
   *  stringifying `position` would emit exponent notation for |pos| ≥ 1e21
   *  or < 1e-6, which the page-side `?section=` regex silently rejects. */
  section?: { axis: 'x' | 'y' | 'z'; position: number; positionRaw: string; flip: boolean };
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

/** The demo-player's headless ViewerPane is fixed at this size; capturing
 *  any other viewport clips the canvas. Static renders capture at this size
 *  then crop/resize; animation capture emits frames at exactly this size. */
export const HEADLESS_VIEWPORT = { width: 1920, height: 1080 } as const;

/** Single source of truth for the studio dev-server URL. The CLI render
 *  commands use this as the `--base-url` option default; no other port
 *  literal may exist in the render pipeline (guarded by
 *  tests/unit/cli/renderBaseUrlDefault.test.ts). */
export const DEFAULT_RENDER_BASE_URL = 'http://localhost:5173';

export interface DemoPlayerPageOpts {
  /** Studio dev-server URL (`DEFAULT_RENDER_BASE_URL` for the CLI default). */
  baseUrl: string;
  /** Browser-context viewport AND page viewport (pinned via
   *  `setViewportSize` so screenshots keep this size even when attached to
   *  an existing Chrome window of a different size). */
  viewport: { width: number; height: number };
  /** Extra `key=value` demo-player query parts appended after the always-on
   *  `headless=1` (e.g. `nowatermark=1`, `section=z:10`). */
  extraQueryParts?: readonly string[];
  /** When set, try attaching to an existing Chrome over CDP first, falling
   *  back to a fresh `chromium.launch` when the attach fails (the animation
   *  capture path). When unset, always launch a fresh headless chromium. */
  cdpUrl?: string;
  gotoTimeoutMs?: number;
  /** Timeout for the `window.__demoPlayer` readiness wait. */
  readyTimeoutMs?: number;
  /** Playwright default operation timeout applied to the page. */
  pageDefaultTimeoutMs?: number;
}

export interface DemoPlayerPageHandle {
  page: Page;
  /** True when attached to an existing Chrome over CDP. `close()` then
   *  closes the capture tab and disconnects — it does not kill the user's
   *  browser. */
  attachedOverCdp: boolean;
  /** Close (or disconnect from) the browser. Tolerant of the known
   *  timeout-on-close issue (mirrors captureDemo): races a 3 s timer. */
  close: () => Promise<void>;
}

/**
 * Replace Playwright's verbose missing-browser banner with the exact
 * one-command recovery path KernelCAD users need. Keep every unrelated launch
 * failure unchanged so permission, sandbox, and CDP errors remain diagnosable.
 */
export function formatPlaywrightLaunchError<T>(error: T): T | Error {
  if (!(error instanceof Error)) return error;
  const missingExecutable =
    error.message.includes("Executable doesn't exist at") &&
    error.message.includes('playwright install');
  if (!missingExecutable) return error;
  return new Error(
    'KernelCAD rendering requires Playwright Chromium. Install it with: npx playwright install chromium',
    { cause: error },
  );
}

/**
 * Shared demo-player browser bootstrap: lazy playwright import, optional
 * CDP attach with launch fallback, context + page, `/demo-player?headless=1`
 * navigation, and the `window.__demoPlayer` readiness wait. Used by both the
 * static `headlessRender` path and the animation capture engine
 * (`captureAnimation.ts`) — do not fork another browser bootstrap.
 */
export async function openDemoPlayerPage(opts: DemoPlayerPageOpts): Promise<DemoPlayerPageHandle> {
  // Lazy-import playwright so the CLI's evaluate/export/mcp/skill paths
  // don't fail at module load when playwright isn't installed (it's an
  // optional dependency).
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error(
      "kernelcad render and animation capture require 'playwright'. Install with: npm install playwright && npx playwright install chromium",
    );
  }
  let browser: Browser | undefined;
  let attachedOverCdp = false;
  let page: Page | undefined;
  const closeHandle = async (): Promise<void> => {
    // CDP-attached: the page lives in the user's running Chrome and
    // disconnecting would leave it open — close it first so every capture
    // doesn't leak a 1920×1080 tab. Fresh-launch path skips this:
    // browser.close() tears the whole headless process down.
    if (attachedOverCdp && page) {
      await page.close().catch(() => undefined);
    }
    if (!browser) return;
    await Promise.race([
      browser.close(),
      new Promise<void>((r) => setTimeout(r, 3000).unref()),
    ]).catch(() => undefined);
  };
  try {
    let context;
    if (opts.cdpUrl !== undefined) {
      try {
        browser = await chromium.connectOverCDP(opts.cdpUrl);
        // Reuse the first existing context (a fresh Playwright-launched
        // chromium would always create a new one; CDP-attached chromes
        // already have one).
        const contexts = browser.contexts();
        context = contexts[0] ?? (await browser.newContext({ viewport: opts.viewport }));
        attachedOverCdp = true;
      } catch {
        browser = undefined;
      }
    }
    if (!browser) {
      try {
        browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
      } catch (e) {
        throw formatPlaywrightLaunchError(e);
      }
      context = await browser.newContext({ viewport: opts.viewport });
    }
    page = await context!.newPage();
    // Pin the screenshot size regardless of the attached Chrome window size.
    await page.setViewportSize(opts.viewport);
    if (opts.pageDefaultTimeoutMs !== undefined) page.setDefaultTimeout(opts.pageDefaultTimeoutMs);
    // ?headless=1 suppresses TanStackRouterDevtools (and any future dev-mode
    // chrome) in src/studio/routes/__root.tsx so captured pixels contain
    // only the scene. See issue #173.
    const queryParts = ['headless=1', ...(opts.extraQueryParts ?? [])];
    await page.goto(`${opts.baseUrl}/demo-player?${queryParts.join('&')}`, {
      waitUntil: 'domcontentloaded',
      timeout: opts.gotoTimeoutMs ?? 30_000,
    });
    await page.waitForFunction(() => window.__demoPlayer !== undefined, {
      timeout: opts.readyTimeoutMs ?? 15_000,
    });
    return { page, attachedOverCdp, close: closeHandle };
  } catch (e) {
    await closeHandle();
    throw e;
  }
}

/** Push serialized FeatureMeshes into the demo-player scene. Shared by the
 *  static render path and the animation capture engine so there is exactly
 *  one `loadFeatureMeshes` bridge call in the codebase. */
export async function loadFeatureMeshesIntoPage(
  page: Page,
  serialized: readonly FeatureMeshSerialized[],
  bounds: unknown,
): Promise<void> {
  await page.evaluate(
    ({ feats, b }) => window.__demoPlayer!.loadFeatureMeshes(feats, b),
    { feats: serialized, b: bounds },
  );
}

export async function headlessRender(opts: HeadlessRenderOpts): Promise<HeadlessRenderResult> {
  const baseUrl = opts.baseUrl ?? DEFAULT_RENDER_BASE_URL;
  const views = opts.views ?? ALL_VIEWS;
  const inspectionChannels = opts.inspectionChannels ?? ['rgb'];
  const captureRgb = inspectionChannels.includes('rgb');
  const captureMask = inspectionChannels.includes('mask');
  const auxInspectionChannels = inspectionChannels.filter(
    (channel): channel is HeadlessAuxInspectionChannel => channel === 'depth' || channel === 'normals',
  );

  // 1. Mesh on Node side — same path captureDemo uses. The CaptureSession's
  // `assemblies` map (live `Assembly` handles by name) is consumed inside
  // `meshFeaturesPerFeature` to synthesise tendon FeatureMeshes for each
  // declared `arm.tendon(...)` record (P7) — so the closed-loop balance
  // springs render as visible cylinders in the headless CLI inspect path
  // and in any Studio recompute that runs through the same meshing helper.
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

  // 2. Launch headless chromium via the shared demo-player bootstrap.
  //    Build query string: headless=1 always (added by the helper),
  //    nowatermark=1 when requested.
  let pageHandle: DemoPlayerPageHandle | undefined;
  try {
    const extraQueryParts: string[] = [];
    if (opts.noWatermark) extraQueryParts.push('nowatermark=1');
    if (opts.section) {
      extraQueryParts.push(`section=${opts.section.axis}:${opts.section.positionRaw}`);
      if (opts.section.flip) extraQueryParts.push('sectionflip=1');
    }
    pageHandle = await openDemoPlayerPage({
      baseUrl,
      // DemoPlayer's headless ViewerPane is currently fixed at 1920×1080.
      // Capturing a smaller viewport clips the top-left of that canvas and
      // produces false visual-review evidence. Capture the full pane, then
      // resize/pad to the requested tile dimensions below.
      viewport: HEADLESS_VIEWPORT,
      extraQueryParts,
    });
    const page = pageHandle.page;

    // 3. Load meshes + skip the fade-in animation.
    await loadFeatureMeshesIntoPage(page, serialized, meshing.bounds);
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
    const outputAspect = opts.viewportWidth / opts.viewportHeight;
    for (const view of views) {
      await page.evaluate(
        ({ v, a }) => window.__demoPlayer!.setRenderView(v, a),
        { v: view, a: outputAspect },
      );
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
          ({ a, e, asp }) => window.__demoPlayer!.setRenderPose(a, e, asp),
          { a: az, e: el, asp: outputAspect },
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
    // captureDemo has a known timeout-on-close issue; the handle's close()
    // mirrors its tolerance (3 s race).
    if (pageHandle) await pageHandle.close();
  }
}

/** Center-crop `buf` to the output aspect, then resize to the requested
 *  tile dimensions. The camera fit (`setRenderView` / `setRenderPose` with
 *  `outputAspect`) guarantees the model sits inside that centered region,
 *  so no geometry is lost and no letterbox bars are introduced. */
async function cropToAspect(
  buf: Buffer,
  outW: number,
  outH: number,
  resizeOpts: { kernel?: keyof sharp.KernelEnum },
): Promise<Buffer> {
  const img = sharp(buf);
  const meta = await img.metadata();
  const srcW = meta.width ?? HEADLESS_VIEWPORT.width;
  const srcH = meta.height ?? HEADLESS_VIEWPORT.height;
  if (srcW === outW && srcH === outH) return buf;
  const outAspect = outW / outH;
  const cropW = Math.min(srcW, Math.round(srcH * outAspect));
  const cropH = Math.min(srcH, Math.round(srcW / outAspect));
  return img
    .extract({
      left: Math.floor((srcW - cropW) / 2),
      top: Math.floor((srcH - cropH) / 2),
      width: cropW,
      height: cropH,
    })
    .resize(outW, outH, resizeOpts)
    .png()
    .toBuffer();
}

async function normalizeTile(buf: Buffer, opts: HeadlessRenderOpts): Promise<Buffer> {
  return cropToAspect(buf, opts.viewportWidth, opts.viewportHeight, {});
}

async function normalizeInspectionTile(
  buf: Buffer,
  opts: Pick<HeadlessRenderOpts, 'viewportWidth' | 'viewportHeight'>,
  channel: 'mask' | HeadlessAuxInspectionChannel,
): Promise<Buffer> {
  void channel; // mask/depth/normals all use nearest to preserve id/sentinel pixels
  return cropToAspect(buf, opts.viewportWidth, opts.viewportHeight, { kernel: 'nearest' });
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
