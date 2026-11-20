// SPDX-License-Identifier: MIT
// Measures actual scene meshes. These checks do not certify hydraulic function.
import { containsPoint, readConnectionParts, type MeshPart, type PartMap } from './fiveConnectionsGeometry';
import { inspectDutchLayout } from './dutchBucketLayoutGeometry';

export type DutchCrop = 'tomato' | 'pepper' | 'cucumber';
type Vec = [number, number, number];
export type DutchCase = { id: string; crop: DutchCrop; scale: number };
export const dutchCases: DutchCase[] = [
  { id: 'default', crop: 'tomato', scale: 1 },
  { id: 'pepper', crop: 'pepper', scale: 1 },
  { id: 'cucumber', crop: 'cucumber', scale: 1 },
  { id: 'scale-min', crop: 'tomato', scale: 0.7 },
  { id: 'scale-max', crop: 'cucumber', scale: 1.3 },
  { id: 'default-recovery', crop: 'tomato', scale: 1 },
];
const fruitDimensions: Record<DutchCrop, Vec> = {
  tomato: [84, 84, 75.6], pepper: [75.6, 75.6, 100.8], cucumber: [29.4, 29.4, 134.4],
};
const expectedNames = ['drain-pipe', ...Array.from({ length: 7 }, (_, i) => `pipe-saddle-${i}`),
  'drain-cap', 'drain-elbow', 'drip-line', 'drip-riser', 'drip-filter',
  'post-l', 'post-foot-l', 'post-arm-l', 'post-r', 'post-foot-r', 'post-arm-r', 'trellis-wire'];
for (let i = 0; i < 6; i++) {
  expectedNames.push(`bucket-${i}`, `bucket-rim-${i}`, `perlite-${i}`, `siphon-${i}`,
    `dripper-${i}`, `dripper-head-${i}`, `string-${i}`, `stem-${i}`,
    ...Array.from({ length: 6 }, (_, k) => `leaf-${i}-${k}`), `crown-${i}`);
  for (let tr = 0; tr < 2; tr++) for (let f = 0; f < 3; f++) expectedNames.push(`fruit-${i}-${tr}-${f}`);
}
const near = (actual: number, expected: number, scale: number) => Math.abs(actual - expected) <= 0.05 * scale;
const scaled = (point: Vec, scale: number): Vec => point.map(v => v * scale) as Vec;
const size = (part: MeshPart): Vec => part.max.map((v, i) => v - part.min[i]!) as Vec;

export function inspectDutchBucketParts(parts: PartMap, crop: DutchCrop, scale = 1) {
  const failures: string[] = [];
  const names = [...parts.keys()].sort(), wanted = [...expectedNames].sort();
  const namesMatch = names.length === wanted.length && names.every((name, i) => name === wanted[i]);
  if (!namesMatch) failures.push('the 146 named parts are not preserved');
  const triangleCount = [...parts.values()].reduce((sum, part) => sum + part.triangles.length, 0);
  if (triangleCount <= 0 || triangleCount > 5600) failures.push('mesh exceeds the 5600 triangle budget');
  let zeroAreaTriangles = 0;
  for (const part of parts.values()) for (const [a, b, c] of part.triangles) {
    const u = b.map((v, i) => v - a[i]!) as Vec, v = c.map((x, i) => x - a[i]!) as Vec;
    if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]) <= 1e-8) zeroAreaTriangles++;
  }
  if (zeroAreaTriangles) failures.push('mesh contains zero-area triangles');
  const bounds = { min: [Infinity, Infinity, Infinity] as Vec, max: [-Infinity, -Infinity, -Infinity] as Vec };
  for (const part of parts.values()) for (let axis = 0; axis < 3; axis++) {
    bounds.min[axis] = Math.min(bounds.min[axis]!, part.min[axis]!);
    bounds.max[axis] = Math.max(bounds.max[axis]!, part.max[axis]!);
  }
  if (!near(bounds.min[2], 0, scale) || !near(bounds.max[2], 2150 * scale, scale)
    || !near(bounds.min[0], -1500 * scale, scale) || !near(bounds.max[0], 1500 * scale, scale))
    failures.push('frame dimensions or ground origin changed');
  const witnesses: { label: string; a: string; b: string; pointMm: Vec; insideA: boolean; insideB: boolean }[] = [];
  const contact = (label: string, a: string, b: string, point: Vec) => {
    const pointMm = scaled(point, scale), insideA = containsPoint(parts.get(a), pointMm), insideB = containsPoint(parts.get(b), pointMm);
    witnesses.push({ label, a, b, pointMm, insideA, insideB });
    if (!insideA || !insideB) failures.push(label);
  };
  const drain = parts.get('drain-pipe');
  if (!drain || size(drain).some((value, axis) => !near(value, [2550, 50, 50][axis]! * scale, scale)))
    failures.push('drain does not have the authored 50 mm diameter');
  let openBuckets = 0, materialWalls = 0, matchedFruits = 0;
  for (let i = 0; i < 6; i++) {
    const x = -1050 + 420 * i, name = `bucket-${i}`, bucket = parts.get(name);
    contact(`${name} is not seated on drain`, name, 'drain-pipe', [x, 0, 94]);
    contact(`siphon-${i} does not enter drain`, `siphon-${i}`, 'drain-pipe', [x + 90, 0, 80]);
    contact(`siphon-${i} does not enter bucket floor`, `siphon-${i}`, name, [x + 90, 0, 99]);
    if (bucket && !containsPoint(bucket, scaled([x, 0, 388], scale))) openBuckets++;
    if (containsPoint(bucket, scaled([x + 152, 0, 343], scale))) materialWalls++;
    if (!bucket || !near(bucket.min[2], 93 * scale, scale) || !near(bucket.max[2], 393 * scale, scale))
      failures.push(`${name} floor or height changed`);
    for (let tr = 0; tr < 2; tr++) for (let f = 0; f < 3; f++) {
      const fruit = parts.get(`fruit-${i}-${tr}-${f}`);
      if (!fruit) continue;
      const centre = fruit.max.map((v, axis) => (v + fruit.min[axis]!) / 2) as Vec;
      const expectedCentre: Vec = [x + 10 + (f - 1) * 55, -110 - (f % 2) * 30,
        693 + tr * 520 + (i % 2) * 80 - f * 40];
      if (size(fruit).every((value, axis) => near(value, fruitDimensions[crop][axis]! * scale, scale))
        && centre.every((value, axis) => near(value, expectedCentre[axis]! * scale, scale))) matchedFruits++;
    }
  }
  if (openBuckets !== 6 || materialWalls !== 6) failures.push('bucket cavities or material walls are missing');
  if (matchedFruits !== 36) failures.push('fruit geometry does not match the selected crop');
  const layout = inspectDutchLayout(parts, scale);
  failures.push(...layout.failures);
  return { failures, crop, scale, partCount: parts.size, namesMatch, triangleCount, zeroAreaTriangles,
    openBuckets, materialWalls, matchedFruits, boundsMm: bounds, witnesses, layout };
}

export async function inspectDutchBucketGlb(bytes: Uint8Array, crop: DutchCrop, scale = 1) {
  return inspectDutchBucketParts(await readConnectionParts(bytes), crop, scale);
}

/** Offline negative verifier control. The delivered model and GLB are untouched. */
export function moveDutchPart(parts: PartMap, name: string, delta: Vec): PartMap {
  const original = parts.get(name);
  if (!original) throw new Error('Negative control part missing: ' + name);
  const move = (point: Vec): Vec => point.map((v, axis) => v + delta[axis]!) as Vec;
  const copy: PartMap = new Map(parts);
  copy.set(name, { min: move(original.min), max: move(original.max),
    triangles: original.triangles.map(triangle => triangle.map(move) as [Vec, Vec, Vec]) });
  return copy;
}
