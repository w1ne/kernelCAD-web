// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/vision/opencvBackend.ts
//
// Pure-JS silhouette extractor for the `trace_from_image` tool.
//
// Historically this used `@techstark/opencv-js` for grayscale conversion, Otsu
// threshold, findContours and approxPolyDP. That dependency is a browser WASM
// build whose runtime never signals ready under the hosted server's Node/ESM
// context — importing it hangs forever, which is exactly the prod bug this file
// fixes. The pipeline is now implemented in plain TypeScript:
//
//   1. Decode + RGBA via sharp (already a dep; no WASM contour kernel).
//   2. Luma grayscale: 0.299R + 0.587G + 0.114B.
//   3. Otsu threshold (256-bin histogram). Inverted (THRESH_BINARY_INV
//      semantics): foreground = pixels darker than the threshold, i.e. a dark
//      subject on a bright background. Prefer a background-relative foreground
//      mask when it isolates a pale device, so an internal dark screen is not
//      mistaken for the outer housing.
//   4. Largest 4-connected foreground component, then Moore-neighbour boundary
//      tracing (with Jacob's stopping criterion) of its outer boundary.
//   5. arcLength = summed closed-loop segment lengths.
//   6. Douglas-Peucker simplify with epsilon ramped up until the polyline has
//      at most `maxWaypoints` vertices.
//   7. Normalize to `[0..1]` with top-left origin.
//
// Deterministic, fast (<1s for typical fixtures), no WASM, no hang.

import sharp from 'sharp';
import type { Vec2Normalized } from './types';

/** Pixel-space point used internally before normalization. */
type Point = { x: number; y: number };

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

type ContourCandidate = {
  boundary: Point[];
  bounds: Bounds;
};

/** A pale device must differ from a uniform white background by at least this
 * much luma before we consider it as a broader outer-silhouette candidate. */
const LIGHT_SUBJECT_LUMA_DELTA = 20;
const COMPACT_DARK_BBOX_AREA = 0.5;
const BROAD_OVER_DARK_BBOX_RATIO = 1.6;
const MAX_TRUSTED_BBOX_AREA = 0.95;

/**
 * Compute an Otsu threshold from a 256-bin grayscale histogram.
 * Returns the grayscale value `t` that maximizes between-class variance.
 * Foreground (object) is taken as pixels with `grey < t` (inverted), matching
 * OpenCV's `THRESH_BINARY_INV + THRESH_OTSU` for a dark-on-light subject.
 */
export function otsuThreshold(histogram: number[] | Uint32Array): number {
  let total = 0;
  for (let i = 0; i < 256; i++) total += histogram[i];
  if (total === 0) return 127;

  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Sum of consecutive segment lengths around a closed polyline (the OpenCV
 * `arcLength(curve, closed=true)` equivalent).
 */
export function arcLength(points: Point[], closed = true): number {
  if (points.length < 2) return 0;
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += dist(points[i], points[i + 1]);
  }
  if (closed) len += dist(points[points.length - 1], points[0]);
  return len;
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Perpendicular distance from point `p` to the line through `a` and `b`. */
function perpDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const segLenSq = dx * dx + dy * dy;
  if (segLenSq === 0) return dist(p, a);
  // Distance from point to infinite line a→b.
  const cross = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return cross / Math.sqrt(segLenSq);
}

/**
 * Douglas-Peucker polyline simplification (the OpenCV `approxPolyDP`
 * equivalent). `epsilon` is the max perpendicular deviation allowed before a
 * vertex is kept. Operates on an open polyline; callers handle closure.
 */
export function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points.slice();

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    // Drop the duplicated junction vertex.
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

/**
 * Find the largest 4-connected foreground component in a binary mask and return
 * its label set as a fast membership predicate plus the component's pixel count.
 * Foreground pixels are `mask[y*width+x] === 1`.
 */
function largestComponent(
  mask: Uint8Array,
  width: number,
  height: number,
): { member: Uint8Array; size: number; seed: Point | null } {
  const labels = new Int32Array(width * height).fill(-1);
  const stack: number[] = [];
  let bestLabel = -1;
  let bestSize = 0;
  let bestSeed: Point | null = null;
  let nextLabel = 0;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] === 0 || labels[start] !== -1) continue;
    const label = nextLabel++;
    let size = 0;
    let seedIdx = start;
    stack.length = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length > 0) {
      const idx = stack.pop() as number;
      size++;
      // Track the top-most, left-most pixel of this component as a trace seed.
      if (idx < seedIdx) seedIdx = idx;
      const x = idx % width;
      const y = (idx - x) / width;
      // 4-connectivity.
      if (x > 0) pushIf(idx - 1);
      if (x < width - 1) pushIf(idx + 1);
      if (y > 0) pushIf(idx - width);
      if (y < height - 1) pushIf(idx + width);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
      const sx = seedIdx % width;
      bestSeed = { x: sx, y: (seedIdx - sx) / width };
    }

    function pushIf(n: number): void {
      if (mask[n] === 1 && labels[n] === -1) {
        labels[n] = label;
        stack.push(n);
      }
    }
  }

  const member = new Uint8Array(width * height);
  if (bestLabel >= 0) {
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === bestLabel) member[i] = 1;
    }
  }
  return { member, size: bestSize, seed: bestSeed };
}

function traceLargestContour(
  mask: Uint8Array,
  width: number,
  height: number,
): ContourCandidate | null {
  const { member, size, seed } = largestComponent(mask, width, height);
  if (size <= 0 || !seed) return null;

  const boundary = mooreTrace(member, width, height, seed);
  if (boundary.length < 3) return null;

  return { boundary, bounds: boundsOf(boundary) };
}

function boundsOf(points: Point[]): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

function bboxArea(candidate: ContourCandidate, width: number, height: number): number {
  const { minX, maxX, minY, maxY } = candidate.bounds;
  return ((maxX - minX + 1) / width) * ((maxY - minY + 1) / height);
}

function touchesFrame(candidate: ContourCandidate, width: number, height: number): boolean {
  const { minX, maxX, minY, maxY } = candidate.bounds;
  return minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1;
}

function cornerBackgroundLuma(grey: Uint8Array, width: number, height: number): number {
  const side = Math.max(1, Math.min(32, Math.floor(Math.min(width, height) / 8)));
  const samples: number[] = [];
  const corners: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [width - side, 0],
    [0, height - side],
    [width - side, height - side],
  ];
  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + side; y++) {
      for (let x = startX; x < startX + side; x++) samples.push(grey[y * width + x]);
    }
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? 0;
}

function darkMaskAtOrBelow(grey: Uint8Array, threshold: number): Uint8Array {
  const mask = new Uint8Array(grey.length);
  for (let i = 0; i < grey.length; i++) mask[i] = grey[i] <= threshold ? 1 : 0;
  return mask;
}

function isIsolatedForegroundCandidate(
  candidate: ContourCandidate,
  width: number,
  height: number,
): boolean {
  return !touchesFrame(candidate, width, height) && bboxArea(candidate, width, height) <= MAX_TRUSTED_BBOX_AREA;
}

function looksLikeUnisolatedLightOuterCandidate(
  dark: ContourCandidate,
  light: ContourCandidate | null,
  width: number,
  height: number,
): boolean {
  if (light == null || bboxArea(dark, width, height) >= COMPACT_DARK_BBOX_AREA) return false;
  return bboxArea(light, width, height) >= bboxArea(dark, width, height) * BROAD_OVER_DARK_BBOX_RATIO;
}

// Moore-neighbour offsets, clockwise starting from the west neighbour. The
// canonical Moore order is the 8 neighbours walked clockwise; we start the
// search from the pixel we entered the boundary from (backtrack) per Jacob's
// criterion.
const MOORE: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], // W
  [-1, -1], // NW
  [0, -1], // N
  [1, -1], // NE
  [1, 0], // E
  [1, 1], // SE
  [0, 1], // S
  [-1, 1], // SW
];

function isForeground(member: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  return member[y * width + x] === 1;
}

/**
 * Moore-neighbour boundary tracing with Jacob's stopping criterion. `seed` is a
 * foreground pixel guaranteed to be on the boundary (the top-most/left-most
 * pixel of the component). Returns the ordered outer-boundary pixels (closed
 * loop, first vertex not repeated at the end).
 */
function mooreTrace(
  member: Uint8Array,
  width: number,
  height: number,
  seed: Point,
): Point[] {
  const boundary: Point[] = [];
  const start = seed;

  // Direction index in MOORE we came FROM (backtrack). The seed is the
  // top-left-most pixel; we entered it conceptually from the west.
  let current = start;
  // The pixel we were on before stepping onto `current`.
  let backtrack: Point = { x: start.x - 1, y: start.y };

  // Jacob's criterion: stop when we re-enter the start pixel AND the next pixel
  // visited would be the same as the second pixel of the boundary.
  let firstStep: Point | null = null;
  const maxSteps = width * height * 8 + 8; // hard safety bound
  let steps = 0;

  do {
    boundary.push({ x: current.x, y: current.y });

    // Start scanning clockwise from the neighbour just after the backtrack
    // direction.
    const backDir = neighbourIndex(current, backtrack);
    let found: Point | null = null;
    let foundBack: Point = backtrack;
    for (let i = 1; i <= 8; i++) {
      const dirIdx = (backDir + i) % 8;
      const nx = current.x + MOORE[dirIdx][0];
      const ny = current.y + MOORE[dirIdx][1];
      if (isForeground(member, width, height, nx, ny)) {
        found = { x: nx, y: ny };
        // The backtrack for the next step is the previous neighbour we checked.
        const prevIdx = (dirIdx + 7) % 8; // dirIdx - 1
        foundBack = { x: current.x + MOORE[prevIdx][0], y: current.y + MOORE[prevIdx][1] };
        break;
      }
    }

    if (!found) {
      // Isolated pixel — single-pixel component.
      break;
    }

    if (firstStep === null) {
      firstStep = found;
    } else if (
      current.x === start.x &&
      current.y === start.y &&
      found.x === firstStep.x &&
      found.y === firstStep.y
    ) {
      // Jacob's stopping criterion met: drop the duplicated start we just pushed.
      boundary.pop();
      break;
    }

    backtrack = foundBack;
    current = found;
    steps++;
  } while (steps < maxSteps);

  return boundary;
}

/** Index into MOORE of `neighbour` relative to `center`, or 0 if not adjacent. */
function neighbourIndex(center: Point, neighbour: Point): number {
  const dx = neighbour.x - center.x;
  const dy = neighbour.y - center.y;
  for (let i = 0; i < 8; i++) {
    if (MOORE[i][0] === dx && MOORE[i][1] === dy) return i;
  }
  return 0;
}

/**
 * Extract a normalized silhouette polyline from `pngBytes`.
 *
 * Pipeline (see file header). Throws `'opencvBackend: no foreground contour
 * found'` when Otsu cannot split the image into figure/ground (e.g. a pure
 * solid-color image).
 *
 * @param pngBytes  Encoded image bytes (any sharp-decodable format).
 * @param maxWaypoints  Cap on output vertices (>= 3). Epsilon ramps until met.
 */
export async function extractSilhouettePolyline(
  pngBytes: Buffer,
  maxWaypoints: number,
): Promise<Vec2Normalized[]> {
  if (maxWaypoints < 3) {
    throw new Error(`opencvBackend: maxWaypoints must be >= 3 (got ${maxWaypoints})`);
  }

  const { data, info } = await sharp(pngBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const channels = info.channels; // 4 after ensureAlpha
  if (width === 0 || height === 0) {
    throw new Error('opencvBackend: image has zero dimension');
  }

  // 1+2: grayscale via luma, build histogram.
  const grey = new Uint8Array(width * height);
  const histogram = new Uint32Array(256);
  for (let p = 0, g = 0; g < grey.length; g++, p += channels) {
    const r = data[p];
    const gg = data[p + 1];
    const b = data[p + 2];
    const lum = (0.299 * r + 0.587 * gg + 0.114 * b) | 0;
    grey[g] = lum;
    histogram[lum]++;
  }

  // 3: Otsu threshold, inverted mask (foreground = darker than threshold).
  const t = otsuThreshold(histogram);
  // OpenCV THRESH_BINARY_INV: dst = (src > t) ? 0 : maxval, i.e. foreground is
  // `src <= t`. Using `<=` (not `<`) is what makes a perfectly bimodal mask
  // (Otsu returns t=0 for black-on-white) still capture the dark subject.
  // 4: Trace a background-relative foreground first. On a white product photo
  // this includes a pale outer enclosure as well as dark details, while a
  // dark-on-light square remains the same single component. It avoids spending
  // a second full-image connected-component pass just to discover that an
  // internal screen was the Otsu result.
  const backgroundLuma = cornerBackgroundLuma(grey, width, height);
  const lightThreshold = backgroundLuma - LIGHT_SUBJECT_LUMA_DELTA;
  const lightCandidate = lightThreshold > t
    ? traceLargestContour(darkMaskAtOrBelow(grey, lightThreshold), width, height)
    : null;

  let candidate = lightCandidate != null && isIsolatedForegroundCandidate(lightCandidate, width, height)
    ? lightCandidate
    : null;

  if (candidate == null) {
    const darkCandidate = traceLargestContour(darkMaskAtOrBelow(grey, t), width, height);
    if (darkCandidate == null) {
      throw new Error('opencvBackend: no foreground contour found');
    }
    if (looksLikeUnisolatedLightOuterCandidate(darkCandidate, lightCandidate, width, height)) {
      // Do not present a compact dark interior as a confident outer silhouette
      // when a larger light foreground leaks into the image frame or otherwise
      // cannot be isolated safely.
      throw new Error('opencvBackend: ambiguous outer silhouette; broad light foreground cannot be isolated from the image background');
    }
    candidate = darkCandidate;
  }

  const boundary = candidate.boundary;

  // 5: arcLength of the closed boundary.
  const perimeter = arcLength(boundary, true);
  if (perimeter <= 0) {
    throw new Error('opencvBackend: no foreground contour found');
  }

  // 6: Douglas-Peucker, ramp epsilon up to 6× until <= maxWaypoints. We close
  // the boundary by appending the first point so DP keeps the closing corner,
  // then drop the duplicate.
  const closedBoundary = boundary.concat([boundary[0]]);
  let simplified: Point[] = closedBoundary;
  let epsilonRatio = 0.01; // 1% of perimeter to start (matches prior call).
  for (let attempt = 0; attempt < 7; attempt++) {
    const eps = epsilonRatio * perimeter;
    const dp = douglasPeucker(closedBoundary, eps);
    // Drop the duplicated closing vertex appended above.
    simplified = dp.length > 1 && samePoint(dp[0], dp[dp.length - 1]) ? dp.slice(0, -1) : dp;
    if (simplified.length <= maxWaypoints) break;
    epsilonRatio *= Math.sqrt(2);
  }

  // 7: normalize to [0..1], top-left origin.
  return simplified.map(({ x, y }) => [x / width, y / height] as Vec2Normalized);
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}
