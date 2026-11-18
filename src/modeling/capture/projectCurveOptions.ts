// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time key check for `Shape.projectCurve(opts)`. A misspelt key
// (`scale`, `edge`) used to be dropped and the curve projected with the
// default; a `curve` key in place of `source` failed with a raw TypeError.
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';

const PROJECT_CURVE_OPTION_KEYS: ReadonlySet<string> = new Set([
  'source', 'face', 'scaleMode', 'asEdge', 'sourcePlane', 'direction',
]);

const PROJECT_CURVE_API = 'projectCurve(opts)';
const PROJECT_CURVE_EXAMPLE =
  "body.projectCurve({ source: { kind: 'sketchCommands', commands }, face: 'top', asEdge: true, sourcePlane: { origin: [0, 0, 50], normal: [0, 0, 1], xAxis: [1, 0, 0] }, direction: [0, 0, -1] })";

export function assertProjectCurveOptions(opts: unknown, featureId: FeatureId): void {
  if (opts === null || typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: PROJECT_CURVE_API,
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object { source, face, scaleMode?, asEdge? }',
      example: PROJECT_CURVE_EXAMPLE,
      featureId,
    });
  }
  const unknown = Object.keys(opts).find((key) => !PROJECT_CURVE_OPTION_KEYS.has(key));
  if (unknown !== undefined) {
    invalidArgs({
      api: PROJECT_CURVE_API,
      path: `opts.${unknown}`,
      got: (opts as Record<string, unknown>)[unknown],
      requires: `a known option key; projectCurve accepts ${[...PROJECT_CURVE_OPTION_KEYS].join(', ')}`,
      example: PROJECT_CURVE_EXAMPLE,
      featureId,
    });
  }

  const record = opts as Record<string, unknown>;
  if (record.asEdge !== undefined && typeof record.asEdge !== 'boolean') {
    invalidArgs({
      api: PROJECT_CURVE_API,
      path: 'opts.asEdge',
      got: record.asEdge,
      requires: 'a boolean; true selects open-curve projection and returns Curve3D[]',
      example: PROJECT_CURVE_EXAMPLE,
      featureId,
    });
  }
  const hasPlacement = record.sourcePlane !== undefined || record.direction !== undefined;
  if (record.asEdge === true) {
    if (record.sourcePlane === undefined || record.direction === undefined) {
      invalidArgs({
        api: PROJECT_CURVE_API,
        path: 'opts',
        gotText: 'open projection without both sourcePlane and direction',
        requires: 'asEdge: true with an explicit sourcePlane and world-space direction',
        example: PROJECT_CURVE_EXAMPLE,
        featureId,
      });
    }
    if (!isSourcePlane(record.sourcePlane)) {
      invalidArgs({
        api: PROJECT_CURVE_API,
        path: 'opts.sourcePlane',
        got: record.sourcePlane,
        requires: 'an object with finite Vec3 origin, normal, and xAxis values',
        example: PROJECT_CURVE_EXAMPLE,
        featureId,
      });
    }
    if (!isFiniteVec3(record.direction)) {
      invalidArgs({
        api: PROJECT_CURVE_API,
        path: 'opts.direction',
        got: record.direction,
        requires: 'a finite world-space Vec3 value',
        example: PROJECT_CURVE_EXAMPLE,
        featureId,
      });
    }
    const source = record.source as { kind?: unknown } | undefined;
    if (source?.kind !== 'sketchCommands') {
      invalidArgs({
        api: PROJECT_CURVE_API,
        path: 'opts.source',
        gotText: 'a non-sketch source for open projection',
        requires: "{ kind: 'sketchCommands', commands: [...] }",
        example: PROJECT_CURVE_EXAMPLE,
        featureId,
      });
    }
  } else if (hasPlacement) {
    invalidArgs({
      api: PROJECT_CURVE_API,
      path: 'opts.sourcePlane/direction',
      gotText: 'open-projection placement options without asEdge: true',
      requires: 'sourcePlane and direction only when asEdge: true',
      example: PROJECT_CURVE_EXAMPLE,
      featureId,
    });
  }
}

function isSourcePlane(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const plane = value as Record<string, unknown>;
  return isFiniteVec3(plane.origin) && isFiniteVec3(plane.normal) && isFiniteVec3(plane.xAxis);
}

function isFiniteVec3(value: unknown): boolean {
  return Array.isArray(value) && value.length === 3 &&
    value.every((component) => typeof component === 'number' && Number.isFinite(component));
}
