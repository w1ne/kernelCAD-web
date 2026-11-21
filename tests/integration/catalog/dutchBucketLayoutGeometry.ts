// SPDX-License-Identifier: MIT
// Actual world-space mesh clearances for this scene prop, not hydraulic certification.
import { TriangleBvh } from '../../../src/modeling/runtime/dfm/meshBvh';
import { containsPoint, type MeshPart, type PartMap } from './fiveConnectionsGeometry';

type Vec = [number, number, number];

function bvh(part: MeshPart) {
  if (!part.triangles.length) throw new Error('Empty clearance mesh');
  const vertices: number[] = [], triangles: number[] = [];
  for (const triangle of part.triangles) for (const point of triangle) {
    if (point.length !== 3 || !point.every(Number.isFinite)) throw new Error('Invalid clearance vertex');
    triangles.push(vertices.length / 3);
    vertices.push(...point);
  }
  const tree = new TriangleBvh({ vertices, triangles });
  if (tree.triangleCount !== part.triangles.length) throw new Error('Degenerate clearance mesh');
  return tree;
}

/** Surface distance alone cannot reject a solid wholly contained in another. */
export function measureDutchClearance(a: MeshPart, b: MeshPart) {
  const nearest = bvh(a).closestPoints(bvh(b));
  if (!nearest || !Number.isFinite(nearest.distance)) throw new Error('Missing finite surface distance');
  const aVertexInsideB = a.triangles.some(triangle => triangle.some(point => containsPoint(b, point)));
  const bVertexInsideA = b.triangles.some(triangle => triangle.some(point => containsPoint(a, point)));
  return {
    surfaceDistanceMm: nearest.distance,
    pointA: nearest.pointA,
    pointB: nearest.pointB,
    aVertexInsideB,
    bVertexInsideA,
    solidsSeparated: nearest.distance > 1e-5 && !aVertexInsideB && !bVertexInsideA,
  };
}

export function inspectDutchLayout(parts: PartMap, scale = 1) {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid clearance scale');
  const failures: string[] = [];
  const clearances: {
    a: string; b: string; scope: 'residual' | 'new-layout'; minimumMm: number;
    measurement: ReturnType<typeof measureDutchClearance> | null;
  }[] = [];
  const check = (a: string, b: string, minimum: number, scope: 'residual' | 'new-layout' = 'residual') => {
    const left = parts.get(a), right = parts.get(b);
    const measurement = left && right ? measureDutchClearance(left, right) : null;
    clearances.push({ a, b, scope, minimumMm: minimum * scale, measurement });
    if (!measurement || !measurement.solidsSeparated
      || measurement.surfaceDistanceMm < (minimum - 0.05) * scale)
      failures.push('clearance: ' + a + ' / ' + b);
  };
  check('drain-pipe', 'post-r', 120);
  check('drain-elbow', 'post-r', 95);
  check('drain-elbow', 'post-foot-r', 25);
  for (let i = 0; i < 6; i++) {
    check('dripper-' + i, 'bucket-' + i, 8.9);
    check('dripper-' + i, 'bucket-rim-' + i, 9.25);
  }
  // Moving the outlet must not introduce a different support or bucket collision.
  check('drain-elbow', 'pipe-saddle-6', 25, 'new-layout');
  check('drain-elbow', 'bucket-5', 30, 'new-layout');

  const contacts: { a: string; b: string; pointMm: Vec; insideA: boolean; insideB: boolean }[] = [];
  const contact = (a: string, b: string, point: Vec) => {
    const pointMm = point.map(value => value * scale) as Vec;
    const insideA = containsPoint(parts.get(a), pointMm), insideB = containsPoint(parts.get(b), pointMm);
    contacts.push({ a, b, pointMm, insideA, insideB });
    if (!insideA || !insideB) failures.push('contact: ' + a + ' / ' + b);
  };
  for (let i = 0; i <= 6; i++)
    contact('pipe-saddle-' + i, 'drain-pipe', [i === 6 ? 1170 : -1260 + 420 * i, 0, 47]);
  contact('drain-elbow', 'drain-pipe', [1240, 0, 70]);
  return { failures, clearances, contacts };
}
