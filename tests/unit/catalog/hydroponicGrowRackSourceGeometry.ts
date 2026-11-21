// SPDX-License-Identifier: MIT
// Independent analytic checks of this model's source expressions. This is not
// the kernel or a native geometry result; unsupported expression forms throw.
import type { Expression } from './hydroponicGrowRackSourceTrace';

export type Point = [number, number, number];
type Point2 = [number, number];
export type Bounds = { min: Point; max: Point };
const epsilon = 1e-8;
function expression(value: unknown): Expression {
  if (!value || typeof value !== 'object' || !('operation' in value) || !('arguments' in value)) throw new Error('Expected source expression');
  return value as Expression;
}
function number(value: unknown): number {
  const v = typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('Expected finite source number');
  return v;
}
function points(value: unknown): Point2[] {
  if (!Array.isArray(value)) throw new Error('Expected polygon');
  return value.map(p => {
    if (!Array.isArray(p) || p.length !== 2) throw new Error('Expected polygon point');
    return [number(p[0]), number(p[1])];
  });
}
function point(value: unknown): Point {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('Expected point');
  return [number(value[0]), number(value[1]), number(value[2])];
}
function area(poly: Point2[]): number {
  return Math.abs(poly.reduce((sum, p, i) => {
    const q = poly[(i + 1) % poly.length]!;
    return sum + p[0] * q[1] - p[1] * q[0];
  }, 0)) / 2;
}
function polygonContains(poly: Point2[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!;
    const cross = (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < epsilon && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0])
      && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1])) return false;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
// This source-only helper supports the two nested rectangular loops used by
// the lid. It refuses other topology instead of inferring a hole from points.
function rectangularAnnulus(e: Expression) {
  const raw = e.arguments[0];
  if (!Array.isArray(raw) || raw.length !== 2) throw new Error('Unsupported annulus loops');
  const loops = raw.map(points);
  const limits = loops.map(poly => {
    if (poly.length !== 4 || new Set(poly.map(p => p.join(','))).size !== 4) throw new Error('Unsupported annulus rectangle');
    const min = [Math.min(...poly.map(p => p[0])), Math.min(...poly.map(p => p[1]))] as Point2;
    const max = [Math.max(...poly.map(p => p[0])), Math.max(...poly.map(p => p[1]))] as Point2;
    if (min[0] >= max[0] || min[1] >= max[1] || poly.some((p, i) => {
      const next = poly[(i + 1) % poly.length]!;
      return ![min[0], max[0]].includes(p[0]) || ![min[1], max[1]].includes(p[1])
        || (p[0] !== next[0] && p[1] !== next[1]);
    })) throw new Error('Unsupported annulus rectangle');
    return { min, max };
  });
  const outer = limits[0]!, inner = limits[1]!, depth = number(e.arguments[1]);
  if (depth <= 0 || [0, 1].some(i => inner.min[i]! <= outer.min[i]! || inner.max[i]! >= outer.max[i]!)) throw new Error('Unsupported annulus nesting');
  return { loops, depth };
}
function rotate(p: Point, axis: 'rotateX' | 'rotateY', degrees: number): Point {
  const c = Math.cos(degrees * Math.PI / 180), s = Math.sin(degrees * Math.PI / 180);
  return axis === 'rotateX' ? [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]]
    : [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}
function boxBounds(e: Expression): Bounds {
  if (e.operation !== 'box') throw new Error('Expected original box');
  const dims = e.arguments.slice(0, 3).map(number) as Point;
  const min = dims.map(d => e.arguments[3] === true ? -d / 2 : 0) as Point;
  return { min, max: dims.map((d, i) => min[i]! + d) as Point };
}
function loft(e: Expression) {
  const [a, b, raw] = e.arguments;
  const options = raw as { planes: { plane: string; origin: unknown }[]; startPoint: unknown; endPoint: unknown; ruled: boolean };
  if (!options?.ruled || options.planes.length !== 2 || options.planes.some(p => p.plane !== 'XY')) throw new Error('Unsupported loft');
  const lower = point(options.planes[0]!.origin), upper = point(options.planes[1]!.origin);
  const start = point(options.startPoint), end = point(options.endPoint), polygon = points(a);
  if (JSON.stringify(polygon) !== JSON.stringify(points(b)) || [lower, upper, start, end].some(p => p[0] !== 0 || p[1] !== 0)
    || !(start[2] < lower[2] && lower[2] < upper[2] && upper[2] < end[2])) throw new Error('Unsupported loft rings');
  return { polygon, lower: lower[2], upper: upper[2], start: start[2], end: end[2] };
}
function cutout(e: Expression) {
  const parent = expression(e.arguments[0]), bounds = boxBounds(parent), polygon = points(e.arguments[1]);
  const options = e.arguments[2] as { face: string; depth: unknown };
  if (options?.face !== 'top') throw new Error('Unsupported cutout face');
  const depth = number(options.depth);
  if (depth <= 0 || polygon.some(p => p[0] <= bounds.min[0] || p[0] >= bounds.max[0] || p[1] <= bounds.min[1] || p[1] >= bounds.max[1])) throw new Error('Unsupported cutout extent');
  return { parent, bounds, polygon, depth };
}
export function sourceVertices(e: Expression): Point[] {
  const a = e.arguments, parent = () => expression(a[0]);
  switch (e.operation) {
    case 'box': {
      const b = boxBounds(e), out: Point[] = [];
      for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) out.push([x, y, z]);
      return out;
    }
    case 'extrude': return points(a[0]).flatMap(p => [[p[0], p[1], 0], [p[0], p[1], number(a[1])]] as Point[]);
    case 'extrudeLoops': {
      const l = rectangularAnnulus(e);
      return l.loops.flatMap(poly => poly.flatMap(p => [[p[0], p[1], 0], [p[0], p[1], l.depth]] as Point[]));
    }
    case 'loft': {
      const l = loft(e);
      return [...l.polygon.flatMap(p => [[p[0], p[1], l.lower], [p[0], p[1], l.upper]] as Point[]), [0, 0, l.start], [0, 0, l.end]];
    }
    case 'translate': return sourceVertices(parent()).map(p => p.map((v, i) => v + number(a[i + 1])) as Point);
    case 'rotateX': case 'rotateY': return sourceVertices(parent()).map(p => rotate(p, e.operation as 'rotateX' | 'rotateY', number(a[1])));
    case 'scale': return sourceVertices(parent()).map(p => p.map(v => v * number(a[1])) as Point);
    case 'color': case 'cutout': case 'subtract': return sourceVertices(parent());
    default: throw new Error('Unsupported vertex expression: ' + e.operation);
  }
}
export function sourceBounds(e: Expression): Bounds {
  const vertices = sourceVertices(e);
  return { min: [0, 1, 2].map(a => Math.min(...vertices.map(p => p[a]!))) as Point,
    max: [0, 1, 2].map(a => Math.max(...vertices.map(p => p[a]!))) as Point };
}
export function sourceContains(e: Expression, p: Point): boolean {
  const a = e.arguments, parent = () => expression(a[0]);
  switch (e.operation) {
    case 'box': {
      const b = boxBounds(e);
      return p.every((v, i) => v > b.min[i]! + epsilon && v < b.max[i]! - epsilon);
    }
    case 'extrude': return p[2] > epsilon && p[2] < number(a[1]) - epsilon && polygonContains(points(a[0]), p[0], p[1]);
    case 'extrudeLoops': {
      const l = rectangularAnnulus(e);
      return p[2] > epsilon && p[2] < l.depth - epsilon
        && polygonContains(l.loops[0]!, p[0], p[1]) && !polygonContains(l.loops[1]!, p[0], p[1]);
    }
    case 'loft': {
      const l = loft(e);
      if (p[2] <= l.start || p[2] >= l.end) return false;
      const factor = p[2] < l.lower ? (p[2] - l.start) / (l.lower - l.start)
        : p[2] > l.upper ? (l.end - p[2]) / (l.end - l.upper) : 1;
      return polygonContains(l.polygon, p[0] / factor, p[1] / factor);
    }
    case 'translate': return sourceContains(parent(), p.map((v, i) => v - number(a[i + 1])) as Point);
    case 'rotateX': case 'rotateY': return sourceContains(parent(), rotate(p, e.operation, -number(a[1])));
    case 'scale': return sourceContains(parent(), p.map(v => v / number(a[1])) as Point);
    case 'color': return sourceContains(parent(), p);
    case 'subtract': return sourceContains(parent(), p) && !sourceContains(expression(a[1]), p);
    case 'cutout': {
      const c = cutout(e);
      return sourceContains(c.parent, p) && !(polygonContains(c.polygon, p[0], p[1]) && p[2] >= c.bounds.max[2] - c.depth && p[2] <= c.bounds.max[2]);
    }
    default: throw new Error('Unsupported containment expression: ' + e.operation);
  }
}
export function sourceVolume(e: Expression): number {
  const a = e.arguments, parent = () => expression(a[0]);
  switch (e.operation) {
    case 'box': return a.slice(0, 3).map(number).reduce((v, n) => v * n, 1);
    case 'extrude': return area(points(a[0])) * number(a[1]);
    case 'extrudeLoops': {
      const l = rectangularAnnulus(e);
      return (area(l.loops[0]!) - area(l.loops[1]!)) * l.depth;
    }
    case 'loft': {
      const l = loft(e);
      return area(l.polygon) * (l.upper - l.lower + (l.lower - l.start + l.end - l.upper) / 3);
    }
    case 'cutout': {
      const c = cutout(e);
      return sourceVolume(c.parent) - area(c.polygon) * Math.min(c.depth, c.bounds.max[2] - c.bounds.min[2]);
    }
    case 'translate': case 'rotateX': case 'rotateY': case 'color': return sourceVolume(parent());
    case 'scale': return sourceVolume(parent()) * number(a[1]) ** 3;
    default: throw new Error('Unsupported volume expression: ' + e.operation);
  }
}
