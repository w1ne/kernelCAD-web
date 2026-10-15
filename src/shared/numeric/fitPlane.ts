// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export type Point3 = readonly [number, number, number];

export interface PlaneFit {
  centroid: [number, number, number];
  /** Unit normal; its sign is deterministic but geometrically equivalent to its negation. */
  normal: [number, number, number];
  /** Signed orthogonal distances in input order. */
  residuals: number[];
  rms: number;
  maxAbsResidual: number;
}

type Matrix3 = number[][];
type Vector3 = [number, number, number];

function validatePoints(points: readonly Point3[]): void {
  if (points.length < 3) throw new Error('At least three points are required.');
  if (points.length > 100000) throw new Error('At most 100000 points can be fit at once.');
  for (const point of points) {
    if (point.length !== 3 || point.some(value => !Number.isFinite(value))) {
      throw new Error('Every point must contain three finite coordinates.');
    }
  }
}

function normalizeCloud(points: readonly Point3[]): { origin: Vector3; scale: number; normalized: Vector3[]; center: Vector3 } {
  const origin: Vector3 = [...points[0]];
  const offsets = points.map(point => point.map((value, axis) => value - origin[axis]) as Vector3);
  if (offsets.some(point => point.some(value => !Number.isFinite(value)))) {
    throw new Error('Point coordinate differences exceed the finite numeric range.');
  }
  let scale = 0;
  for (const point of offsets) for (const value of point) scale = Math.max(scale, Math.abs(value));
  if (scale === 0) throw new Error('Points are collinear or coincident; a unique plane cannot be fit.');
  const normalized = offsets.map(point => point.map(value => value / scale) as Vector3);
  const center: Vector3 = [0, 0, 0];
  for (const point of normalized) for (let axis = 0; axis < 3; axis++) center[axis] += point[axis] / points.length;
  return { origin, scale, normalized, center };
}

function covariance(points: readonly Vector3[], center: Vector3): Matrix3 {
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (const point of points) {
    const delta = point.map((value, axis) => value - center[axis]);
    for (let row = 0; row < 3; row++) for (let col = row; col < 3; col++) matrix[row][col] += delta[row] * delta[col];
  }
  for (let row = 0; row < 3; row++) for (let col = row + 1; col < 3; col++) matrix[col][row] = matrix[row][col];
  return matrix;
}

function rotateJacobi(matrix: Matrix3, vectors: Matrix3, p: number, q: number): void {
  const theta = 0.5 * Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]);
  const c = Math.cos(theta), s = Math.sin(theta);
  const app = c * c * matrix[p][p] - 2 * s * c * matrix[p][q] + s * s * matrix[q][q];
  const aqq = s * s * matrix[p][p] + 2 * s * c * matrix[p][q] + c * c * matrix[q][q];
  for (let k = 0; k < 3; k++) if (k !== p && k !== q) {
    const akp = matrix[k][p], akq = matrix[k][q];
    matrix[k][p] = matrix[p][k] = c * akp - s * akq;
    matrix[k][q] = matrix[q][k] = s * akp + c * akq;
  }
  matrix[p][p] = app; matrix[q][q] = aqq; matrix[p][q] = matrix[q][p] = 0;
  for (let k = 0; k < 3; k++) {
    const vkp = vectors[k][p], vkq = vectors[k][q];
    vectors[k][p] = c * vkp - s * vkq;
    vectors[k][q] = s * vkp + c * vkq;
  }
}

function leastEigenvector(matrix: Matrix3): Vector3 {
  const vectors: Matrix3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let iter = 0; iter < 32; iter++) {
    let p = 0, q = 1;
    if (Math.abs(matrix[0][2]) > Math.abs(matrix[p][q])) [p, q] = [0, 2];
    if (Math.abs(matrix[1][2]) > Math.abs(matrix[p][q])) [p, q] = [1, 2];
    const diagonalScale = Math.abs(matrix[0][0]) + Math.abs(matrix[1][1]) + Math.abs(matrix[2][2]);
    if (Math.abs(matrix[p][q]) <= Number.EPSILON * diagonalScale * 8) break;
    rotateJacobi(matrix, vectors, p, q);
  }
  const order = [0, 1, 2].sort((i, j) => matrix[i][i] - matrix[j][j]);
  if (matrix[order[2]][order[2]] === 0 || matrix[order[1]][order[1]] <= Number.EPSILON * matrix[order[2]][order[2]] * 8) {
    throw new Error('Points are collinear or coincident; a unique plane cannot be fit.');
  }
  return [vectors[0][order[0]], vectors[1][order[0]], vectors[2][order[0]]];
}

function canonicalUnit(vector: Vector3): Vector3 {
  const length = Math.hypot(...vector);
  const unit = vector.map(value => value / length) as Vector3;
  const dominant = unit.reduce((best, value, axis) => Math.abs(value) > Math.abs(unit[best]) ? axis : best, 0);
  return unit[dominant] < 0 ? unit.map(value => -value) as Vector3 : unit;
}

function residualSummary(points: readonly Vector3[], center: Vector3, scale: number, normal: Vector3): Pick<PlaneFit, 'residuals' | 'rms' | 'maxAbsResidual'> {
  const normalizedResiduals = points.map(point =>
    (point[0] - center[0]) * normal[0] + (point[1] - center[1]) * normal[1] + (point[2] - center[2]) * normal[2],
  );
  const normalizedRms = Math.sqrt(normalizedResiduals.reduce((sum, residual) => sum + residual * residual, 0) / normalizedResiduals.length);
  const residuals = normalizedResiduals.map(residual => residual * scale);
  const rms = normalizedRms * scale;
  const maxAbsResidual = residuals.reduce((max, residual) => Math.max(max, Math.abs(residual)), 0);
  if (residuals.some(residual => !Number.isFinite(residual)) || !Number.isFinite(rms) || !Number.isFinite(maxAbsResidual)) {
    throw new Error('Plane residuals exceed the finite numeric range.');
  }
  return {
    residuals,
    rms,
    maxAbsResidual,
  };
}

/** Orthogonal least-squares plane fit using the least-eigenvalue covariance axis. */
export function fitPlane(points: readonly Point3[]): PlaneFit {
  validatePoints(points);
  const cloud = normalizeCloud(points);
  const centroid = cloud.center.map((value, axis) => cloud.origin[axis] + value * cloud.scale) as Vector3;
  const normal = canonicalUnit(leastEigenvector(covariance(cloud.normalized, cloud.center)));
  return { centroid, normal, ...residualSummary(cloud.normalized, cloud.center, cloud.scale, normal) };
}
