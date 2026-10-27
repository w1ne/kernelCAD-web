// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Replay the transforms `applyTransforms` runs after a hole is cut, so a
// hole-axis mouth tracks rotate / scale / reflect / translate. The walk is
// the hole feature, then each later feature up to the shape being resolved.
// Part `at` is not one of these transforms.

import type { FeatureRecord, ShapeTransform } from '../../../shared/intent/featureRecord';
import type { PlaneSpec, Vec3 } from '../../../shared/intent/types';
import { isValidPlaneSpec } from '../../../shared/intent/types';
import type { ParamTable } from '../../../shared/runtime/paramTable';
import { resolveParams } from '../../../shared/runtime/resolveParams';

type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Hole feature first, then each feature that carried it up to `consumerId`. */
export function transformsAfterCut(
  records: readonly FeatureRecord[],
  holeId: string,
  consumerId: string | undefined,
  paramTable: ParamTable | undefined,
): ShapeTransform[] {
  const path = pathFromHoleToConsumer(records, holeId, consumerId ?? holeId);
  const transforms = path.flatMap((record) => record.transforms);
  if (paramTable === undefined) return transforms;
  return transforms.map((transform) => resolveParams(transform, paramTable));
}

export function forwardPoint(point: Vec3, transforms: readonly ShapeTransform[]): Vec3 {
  return transforms.reduce(applyPoint, point);
}

export function inversePoint(point: Vec3, transforms: readonly ShapeTransform[]): Vec3 {
  return [...transforms].reverse().reduce(applyPointInverse, point);
}

/** Recover the pre-transform normal. Normals use the inverse-transpose. */
export function inverseNormal(normal: Vec3, transforms: readonly ShapeTransform[]): Vec3 {
  return [...transforms].reverse().reduce(
    (current, transform) => mul(transpose(linearOf(transform)), current),
    normal,
  );
}

/** Free vector (an authored axis or UV offset), scaled and rotated. */
export function forwardVector(vector: Vec3, transforms: readonly ShapeTransform[]): Vec3 {
  return transforms.reduce((current, transform) => mul(linearOf(transform), current), vector);
}

function pathFromHoleToConsumer(
  records: readonly FeatureRecord[],
  holeId: string,
  consumerId: string,
): FeatureRecord[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const hole = byId.get(holeId);
  if (hole === undefined) return [];
  if (holeId === consumerId) return [hole];
  const cameFrom = parentsToward(byId, consumerId, holeId);
  if (cameFrom === undefined) return [hole];
  return recordsAlong(byId, cameFrom, holeId, consumerId);
}

/** Map each visited feature to the feature that referenced it, walking inputs from the consumer. */
function parentsToward(
  byId: ReadonlyMap<string, FeatureRecord>,
  consumerId: string,
  holeId: string,
): Map<string, string> | undefined {
  const cameFrom = new Map<string, string>();
  const seen = new Set<string>([consumerId]);
  const queue = [consumerId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || current === holeId) break;
    const inputs = byId.get(current)?.inputs;
    if (inputs === undefined) continue;
    for (const ref of Object.values(inputs)) {
      if (ref.kind !== 'feature' || seen.has(ref.id)) continue;
      seen.add(ref.id);
      cameFrom.set(ref.id, current);
      queue.push(ref.id);
    }
  }
  return cameFrom.has(holeId) || holeId === consumerId ? cameFrom : undefined;
}

function recordsAlong(
  byId: ReadonlyMap<string, FeatureRecord>,
  cameFrom: ReadonlyMap<string, string>,
  holeId: string,
  consumerId: string,
): FeatureRecord[] {
  const path: FeatureRecord[] = [];
  let cursor: string | undefined = holeId;
  while (cursor !== undefined) {
    const record = byId.get(cursor);
    if (record !== undefined) path.push(record);
    if (cursor === consumerId) break;
    cursor = cameFrom.get(cursor);
  }
  return path;
}

function applyPoint(point: Vec3, transform: ShapeTransform): Vec3 {
  switch (transform.op) {
    case 'translate':
      return add(point, readVec(transform.vec));
    case 'rotateAxis':
      return rotateAround(point, readVec(transform.axis), transform.degrees.evaluated, pivotOf(transform));
    case 'scale':
      return [point[0] * transform.sx, point[1] * transform.sy, point[2] * transform.sz];
    case 'reflect':
      return reflectPoint(point, transform.plane);
    default:
      return point;
  }
}

function applyPointInverse(point: Vec3, transform: ShapeTransform): Vec3 {
  switch (transform.op) {
    case 'translate':
      return add(point, scale(readVec(transform.vec), -1));
    case 'rotateAxis':
      return rotateAround(point, readVec(transform.axis), -transform.degrees.evaluated, pivotOf(transform));
    case 'scale':
      return [
        point[0] / transform.sx,
        point[1] / transform.sy,
        point[2] / transform.sz,
      ];
    case 'reflect':
      return reflectPoint(point, transform.plane);
    default:
      return point;
  }
}

function linearOf(transform: ShapeTransform): Mat3 {
  switch (transform.op) {
    case 'translate':
      return IDENTITY;
    case 'rotateAxis':
      return rotationMatrix(readVec(transform.axis), transform.degrees.evaluated);
    case 'scale':
      return [transform.sx, 0, 0, 0, transform.sy, 0, 0, 0, transform.sz];
    case 'reflect':
      return reflectLinear(transform.plane);
    default:
      return IDENTITY;
  }
}

function pivotOf(transform: Extract<ShapeTransform, { op: 'rotateAxis' }>): Vec3 {
  return transform.pivot === undefined ? [0, 0, 0] : readVec(transform.pivot);
}

function readVec(vec: { x: { evaluated: number }; y: { evaluated: number }; z: { evaluated: number } }): Vec3 {
  return [vec.x.evaluated, vec.y.evaluated, vec.z.evaluated];
}

function reflectPoint(point: Vec3, plane: PlaneSpec): Vec3 {
  if (!isValidPlaneSpec(plane)) return point;
  const { axis, offset } = reflectAxes(plane);
  const out: Vec3 = [point[0], point[1], point[2]];
  out[axis] = 2 * offset - point[axis];
  return out;
}

function reflectLinear(plane: PlaneSpec): Mat3 {
  if (!isValidPlaneSpec(plane)) return IDENTITY;
  const diag: [number, number, number] = [1, 1, 1];
  diag[reflectAxes(plane).axis] = -1;
  return [diag[0], 0, 0, 0, diag[1], 0, 0, 0, diag[2]];
}

function reflectAxes(plane: PlaneSpec): { axis: 0 | 1 | 2; offset: number } {
  const spec = typeof plane === 'string' ? { plane, offset: 0 } : plane;
  const offset = spec.offset ?? 0;
  if (spec.plane === 'yz') return { axis: 0, offset };
  if (spec.plane === 'xz') return { axis: 1, offset };
  return { axis: 2, offset };
}

function rotationMatrix(axis: Vec3, degrees: number): Mat3 {
  const k = normalize(axis);
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const oneC = 1 - c;
  const [x, y, z] = k;
  return [
    c + x * x * oneC, x * y * oneC - z * s, x * z * oneC + y * s,
    y * x * oneC + z * s, c + y * y * oneC, y * z * oneC - x * s,
    z * x * oneC - y * s, z * y * oneC + x * s, c + z * z * oneC,
  ];
}

function rotateAround(point: Vec3, axis: Vec3, degrees: number, pivot: Vec3): Vec3 {
  const shifted: Vec3 = [point[0] - pivot[0], point[1] - pivot[1], point[2] - pivot[2]];
  const rotated = mul(rotationMatrix(axis, degrees), shifted);
  return [rotated[0] + pivot[0], rotated[1] + pivot[1], rotated[2] + pivot[2]];
}

function transpose(matrix: Mat3): Mat3 {
  return [
    matrix[0], matrix[3], matrix[6],
    matrix[1], matrix[4], matrix[7],
    matrix[2], matrix[5], matrix[8],
  ];
}

function mul(matrix: Mat3, vector: Vec3): Vec3 {
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2],
  ];
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (vector: Vec3, factor: number): Vec3 => [vector[0] * factor, vector[1] * factor, vector[2] * factor];

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  return length < 1e-12 ? [0, 0, 1] : scale(vector, 1 / length);
}
