// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Drawing-QA geometry bounds from the same normalised SVG paths used by
// the vector PDF writer. Cubic extrema are measured in transformed page
// coordinates, not from the control-point envelope.

import { parseTransform, pathDataToGeometry } from '../../export/pdf/svgSheetToPdf';

export interface Bounds { x0: number; y0: number; x1: number; y1: number }
export type Affine = readonly [number, number, number, number, number, number];
export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

export function multiplyAffine(a: Affine, b: Affine): Affine {
  return [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

export function transformPoint(x: number, y: number, a: Affine): [number, number] {
  return [a[0] * x + a[2] * y + a[4], a[1] * x + a[3] * y + a[5]];
}

export function transformRectangle(b: Bounds, a: Affine): Bounds {
  const pts = [
    transformPoint(b.x0, b.y0, a), transformPoint(b.x0, b.y1, a),
    transformPoint(b.x1, b.y0, a), transformPoint(b.x1, b.y1, a),
  ];
  return boundsOfPoints(pts);
}

interface TransformNode {
  attrs: Record<string, string>;
  parent?: TransformNode;
}

export function nodeMatrix(node: TransformNode): Affine {
  const chain: TransformNode[] = [];
  for (let current: TransformNode | undefined = node; current; current = current.parent) chain.unshift(current);
  return chain.reduce<Affine>(
    (matrix, n) => multiplyAffine(matrix, parseTransform(n.attrs.transform) ?? IDENTITY),
    IDENTITY,
  );
}

function boundsOfPoints(pts: readonly (readonly [number, number])[]): Bounds {
  return { x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])),
    x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) };
}

function quadraticRoots(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

function cubicCriticalPoints(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 3 * p0 - 6 * p1 + 3 * p2;
  const c = -3 * p0 + 3 * p1;
  return quadraticRoots(3 * a, 2 * b, c).filter(t => t > 0 && t < 1);
}

function cubicValue(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function cubicBounds(points: readonly [number, number][]): Bounds {
  const [p0, p1, p2, p3] = points;
  const times = [0, 1, ...cubicCriticalPoints(p0[0], p1[0], p2[0], p3[0]),
    ...cubicCriticalPoints(p0[1], p1[1], p2[1], p3[1])];
  return boundsOfPoints(times.map(t => [
    cubicValue(p0[0], p1[0], p2[0], p3[0], t),
    cubicValue(p0[1], p1[1], p2[1], p3[1], t),
  ]));
}

function merge(a: Bounds | undefined, b: Bounds): Bounds {
  return a ? { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) } : b;
}

type PathCursor = {
  current?: [number, number];
  start?: [number, number];
  bounds?: Bounds;
};

function visitOperation(cursor: PathCursor, op: string, matrix: Affine): boolean {
  const tokens = op.trim().split(/\s+/);
  const kind = tokens.pop();
  const nums = tokens.map(Number);
  if (!nums.every(Number.isFinite)) return false;
  if (kind === 'h') {
    if (!cursor.start) return false;
    cursor.current = cursor.start;
    return true;
  }
  if (kind === 'm' || kind === 'l') {
    if (nums.length !== 2 || (kind === 'l' && !cursor.current)) return false;
    const point = transformPoint(nums[0], nums[1], matrix);
    cursor.bounds = merge(cursor.bounds, boundsOfPoints([point]));
    cursor.current = point;
    if (kind === 'm') cursor.start = point;
    return true;
  }
  if (kind === 'c') {
    if (nums.length !== 6 || !cursor.current) return false;
    const ctrl1 = transformPoint(nums[0], nums[1], matrix);
    const ctrl2 = transformPoint(nums[2], nums[3], matrix);
    const end = transformPoint(nums[4], nums[5], matrix);
    cursor.bounds = merge(cursor.bounds, cubicBounds([cursor.current, ctrl1, ctrl2, end]));
    cursor.current = end;
    return true;
  }
  return false;
}

/** Fail closed for unknown/invalid path commands, unlike the PDF renderer's
 *  permissive unsupported-token skipping. Empty nonpainted paths are ignored. */
export function measureSvgPath(d: string, matrix: Affine = IDENTITY): Bounds | undefined {
  if (!d.trim()) return undefined;
  const remaining = d.replace(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g, '')
    .replace(/[\s,]/g, '');
  if (!/^[MmLlHhVvCcSsQqTtAaZz]+$/.test(remaining)) return undefined;
  try {
    const ops = pathDataToGeometry(d).ops;
    if (!ops.length) return undefined;
    const cursor: PathCursor = {};
    for (const op of ops) {
      if (!visitOperation(cursor, op, matrix)) return undefined;
    }
    return cursor.bounds;
  } catch {
    return undefined;
  }
}
