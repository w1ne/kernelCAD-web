// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Engineering-view camera for STEP inspect rasters. Directions match the
// documented render views: front looks along +Y from -Y, right along -X
// from +X, top looks down from +Z, iso sits in the (+X, -Y, +Z) octant.
// Screen axes follow that same contract (Z-up, except the top view).

export type InspectViewName = 'front' | 'right' | 'top' | 'iso';

export const INSPECT_VIEWS: readonly InspectViewName[] = ['front', 'right', 'top', 'iso'];

export type Vec3 = [number, number, number];

export interface ViewBasis {
  camDir: Vec3;
  right: Vec3;
  up: Vec3;
}

export interface ViewFrame extends ViewBasis {
  target: Vec3;
  /** Pixels per millimetre. */
  scale: number;
  originX: number;
  originY: number;
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unit(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-12) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Unit vector from the model toward the camera. */
export function cameraDir(view: InspectViewName): Vec3 {
  if (view === 'front') return [0, -1, 0];
  if (view === 'right') return [1, 0, 0];
  if (view === 'top') return [0, 0, 1];
  return unit([0.7, -0.7, 0.5]);
}

export function viewBasis(view: InspectViewName): ViewBasis {
  const camDir = cameraDir(view);
  const worldUp: Vec3 = view === 'top' ? [0, 1, 0] : [0, 0, 1];
  const right = unit(cross(worldUp, camDir));
  const up = unit(cross(camDir, right));
  return { camDir, right, up };
}

export function project(p: Vec3, frame: ViewFrame): { x: number; y: number; depth: number } {
  const d: Vec3 = [p[0] - frame.target[0], p[1] - frame.target[1], p[2] - frame.target[2]];
  const sx = dot(d, frame.right);
  const sy = dot(d, frame.up);
  return {
    x: frame.originX + sx * frame.scale,
    y: frame.originY - sy * frame.scale,
    depth: dot(d, frame.camDir),
  };
}

function boundsCenter(points: readonly Vec3[]): Vec3 {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] > maxZ) maxZ = p[2];
  }
  if (!Number.isFinite(minX)) return [0, 0, 0];
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

/** Fit the point cloud into the model viewport with a pixel margin. */
export function fitFrame(
  points: readonly Vec3[],
  view: InspectViewName,
  width: number,
  modelHeight: number,
  margin: number,
): ViewFrame {
  const basis = viewBasis(view);
  const target = boundsCenter(points);
  const bare: ViewFrame = { ...basis, target, scale: 1, originX: 0, originY: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const s = project(p, bare);
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x > maxX) maxX = s.x;
    if (s.y > maxY) maxY = s.y;
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const usableW = Math.max(1, width - margin * 2);
  const usableH = Math.max(1, modelHeight - margin * 2);
  const scale = Math.min(usableW / spanX, usableH / spanY);
  const originX = margin + usableW / 2 - ((minX + maxX) / 2) * scale;
  const originY = margin + usableH / 2 - ((minY + maxY) / 2) * scale;
  return { ...basis, target, scale, originX, originY };
}
