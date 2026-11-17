// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Software raster for STEP inspect views. Shaded pixels stay in a grey-blue
// range so the highlight colour (220, 20, 120) cannot appear by accident.

import { dot, fitFrame, project, unit, type InspectViewName, type Vec3, type ViewFrame } from './stepViewMath';

export const HIGHLIGHT_RGB: readonly [number, number, number] = [220, 20, 120];
export const LEGEND_HEIGHT = 56;

export interface Raster {
  width: number;
  height: number;
  rgb: Uint8Array;
  // Float64 so a second pass of the same triangle is not rejected by
  // float32 rounding. That rejection left stripes on oblique faces.
  depth: Float64Array;
  faceId: Int16Array;
}

export interface DrawnTriangle {
  p: [Vec3, Vec3, Vec3];
  n: Vec3;
  faceIndex: number;
}

export interface DrawnEdge {
  index: number;
  points: Vec3[];
}

interface Pix {
  x: number;
  y: number;
  depth: number;
}

export function createRaster(width: number, height: number): Raster {
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < rgb.length; i += 3) {
    rgb[i] = 244;
    rgb[i + 1] = 246;
    rgb[i + 2] = 248;
  }
  const depth = new Float64Array(width * height);
  depth.fill(-1e30);
  const faceId = new Int16Array(width * height);
  faceId.fill(-1);
  return { width, height, rgb, depth, faceId };
}

export function shadeRgb(normal: Vec3, light: Vec3): [number, number, number] {
  const nd = Math.max(0, dot(normal, light));
  const t = 0.38 + 0.62 * nd;
  return [
    Math.round(72 + 100 * t),
    Math.round(80 + 105 * t),
    Math.round(90 + 108 * t),
  ];
}

function putPixel(
  raster: Raster,
  x: number,
  y: number,
  depth: number,
  color: readonly [number, number, number],
  faceIndex: number,
): boolean {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return false;
  const i = y * raster.width + x;
  if (depth < raster.depth[i]) return false;
  raster.depth[i] = depth;
  raster.faceId[i] = faceIndex;
  const o = i * 3;
  raster.rgb[o] = color[0];
  raster.rgb[o + 1] = color[1];
  raster.rgb[o + 2] = color[2];
  return true;
}

function barycentric(
  px: number,
  py: number,
  a: Pix,
  b: Pix,
  c: Pix,
): [number, number, number] | undefined {
  const denom = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(denom) < 1e-8) return undefined;
  const w0 = ((b.y - c.y) * (px - c.x) + (c.x - b.x) * (py - c.y)) / denom;
  const w1 = ((c.y - a.y) * (px - c.x) + (a.x - c.x) * (py - c.y)) / denom;
  const w2 = 1 - w0 - w1;
  if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) return undefined;
  return [w0, w1, w2];
}

export function paintTriangle(
  raster: Raster,
  a: Pix,
  b: Pix,
  c: Pix,
  color: readonly [number, number, number],
  faceIndex: number,
): void {
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(raster.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(raster.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w = barycentric(x + 0.5, y + 0.5, a, b, c);
      if (!w) continue;
      const depth = w[0] * a.depth + w[1] * b.depth + w[2] * c.depth;
      putPixel(raster, x, y, depth, color, faceIndex);
    }
  }
}

export function paintLine(
  raster: Raster,
  a: Pix,
  b: Pix,
  color: readonly [number, number, number],
  faceIndex: number,
  thickness: number,
): number {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  let written = 0;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    const depth = a.depth + (b.depth - a.depth) * t;
    for (let oy = -thickness; oy <= thickness; oy++) {
      for (let ox = -thickness; ox <= thickness; ox++) {
        if (ox * ox + oy * oy > thickness * thickness + 0.1) continue;
        if (putPixel(raster, x + ox, y + oy, depth, color, faceIndex)) written += 1;
      }
    }
  }
  return written;
}

function toPix(p: Vec3, frame: ViewFrame, depthBias: number): Pix {
  const s = project(p, frame);
  return { x: s.x, y: s.y, depth: s.depth + depthBias };
}

export function triangleNormal(p: [Vec3, Vec3, Vec3]): Vec3 {
  const u: Vec3 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
  const v: Vec3 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
  return unit([
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]);
}

export interface ViewPixels {
  raster: Raster;
  frame: ViewFrame;
  facePixels: Map<number, { count: number; sx: number; sy: number }>;
  edgePixels: Map<number, number>;
  targetPixels: number;
}

function accumulateFace(map: Map<number, { count: number; sx: number; sy: number }>, id: number, x: number, y: number): void {
  const cur = map.get(id);
  if (cur) {
    cur.count += 1;
    cur.sx += x;
    cur.sy += y;
    return;
  }
  map.set(id, { count: 1, sx: x, sy: y });
}

function paintFaces(
  raster: Raster,
  frame: ViewFrame,
  faces: readonly DrawnTriangle[],
  light: Vec3,
  onlyFace: number | undefined,
  colorOverride: readonly [number, number, number] | undefined,
): void {
  for (const tri of faces) {
    if (onlyFace !== undefined && tri.faceIndex !== onlyFace) continue;
    if (dot(tri.n, frame.camDir) <= 1e-4) continue;
    const color = colorOverride ?? shadeRgb(tri.n, light);
    const a = toPix(tri.p[0], frame, 0);
    const b = toPix(tri.p[1], frame, 0);
    const c = toPix(tri.p[2], frame, 0);
    paintTriangle(raster, a, b, c, color, tri.faceIndex);
  }
}

const EDGE_RGB: readonly [number, number, number] = [36, 42, 52];
const EMPTY_DEPTH = -1e20;

/** Copy a filled pixel's depth into an empty 4-neighbour. A back face's
 *  boundary can otherwise land on the one-pixel gap the triangle test leaves
 *  around a closer face and read as a visible silhouette. */
function closeDepthGaps(raster: Raster): void {
  const copy = Float64Array.from(raster.depth);
  const w = raster.width;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (copy[i] > EMPTY_DEPTH) continue;
      raster.depth[i] = neighbourDepth(copy, w, raster.height, x, y);
    }
  }
}

function neighbourDepth(depth: Float64Array, w: number, h: number, x: number, y: number): number {
  let best = depth[y * w + x];
  if (x > 0) best = Math.max(best, depth[y * w + x - 1]);
  if (x + 1 < w) best = Math.max(best, depth[y * w + x + 1]);
  if (y > 0) best = Math.max(best, depth[(y - 1) * w + x]);
  if (y + 1 < h) best = Math.max(best, depth[(y + 1) * w + x]);
  return best;
}

function paintEdges(
  raster: Raster,
  frame: ViewFrame,
  edges: readonly DrawnEdge[],
  color: readonly [number, number, number],
  bias: number,
  thickness: number,
  counts: Map<number, number> | undefined,
): void {
  for (const edge of edges) {
    let written = 0;
    for (let i = 1; i < edge.points.length; i++) {
      const a = toPix(edge.points[i - 1], frame, bias);
      const b = toPix(edge.points[i], frame, bias);
      written += paintLine(raster, a, b, color, -2, thickness);
    }
    if (counts && written > 0) counts.set(edge.index, (counts.get(edge.index) ?? 0) + written);
  }
}

function readFacePixels(raster: Raster): Map<number, { count: number; sx: number; sy: number }> {
  const map = new Map<number, { count: number; sx: number; sy: number }>();
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const id = raster.faceId[y * raster.width + x];
      if (id >= 0) accumulateFace(map, id, x, y);
    }
  }
  return map;
}

export function rasterInspectView(input: {
  view: InspectViewName;
  width: number;
  modelHeight: number;
  points: readonly Vec3[];
  triangles: readonly DrawnTriangle[];
  edges: readonly DrawnEdge[];
  targetFace: number | undefined;
  targetLoops: readonly Vec3[][];
}): ViewPixels {
  const height = input.modelHeight + LEGEND_HEIGHT;
  const raster = createRaster(input.width, height);
  const frame = fitFrame(input.points, input.view, input.width, input.modelHeight, 16);
  const light = unit([
    frame.camDir[0] + 0.15,
    frame.camDir[1] - 0.1,
    frame.camDir[2] + 0.55,
  ]);
  paintFaces(raster, frame, input.triangles, light, undefined, undefined);
  const edgePixels = new Map<number, number>();
  paintEdges(raster, frame, input.edges, EDGE_RGB, 0.05, 0, edgePixels);
  if (input.targetFace !== undefined) {
    closeDepthGaps(raster);
    paintFaces(raster, frame, input.triangles, light, input.targetFace, HIGHLIGHT_RGB);
    const loops: DrawnEdge[] = input.targetLoops.map((points, index) => ({ index, points }));
    paintEdges(raster, frame, loops, HIGHLIGHT_RGB, 0.35, 0, undefined);
  }
  // Legend band sits below the model viewport and must not carry highlight.
  for (let y = input.modelHeight; y < height; y++) {
    for (let x = 0; x < input.width; x++) {
      const i = y * input.width + x;
      const o = i * 3;
      raster.rgb[o] = 255;
      raster.rgb[o + 1] = 255;
      raster.rgb[o + 2] = 255;
      raster.faceId[i] = -1;
    }
  }
  let targetPixels = 0;
  if (input.targetFace !== undefined) {
    for (let i = 0; i < raster.rgb.length; i += 3) {
      if (
        raster.rgb[i] === HIGHLIGHT_RGB[0]
        && raster.rgb[i + 1] === HIGHLIGHT_RGB[1]
        && raster.rgb[i + 2] === HIGHLIGHT_RGB[2]
      ) targetPixels += 1;
    }
  }
  return { raster, frame, facePixels: readFacePixels(raster), edgePixels, targetPixels };
}
