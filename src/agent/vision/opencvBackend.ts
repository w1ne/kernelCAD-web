// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/opencvBackend.ts
//
// Pure-JS opencv silhouette extractor for the `trace_from_image` tool.
// `@techstark/opencv-js` is ~1.5 MB and slow to initialize (~2 s on first
// call), so it is **lazy-imported** here — the MCP server cold-start path
// must never load opencv. We cache the init promise so subsequent calls in
// the same process pay no extra cost.

import sharp from 'sharp';
import type { Vec2Normalized } from './types';

let cvInitPromise: Promise<typeof import('@techstark/opencv-js')> | null = null;
const DEFAULT_OPENCV_INIT_TIMEOUT_MS = 5000;

type OpenCvModule = typeof import('@techstark/opencv-js');
type OpenCvRuntime = OpenCvModule & {
  ready?: Promise<unknown>;
  Mat?: unknown;
  onRuntimeInitialized?: () => void;
  then?: (onReady: (cv: OpenCvRuntime) => void) => unknown;
};

/**
 * Lazy-load `@techstark/opencv-js` and wait for its asynchronous WASM init.
 * Returns the cached `cv` namespace on subsequent calls.
 */
async function getCv(): Promise<typeof import('@techstark/opencv-js')> {
  if (!cvInitPromise) {
    cvInitPromise = (async () => {
      const mod = await import('@techstark/opencv-js');
      const cv = ((mod as { default?: OpenCvModule }).default ?? mod) as OpenCvRuntime;
      await waitForOpenCvReady(cv, openCvInitTimeoutMs());
      // Emscripten exposes `then` for callback-style readiness. If an async
      // function returns that same thenable object, native Promise resolution
      // keeps assimilating it and never settles.
      delete cv.then;
      return cv as OpenCvModule;
    })();
  }
  return cvInitPromise;
}

async function waitForOpenCvReady(cv: OpenCvRuntime, timeoutMs: number): Promise<void> {
  if (cv.Mat) return;

  if (cv.ready && typeof cv.ready.then === 'function') {
    await withTimeout(
      cv.ready.then(() => undefined),
      timeoutMs,
    );
  } else if (typeof cv.then === 'function') {
    await withTimeout(
      new Promise<void>((resolve) => {
        cv.then?.(() => resolve());
      }),
      timeoutMs,
    );
  } else {
    await waitForRuntimeCallbackOrMat(cv, timeoutMs);
  }

  if (!cv.Mat) {
    throw new Error('opencvBackend: OpenCV initialized without Mat constructor');
  }
}

async function waitForRuntimeCallbackOrMat(cv: OpenCvRuntime, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const previous = cv.onRuntimeInitialized;
    let settled = false;
    const cleanup = () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`opencvBackend: OpenCV initialization timed out after ${timeoutMs}ms`));
    };
    const interval = setInterval(() => {
      if (cv.Mat) finish();
    }, 25);
    const timer = setTimeout(fail, timeoutMs);
    cv.onRuntimeInitialized = () => {
      previous?.();
      finish();
    };
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`opencvBackend: OpenCV initialization timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function openCvInitTimeoutMs(): number {
  const configured = Number(process.env.KERNELCAD_OPENCV_INIT_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_OPENCV_INIT_TIMEOUT_MS;
}

/**
 * Extract a normalized silhouette polyline from `pngBytes`.
 *
 * Pipeline:
 * 1. Decode + grayscale via sharp (no opencv decoder dep).
 * 2. Otsu threshold (inverted — assumes bright background, dark subject).
 *    This matches the common "product photo on white" case the opencv backend
 *    is designed for. The router refuses opencv when the corner-color stddev
 *    suggests the background is non-uniform.
 * 3. `findContours(RETR_EXTERNAL)`, pick largest by `arcLength`.
 * 4. `approxPolyDP` with epsilon ramped up to 6× until the polyline has at
 *    most `maxWaypoints` vertices.
 * 5. Normalize to `[0..1]` with top-left origin.
 *
 * Throws `'opencvBackend: no foreground contour found'` if no contour is
 * detected (e.g. pure-white image, all-black image, or anything Otsu can't
 * split into figure/ground).
 */
export async function extractSilhouettePolyline(
  pngBytes: Buffer,
  maxWaypoints: number,
): Promise<Vec2Normalized[]> {
  if (maxWaypoints < 3) {
    throw new Error(`opencvBackend: maxWaypoints must be >= 3 (got ${maxWaypoints})`);
  }
  const cv = await getCv();

  const { data, info } = await sharp(pngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // matFromImageData needs an ImageData-like { data, width, height }. `ImageData`
  // itself is a DOM type and not present under `tsconfig.cli.json` (no DOM lib),
  // so use a structural type that satisfies opencv's runtime expectations.
  type ImageDataLike = { data: Uint8ClampedArray; width: number; height: number; colorSpace?: string };
  const src = cv.matFromImageData({
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width,
    height,
    colorSpace: 'srgb',
  } as ImageDataLike as unknown as Parameters<typeof cv.matFromImageData>[0]);

  const grey = new cv.Mat();
  cv.cvtColor(src, grey, cv.COLOR_RGBA2GRAY);

  const binary = new cv.Mat();
  // INV: dark subject on bright bg → subject pixels become 255 after threshold.
  cv.threshold(grey, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // Pick largest contour by perimeter.
  let bestIdx = -1;
  let bestLen = -1;
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i);
    const len = cv.arcLength(c, true);
    if (len > bestLen) {
      bestLen = len;
      bestIdx = i;
    }
    c.delete();
  }

  if (bestIdx < 0 || bestLen <= 0) {
    src.delete();
    grey.delete();
    binary.delete();
    contours.delete();
    hierarchy.delete();
    throw new Error('opencvBackend: no foreground contour found');
  }

  const best = contours.get(bestIdx);

  // approxPolyDP — ramp epsilon up to 6× until <= maxWaypoints.
  let approx = new cv.Mat();
  let epsilonRatio = 0.01; // 1% of perimeter to start.
  for (let attempt = 0; attempt < 7; attempt++) {
    if (attempt > 0) {
      approx.delete();
      approx = new cv.Mat();
    }
    cv.approxPolyDP(best, approx, epsilonRatio * bestLen, true);
    if (approx.rows <= maxWaypoints) break;
    epsilonRatio *= Math.sqrt(2);
  }

  // Extract (x, y) pairs and normalize.
  const polyline: Vec2Normalized[] = [];
  for (let i = 0; i < approx.rows; i++) {
    // approxPolyDP returns a CV_32SC2 Mat (int32 x, int32 y per row).
    const x = approx.data32S[i * 2];
    const y = approx.data32S[i * 2 + 1];
    polyline.push([x / width, y / height]);
  }

  best.delete();
  approx.delete();
  src.delete();
  grey.delete();
  binary.delete();
  contours.delete();
  hierarchy.delete();

  return polyline;
}

/**
 * Test-only export — resets the cached opencv init promise. Lets tests verify
 * the lazy-import contract by inspecting `cvInitPromise` after a deliberate
 * reset. Not part of the public surface.
 *
 * @internal
 */
export function _resetCvInitForTests(): void {
  cvInitPromise = null;
}
