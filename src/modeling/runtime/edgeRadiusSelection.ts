// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { EDGE_QUERY_KEYS, FACE_QUERY_KEYS } from '../../shared/intent/queryKeys';
const numericKeys = ['atX','atY','atZ','tolerance','angleTolerance','minAngle','maxAngle','minArea','maxArea'];
const vectorKeys = ['near','parallel','perpendicular','containsPoint'];
const enums: Record<string, readonly string[]> = {
  ofCurveType: ['LINE','CIRCLE','BSPLINE'], ofSurfaceType: ['PLANE','CYLINDER','SPHERE','CONE','TORUS','BSPLINE'],
  byNormal: ['X','-X','Y','-Y','Z','-Z'], inPlane: ['XY','YZ','XZ'],
};
function finiteVector(v: unknown): boolean {
  return Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n));
}
function validRegion(v: unknown): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const region = v as Record<string,unknown>;
  if (!Object.entries(region).every(([k,n]) => ['xMin','xMax','yMin','yMax','zMin','zMax'].includes(k) && typeof n === 'number' && Number.isFinite(n))) return false;
  return ['x','y','z'].every(axis => region[`${axis}Min`] === undefined || region[`${axis}Max`] === undefined || Number(region[`${axis}Min`]) <= Number(region[`${axis}Max`]));
}
function validNumeric(key: string, v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && (key.startsWith('at') || v >= 0);
}
function validDirection(v: unknown): boolean {
  return finiteVector(v) && Math.hypot(...v as number[]) > 0;
}
function validVector(key: string, v: unknown): boolean {
  return ['parallel','perpendicular'].includes(key) ? validDirection(v) : finiteVector(v);
}
function validValue(key: string, v: unknown): boolean {
  if (numericKeys.includes(key)) return validNumeric(key,v);
  if (vectorKeys.includes(key)) return validVector(key,v);
  if (key === 'parallelTo') return ['XY','YZ','XZ'].includes(v as string) || validDirection(v);
  if (key === 'within' || key === 'boundingBoxIn') return validRegion(v);
  if (key === 'convex' || key === 'concave') return typeof v === 'boolean';
  return enums[key]?.includes(v as string) ?? false;
}
function validateRefs(value: string | unknown[], name: string): void {
  const refs = typeof value === 'string' ? [value] : value;
  if (refs.some(v => typeof v !== 'string' || !v)) throw new Error(`${name} must contain nonempty topology refs.`);
}
function validateQueryRanges(q: Record<string,number>, name: string): void {
  for (const [min,max] of [['minAngle','maxAngle'],['minArea','maxArea']]) {
    if (q[min] !== undefined && q[max] !== undefined && q[min] > q[max]) throw new Error(`${name}.${min} must not exceed ${max}.`);
  }
}
/** A verification gate must reject misspelled/malformed scope, never broaden it. */
export function validateEdgeRadiusFilter(value: unknown, name: 'edges' | 'faces'): void {
  if (value === undefined) return;
  if (typeof value === 'string' || Array.isArray(value)) return validateRefs(value,name);
  if (!value || typeof value !== 'object') throw new Error(`${name} must be a query or topology ref(s).`);
  const keys: readonly string[] = name === 'edges' ? EDGE_QUERY_KEYS : FACE_QUERY_KEYS;
  for (const [key,v] of Object.entries(value)) {
    if (!keys.includes(key) || !validValue(key,v)) throw new Error(`Invalid ${name} query field: ${key}.`);
  }
  validateQueryRanges(value as Record<string,number>,name);
}
