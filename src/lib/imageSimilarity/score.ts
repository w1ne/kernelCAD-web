// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/lib/imageSimilarity/score.ts
//
// Image-similarity scorer for "render-vs-reference" verification in the
// from-reference agent loop. See kernelCAD-private/docs/specs/2026-05-15-
// image-similarity-actor-critic-harness-design.md.
//
// Pure-JS implementations of SSIM, silhouette IoU, and perceptual hash —
// no heavy ML deps. Optimised for "good enough to differentiate visibly
// different renders" not "research-grade." Heavyweight metrics (LPIPS,
// CLIP) deferred to a follow-up.

import sharp from 'sharp';

export interface Diagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  hint: string;
}

export interface ImageSimilarityScore {
  /** Weighted composite headline score in [0, 1]. 1 = identical. */
  composite: number;
  perGate: {
    /** Binary-mask intersection-over-union of subject silhouettes. */
    silhouetteIoU: number;
    /** Structural similarity index on luminance. */
    ssim: number;
    /** Normalised perceptual-hash similarity (1 - hamming/64). */
    perceptualHash: number;
  };
  diagnostics: Diagnostic[];
}

export interface ScoreOpts {
  /** Side length for the normalised analysis raster (default 256). */
  size?: number;
  /**
   * Tolerance from background colour (sampled from corners) below which a
   * pixel is considered background. 0..255. Default 18. Increase for noisier
   * photos, decrease if the renderer's dark background is being eaten as
   * subject.
   */
  bgTolerance?: number;
  /** Weights for the composite headline. Default {silhouette: 0.5, ssim: 0.3, phash: 0.2}. */
  weights?: { silhouette: number; ssim: number; phash: number };
}

const DEFAULTS = {
  size: 256,
  bgTolerance: 18,
  weights: { silhouette: 0.5, ssim: 0.3, phash: 0.2 },
};

/**
 * Score the structural similarity of two PNGs: a reference photo and a render.
 * Both are normalised to grayscale, same size, and compared on three axes.
 *
 * Returns a composite headline score plus per-gate breakdown plus diagnostics
 * that explain WHY the score is what it is — actionable for the actor agent
 * to know where to focus the next iteration.
 */
export async function scoreRenderVsReference(
  renderPng: Buffer,
  referencePng: Buffer,
  opts: ScoreOpts = {},
): Promise<ImageSimilarityScore> {
  const size = opts.size ?? DEFAULTS.size;
  const bgTolerance = opts.bgTolerance ?? DEFAULTS.bgTolerance;
  const weights = opts.weights ?? DEFAULTS.weights;

  // Normalise both images to size×size grayscale Uint8Arrays. Inner-fit so we
  // don't squash aspect (the render canvas may be 1920×1080 with the model
  // occupying ~half the width because of the demo-player terminal pane).
  const render = await normalise(renderPng, size);
  const reference = await normalise(referencePng, size);

  // Extract binary silhouette masks via background subtraction. Background
  // colour is sampled from the four corners — robust for both the renderer's
  // dark canvas and a product photo's grey/white backdrop.
  const renderMaskRaw = silhouetteMask(render, bgTolerance);
  const referenceMaskRaw = silhouetteMask(reference, bgTolerance);

  // Normalize position + scale: crop each mask to its content bbox and
  // re-rasterize to a fixed square. This way silhouette IoU measures SHAPE
  // similarity, not "did the agent center the model in the frame" — which
  // is a renderer concern (terminal pane letterboxing), not a model-quality
  // signal.
  const renderMask = cropToBboxAndRescale(renderMaskRaw, size);
  const referenceMask = cropToBboxAndRescale(referenceMaskRaw, size);

  const silhouetteIoU = maskIoU(renderMask, referenceMask);
  const ssim = computeSSIM(render, reference, size);
  const phashSim = perceptualHashSimilarity(render, reference, size);

  const composite =
    weights.silhouette * silhouetteIoU +
    weights.ssim * ssim +
    weights.phash * phashSim;

  const diagnostics = explainScore({ silhouetteIoU, ssim, phashSim, renderMask, referenceMask, size });

  return {
    composite,
    perGate: { silhouetteIoU, ssim, perceptualHash: phashSim },
    diagnostics,
  };
}

// ─── Normalisation ──────────────────────────────────────────────────────────

async function normalise(pngBuf: Buffer, size: number): Promise<Uint8Array> {
  // Letterbox-fit into size×size grayscale. We pad with the mean colour of
  // the original image's corners so the padded area resembles the background
  // and doesn't bleed into the silhouette mask later.
  const meta = await sharp(pngBuf).raw().toBuffer({ resolveWithObject: true });
  const bgGrey = await sampleBackgroundGrey(pngBuf);

  const resized = await sharp(pngBuf)
    .resize(size, size, {
      fit: 'contain',
      background: { r: bgGrey, g: bgGrey, b: bgGrey },
    })
    .grayscale()
    .raw()
    .toBuffer();

  // sharp's grayscale + raw outputs one byte per pixel.
  if (resized.length !== size * size) {
    throw new Error(
      `normalise: expected ${size * size} bytes, got ${resized.length} (input was ${meta.info.width}×${meta.info.height})`,
    );
  }
  return new Uint8Array(resized);
}

async function sampleBackgroundGrey(pngBuf: Buffer): Promise<number> {
  // Take the four 1×1 corners, average their grayscale. Robust to either dark
  // (renderer) or light (product-photo) backdrops.
  const { data, info } = await sharp(pngBuf).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const corners = [
    data[0],
    data[width - 1],
    data[(height - 1) * width],
    data[(height - 1) * width + (width - 1)],
  ];
  return Math.round(corners.reduce((a, b) => a + b, 0) / corners.length);
}

/**
 * Population standard deviation of the four 1×1 corner grayscale values of
 * `pngBuf`. Used by the `trace_from_image` router (`src/agent/vision/router.ts`)
 * to decide whether a reference photo has a uniform-enough background for the
 * opencv silhouette backend, or whether the vision-LLM backend should be used
 * instead. Threshold convention (router): `< 8` = uniform; `>= 8` = cluttered.
 *
 * Co-located with {@link sampleBackgroundGrey} since both probe the same four
 * pixels — the mean tells us *what* the background colour is; the stddev tells
 * us *how confident* we are that there even is a single background colour.
 */
export async function cornerColorStdDev(pngBuf: Buffer): Promise<number> {
  const { data, info } = await sharp(pngBuf).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const corners = [
    data[0],
    data[width - 1],
    data[(height - 1) * width],
    data[(height - 1) * width + (width - 1)],
  ];
  const mean = corners.reduce((a, b) => a + b, 0) / corners.length;
  const variance = corners.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / corners.length;
  return Math.sqrt(variance);
}

// ─── Silhouette mask ────────────────────────────────────────────────────────

function silhouetteMask(grey: Uint8Array, tolerance: number): Uint8Array {
  // Background colour from corners of the already-normalised image.
  const size = Math.sqrt(grey.length);
  if (!Number.isInteger(size)) throw new Error('silhouetteMask: input must be square');
  const corners = [grey[0], grey[size - 1], grey[(size - 1) * size], grey[grey.length - 1]];
  const bg = corners.reduce((a, b) => a + b, 0) / corners.length;
  const mask = new Uint8Array(grey.length);
  for (let i = 0; i < grey.length; i++) {
    mask[i] = Math.abs(grey[i] - bg) > tolerance ? 1 : 0;
  }
  return mask;
}

/**
 * Find the axis-aligned bbox of the foreground (non-zero) pixels, crop the
 * mask to that bbox, then nearest-neighbour rescale back to size×size.
 * If the mask is empty, return it unchanged.
 *
 * Effect: scale-and-position invariant silhouette comparison. Two masks of
 * the same SHAPE at different scales/positions in their canvas now overlap
 * at near-full IoU. Real shape differences still drag IoU down.
 */
function cropToBboxAndRescale(mask: Uint8Array, size: number): Uint8Array {
  let minX = size, minY = size, maxX = -1, maxY = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return mask; // empty
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  // Preserve aspect: fit the longer side to `size`, center the shorter.
  const longer = Math.max(w, h);
  const scale = size / longer;
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);
  const offsetX = Math.floor((size - outW) / 2);
  const offsetY = Math.floor((size - outH) / 2);
  const out = new Uint8Array(size * size);
  for (let oy = 0; oy < outH; oy++) {
    const srcY = minY + Math.floor(oy / scale);
    if (srcY > maxY) continue;
    for (let ox = 0; ox < outW; ox++) {
      const srcX = minX + Math.floor(ox / scale);
      if (srcX > maxX) continue;
      if (mask[srcY * size + srcX]) {
        out[(offsetY + oy) * size + (offsetX + ox)] = 1;
      }
    }
  }
  return out;
}

function maskIoU(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) throw new Error('maskIoU: length mismatch');
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai || bi) union++;
    if (ai && bi) intersection++;
  }
  if (union === 0) return 1; // both empty — vacuously identical
  return intersection / union;
}

// ─── SSIM ──────────────────────────────────────────────────────────────────
// Single-scale SSIM on luminance only (we already passed grayscale). 8×8
// non-overlapping windows; constants per Wang et al. 2004 for 8-bit images.

function computeSSIM(a: Uint8Array, b: Uint8Array, size: number): number {
  const K1 = 0.01;
  const K2 = 0.03;
  const L = 255;
  const C1 = (K1 * L) ** 2;
  const C2 = (K2 * L) ** 2;
  const window = 8;
  let sum = 0;
  let count = 0;
  for (let y = 0; y + window <= size; y += window) {
    for (let x = 0; x + window <= size; x += window) {
      let meanA = 0, meanB = 0;
      for (let wy = 0; wy < window; wy++) {
        for (let wx = 0; wx < window; wx++) {
          const i = (y + wy) * size + (x + wx);
          meanA += a[i];
          meanB += b[i];
        }
      }
      const n = window * window;
      meanA /= n;
      meanB /= n;
      let varA = 0, varB = 0, cov = 0;
      for (let wy = 0; wy < window; wy++) {
        for (let wx = 0; wx < window; wx++) {
          const i = (y + wy) * size + (x + wx);
          const da = a[i] - meanA;
          const db = b[i] - meanB;
          varA += da * da;
          varB += db * db;
          cov += da * db;
        }
      }
      varA /= n;
      varB /= n;
      cov /= n;
      const ssim =
        ((2 * meanA * meanB + C1) * (2 * cov + C2)) /
        ((meanA * meanA + meanB * meanB + C1) * (varA + varB + C2));
      sum += ssim;
      count++;
    }
  }
  // SSIM range is [-1, 1]; clamp to [0, 1] for composite arithmetic.
  return Math.max(0, sum / count);
}

// ─── Perceptual hash ───────────────────────────────────────────────────────
// Average-hash (aHash) at 8×8. Cheaper and simpler than DCT pHash; good
// enough as a coarse "is the rough layout similar?" check.

function perceptualHashSimilarity(a: Uint8Array, b: Uint8Array, size: number): number {
  const hashA = ahash(a, size);
  const hashB = ahash(b, size);
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) distance++;
  }
  return 1 - distance / hashA.length;
}

function ahash(grey: Uint8Array, size: number): Uint8Array {
  // Downsample to 8×8 via 8-block averaging, then threshold by the 8×8 mean.
  const block = Math.floor(size / 8);
  const cells = new Float32Array(64);
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let sum = 0;
      for (let py = 0; py < block; py++) {
        for (let px = 0; px < block; px++) {
          const i = (by * block + py) * size + (bx * block + px);
          sum += grey[i];
        }
      }
      cells[by * 8 + bx] = sum / (block * block);
    }
  }
  let mean = 0;
  for (const v of cells) mean += v;
  mean /= 64;
  const bits = new Uint8Array(64);
  for (let i = 0; i < 64; i++) bits[i] = cells[i] >= mean ? 1 : 0;
  return bits;
}

// ─── Diagnostics ────────────────────────────────────────────────────────────

function explainScore(args: {
  silhouetteIoU: number;
  ssim: number;
  phashSim: number;
  renderMask: Uint8Array;
  referenceMask: Uint8Array;
  size: number;
}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (args.silhouetteIoU < 0.5) {
    diagnostics.push({
      code: 'image.silhouette.mismatch',
      severity: 'error',
      message: `Silhouette IoU ${args.silhouetteIoU.toFixed(3)} below 0.5 — the rendered outline does not match the reference outline.`,
      hint: locateSilhouetteDelta(args.renderMask, args.referenceMask, args.size),
    });
  } else if (args.silhouetteIoU < 0.8) {
    diagnostics.push({
      code: 'image.silhouette.partial',
      severity: 'warning',
      message: `Silhouette IoU ${args.silhouetteIoU.toFixed(3)} below 0.8 — outline matches the reference category but mismatches in proportion or corner shape.`,
      hint: locateSilhouetteDelta(args.renderMask, args.referenceMask, args.size),
    });
  }

  if (args.ssim < 0.6) {
    diagnostics.push({
      code: 'image.structure.mismatch',
      severity: 'warning',
      message: `SSIM ${args.ssim.toFixed(3)} below 0.6 — interior structure (lens placement, surface features) does not match.`,
      hint: 'Check whether features called out in the reference (camera position, LED, lens insert, surface texture) are present in the render at the correct position.',
    });
  }

  if (args.phashSim < 0.7) {
    diagnostics.push({
      code: 'image.layout.mismatch',
      severity: 'info',
      message: `Perceptual hash similarity ${args.phashSim.toFixed(3)} below 0.7 — coarse layout differs from the reference.`,
      hint: 'The render and reference are placed differently in the frame (cropping, scale, or rotation). Re-check render viewport and model centering.',
    });
  }

  return diagnostics;
}

/**
 * Locate which region of the silhouette differs most between render and
 * reference. Quadrant-based: divide the image into 4 quadrants (UL, UR, LL,
 * LR) and report which has the largest mask-XOR area. Tells the actor agent
 * WHERE to focus.
 */
function locateSilhouetteDelta(render: Uint8Array, reference: Uint8Array, size: number): string {
  const quadrant = (qx: 0 | 1, qy: 0 | 1) => {
    let xor = 0;
    for (let y = qy * (size / 2); y < (qy + 1) * (size / 2); y++) {
      for (let x = qx * (size / 2); x < (qx + 1) * (size / 2); x++) {
        const i = y * size + x;
        if (render[i] !== reference[i]) xor++;
      }
    }
    return xor;
  };
  const ul = quadrant(0, 0);
  const ur = quadrant(1, 0);
  const ll = quadrant(0, 1);
  const lr = quadrant(1, 1);
  const max = Math.max(ul, ur, ll, lr);
  const region =
    max === ul ? 'upper-left' :
    max === ur ? 'upper-right' :
    max === ll ? 'lower-left' :
    'lower-right';
  return `Largest silhouette mismatch in the ${region} quadrant — focus geometry edits there. (XOR pixel counts: UL=${ul}, UR=${ur}, LL=${ll}, LR=${lr}).`;
}
