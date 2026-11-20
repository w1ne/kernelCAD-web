// SPDX-License-Identifier: MIT
// Checks the exported scene mesh. No instrument accuracy or manufacturing claim.
import { NodeIO } from '@gltf-transform/core';

type V = [number, number, number];
type Triangle = [V, V, V];
export type Reading = 'acidic' | 'neutral' | 'alkaline';
const digits: Record<Reading, [number, number]> = { acidic: [5, 8], neutral: [6, 9], alkaline: [8, 4] };
// Conventional seven-segment order: top, upper right, lower right, bottom,
// lower left, upper left, middle. Tests sample actual projected triangles.
const masks: Record<number, string> = { 4: '0110011', 5: '1011011', 6: '1011111', 8: '1111111', 9: '1111011' };
const samples: [number, number][] = [[0, 135.5], [6, 128], [6, 113], [0, 105.5], [-6, 113], [-6, 128], [0, 120.5]];
const radians = Math.PI / 12;
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

async function meshParts(bytes: Uint8Array, scale: number): Promise<Map<string, Triangle[]>> {
  const document = await new NodeIO().readBinary(bytes);
  const result = new Map<string, Triangle[]>();
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    const triangles = result.get(node.getName()) ?? [];
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      if (!positions) continue;
      const indices = primitive.getIndices();
      const count = indices?.getCount() ?? positions.getCount();
      const point = (i: number): V => {
        const v = positions.getElement(indices?.getScalar(i) ?? i, []);
        const world = [0, 1, 2].map(axis => 1000 / scale *
          (matrix[axis]! * v[0]! + matrix[axis + 4]! * v[1]! + matrix[axis + 8]! * v[2]! + matrix[axis + 12]!));
        return [world[0]!, -world[2]!, world[1]!];
      };
      for (let i = 0; i < count; i += 3) triangles.push([point(i), point(i + 1), point(i + 2)]);
    }
    result.set(node.getName(), triangles);
  }
  return result;
}

function frontProjectionContains(triangles: Triangle[], x: number, z: number): boolean {
  return triangles.some(([a, b, c]) => {
    const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-10) return false;
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
    const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
    return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
  });
}

function containsPoint(triangles: Triangle[], point: V): boolean {
  const direction: V = [1, 0.371, 0.217];
  const distances: number[] = [];
  for (const [a, b, c] of triangles) {
    const e1 = sub(b, a), e2 = sub(c, a), h = cross(direction, e2);
    const det = dot(e1, h);
    if (Math.abs(det) < 1e-10) continue;
    const s = sub(point, a), u = dot(s, h) / det;
    if (u < -1e-7 || u > 1 + 1e-7) continue;
    const q = cross(s, e1), v = dot(direction, q) / det;
    if (v < -1e-7 || u + v > 1 + 1e-7) continue;
    const t = dot(e2, q) / det;
    if (t > 1e-6 && !distances.some(x => Math.abs(x - t) < 1e-5)) distances.push(t);
  }
  return distances.length % 2 === 1;
}

function centre(triangles: Triangle[]): V {
  const unique = new Map<string, V>();
  for (const point of triangles.flat()) unique.set(point.map(x => x.toFixed(5)).join(','), point);
  const points = [...unique.values()];
  return [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis]!, 0) / points.length) as V;
}

export async function inspectPhMeterGlb(bytes: Uint8Array, reading: Reading, scale = 1) {
  const parts = await meshParts(bytes, scale);
  const failures: string[] = [];
  const observedMasks = [0, 1].map(index => {
    const triangles = [...parts].filter(([name]) => name.startsWith(`digit-${index}-`))
      .flatMap(([, value]) => value).map(triangle => triangle.map(([x, y, z]): V =>
        [x + 60, Math.cos(radians) * y - Math.sin(radians) * (z - 10),
          Math.sin(radians) * y + Math.cos(radians) * (z - 10)]) as Triangle);
    return samples.map(([dx, z]) => frontProjectionContains(triangles, -14 + 24 * index + dx, z) ? '1' : '0').join('');
  });
  const expectedMasks = digits[reading].map(value => masks[value]);
  if (observedMasks.some((value, i) => value !== expectedMasks[i])) failures.push('display does not show the selected reading');
  const coilParts = [...parts].filter(([name]) => /^cable-\d+$/.test(name))
    .sort(([a], [b]) => Number(a.slice(6)) - Number(b.slice(6)));
  const completeSequence = coilParts.length === 72
    && coilParts.every(([name], index) => name === `cable-${index}`);
  if (!completeSequence) failures.push('cable segment sequence is incomplete');
  const coil = coilParts.map(([, triangles]) => centre(triangles));
  const finiteGeometry = coil.length > 0 && coil.every(point => point.every(Number.isFinite));
  if (!finiteGeometry) failures.push('cable mesh contains missing or nonfinite geometry');
  const start: V = [-38, Math.sin(radians) * 185, 10 + Math.cos(radians) * 185];
  const end: V = [80, -10, 212];
  const phases: number[] = [], radii: number[] = [];
  for (const [x, y, z] of coil) {
    const u = (x - start[0]) / (end[0] - start[0]);
    const dy = y - (start[1] + (end[1] - start[1]) * u);
    const dz = z - (start[2] + (end[2] - start[2]) * u + Math.sin(Math.PI * u) * 60);
    phases.push(Math.atan2(dy, dz)); radii.push(Math.hypot(dy, dz));
  }
  let winding = 0;
  for (let i = 1; i < phases.length; i++) {
    const delta = phases[i]! - phases[i - 1]!;
    winding += Math.atan2(Math.sin(delta), Math.cos(delta));
  }
  const turns = finiteGeometry ? Math.abs(winding / (2 * Math.PI)) : null;
  const minimumCoilRadiusMm = finiteGeometry ? Math.min(...radii) : null;
  const maximumCoilRadiusMm = finiteGeometry ? Math.max(...radii) : null;
  if (turns === null || !Number.isFinite(turns) || turns < 8.5 || turns > 9.3
    || minimumCoilRadiusMm === null || !Number.isFinite(minimumCoilRadiusMm) || minimumCoilRadiusMm < 4.5
    || maximumCoilRadiusMm === null || !Number.isFinite(maximumCoilRadiusMm) || maximumCoilRadiusMm > 6.5)
    failures.push('cable does not retain nine resolved turns');
  // A point just inside the angle bisector must lie in both neighbouring
  // exported tubes. This detects an interior gap even when all names remain.
  const pathPoint = (index: number): V => {
    const u = index / 72, phase = u * 18 * Math.PI;
    return [start[0] + (end[0] - start[0]) * u,
      start[1] + (end[1] - start[1]) * u + 6 * Math.sin(phase),
      start[2] + (end[2] - start[2]) * u + 60 * Math.sin(Math.PI * u) + 6 * Math.cos(phase)];
  };
  const unit = (v: V): V => v.map(value => value / Math.hypot(...v)) as V;
  let connectedInteriorJoints = 0;
  if (completeSequence && finiteGeometry) {
    for (let index = 1; index < 72; index++) {
      const at = pathPoint(index), before = unit(sub(at, pathPoint(index - 1)));
      const after = unit(sub(pathPoint(index + 1), at));
      const witness = at.map((value, axis) => value + 0.4 * (after[axis]! - before[axis]!)) as V;
      if (containsPoint(coilParts[index - 1]![1], witness) && containsPoint(coilParts[index]![1], witness)) connectedInteriorJoints++;
    }
    if (connectedInteriorJoints !== 71) failures.push('cable has an interior connection gap');
  }
  const glandContact: V = [start[0], start[1], start[2] + 0.25];
  const probeContact: V = [80, -10, 213];
  const inletConnected = containsPoint(parts.get('cable-inlet') ?? [], glandContact)
    && containsPoint(parts.get('cable-gland') ?? [], glandContact);
  const outletConnected = containsPoint(parts.get('cable-outlet') ?? [], probeContact)
    && containsPoint(parts.get('probe-cap') ?? [], probeContact);
  if (!inletConnected || !outletConnected) failures.push('cable does not connect to both end fittings');
  return { failures, reading, scale, observedMasks, expectedMasks, coilSegments: coil.length,
    measuredTurnsBetweenSegmentCentres: turns, minimumCoilRadiusMm, maximumCoilRadiusMm,
    inletConnected, outletConnected, completeSequence, finiteGeometry, connectedInteriorJoints, partCount: parts.size };
}
