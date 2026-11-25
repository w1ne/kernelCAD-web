// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { Vec3 } from '../../shared/intent/types';
import type { KernelCadApi } from '../api';
import type { Shape } from '../capture/proxy';
import {
  assertAllowedKeys,
  assertNonZeroVec3,
  assertVec3,
  frameTransform,
  isFiniteNumber,
  VEC_EPS,
  vecCross,
  vecDot,
  vecLen,
  vecNormalize,
} from './math';
import type { GussetOptions } from './types';

const API_NAME = 'gusset';
const FEATURE_ID = 'gusset';
const GUSSET_EXAMPLE =
  'gusset([0, 0, 0], [1, 0, 0], [0, 1, 0], { legA: 60, legB: 60, thickness: 8, cornerRelief: 5 })';

const GUSSET_OPT_KEYS = new Set([
  'legA',
  'legB',
  'thickness',
  'cornerRelief',
  'tipChamfer',
  'offset',
]);

function assertPositive(value: unknown, path: string): number {
  if (!isFiniteNumber(value) || value <= 0) {
    invalidArgs({
      api: API_NAME,
      path,
      got: value,
      showType: typeof value !== 'number',
      requires: 'a finite positive number (> 0)',
      unit: 'mm',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return value;
}

function assertNonNegative(value: unknown, path: string): number {
  if (!isFiniteNumber(value) || value < 0) {
    invalidArgs({
      api: API_NAME,
      path,
      got: value,
      showType: typeof value !== 'number',
      requires: 'a finite non-negative number (>= 0)',
      unit: 'mm',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return value;
}

function validateGussetOptions(opts: GussetOptions): {
  legA: number;
  legB: number;
  thickness: number;
  cornerRelief: number;
  tipChamfer: number;
  offset: number;
} {
  if (typeof opts !== 'object' || opts === null || Array.isArray(opts)) {
    invalidArgs({
      api: API_NAME,
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { legA, legB, thickness, cornerRelief?, tipChamfer?, offset? }',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  assertAllowedKeys(opts as unknown as Record<string, unknown>, GUSSET_OPT_KEYS, {
    api: API_NAME, prefix: 'opts', example: GUSSET_EXAMPLE, featureId: FEATURE_ID,
  });

  const legA = assertPositive(opts.legA, 'opts.legA');
  const legB = assertPositive(opts.legB, 'opts.legB');
  const thickness = assertPositive(opts.thickness, 'opts.thickness');
  const cornerRelief = opts.cornerRelief === undefined ? 0 : assertNonNegative(opts.cornerRelief, 'opts.cornerRelief');
  const tipChamfer = opts.tipChamfer === undefined ? 0 : assertNonNegative(opts.tipChamfer, 'opts.tipChamfer');
  const offset = opts.offset === undefined ? 0 : opts.offset;
  if (!isFiniteNumber(offset)) {
    invalidArgs({
      api: API_NAME,
      path: 'opts.offset',
      got: opts.offset,
      showType: true,
      requires: 'a finite number',
      unit: 'mm',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  if (!(cornerRelief + tipChamfer < legA)) {
    invalidArgs({
      api: API_NAME,
      path: cornerRelief > 0 ? 'opts.cornerRelief' : 'opts.tipChamfer',
      got: cornerRelief + tipChamfer,
      requires: `cornerRelief + tipChamfer < legA (${legA} mm)`,
      unit: 'mm',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  if (!(cornerRelief + tipChamfer < legB)) {
    invalidArgs({
      api: API_NAME,
      path: cornerRelief > 0 ? 'opts.cornerRelief' : 'opts.tipChamfer',
      got: cornerRelief + tipChamfer,
      requires: `cornerRelief + tipChamfer < legB (${legB} mm)`,
      unit: 'mm',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  if (tipChamfer > 0 && !(tipChamfer / legA + tipChamfer / legB < 1)) {
    invalidArgs({
      api: API_NAME,
      path: 'opts.tipChamfer',
      got: tipChamfer,
      requires: `tipChamfer / legA + tipChamfer / legB < 1 (max ${(legA * legB) / (legA + legB)} mm)`,
      unit: 'mm',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  return { legA, legB, thickness, cornerRelief, tipChamfer, offset };
}

function buildGussetPolygon(
  legA: number,
  legB: number,
  cosTheta: number,
  sinTheta: number,
  cornerRelief: number,
  tipChamfer: number,
): [number, number][] {
  const ax = legA;
  const ay = 0;
  const bx = legB * cosTheta;
  const by = legB * sinTheta;
  const pts: [number, number][] = [];

  if (cornerRelief > 0) {
    pts.push([cornerRelief, 0]);
  } else {
    pts.push([0, 0]);
  }

  if (tipChamfer > 0) {
    const tA = tipChamfer / legA;
    pts.push([legA - tipChamfer, 0]);
    pts.push([(1 - tA) * ax + tA * bx, (1 - tA) * ay + tA * by]);

    const tB = tipChamfer / legB;
    pts.push([tB * ax + (1 - tB) * bx, tB * ay + (1 - tB) * by]);
    pts.push([(legB - tipChamfer) * cosTheta, (legB - tipChamfer) * sinTheta]);
  } else {
    pts.push([ax, ay]);
    pts.push([bx, by]);
  }

  if (cornerRelief > 0) {
    pts.push([cornerRelief * cosTheta, cornerRelief * sinTheta]);
  }
  return pts;
}

export function buildGusset(
  api: KernelCadApi,
  corner: Vec3,
  dirA: Vec3,
  dirB: Vec3,
  opts: GussetOptions,
): Shape {
  const origin = assertVec3(corner, {
    api: API_NAME, path: 'corner', example: GUSSET_EXAMPLE, featureId: FEATURE_ID,
  });
  const aVec = assertNonZeroVec3(dirA, {
    api: API_NAME, path: 'dirA', example: GUSSET_EXAMPLE, featureId: FEATURE_ID,
  });
  const bVec = assertNonZeroVec3(dirB, {
    api: API_NAME, path: 'dirB', example: GUSSET_EXAMPLE, featureId: FEATURE_ID,
  });
  const u = vecNormalize(aVec);
  const bUnit = vecNormalize(bVec);
  const nRaw = vecCross(u, bUnit);
  if (vecLen(nRaw) <= VEC_EPS) {
    invalidArgs({
      api: API_NAME,
      path: 'dirB',
      got: bVec,
      requires: 'dirA and dirB to be non-collinear 3D vectors',
      example: GUSSET_EXAMPLE,
      featureId: FEATURE_ID,
    });
  }
  const n = vecNormalize(nRaw);
  const v = vecCross(n, u);
  const cosTheta = vecDot(bUnit, u);
  const sinTheta = vecDot(bUnit, v);

  const { legA, legB, thickness, cornerRelief, tipChamfer, offset } = validateGussetOptions(opts);
  const polygon = buildGussetPolygon(legA, legB, cosTheta, sinTheta, cornerRelief, tipChamfer);
  const localSolid = api.extrudePolygon(polygon, thickness).translate(0, 0, -thickness / 2 + offset);
  return localSolid.transform(frameTransform(origin, { u, v, w: n }));
}
