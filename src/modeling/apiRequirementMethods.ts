// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `require()` and the predicate helper globals. The capture side only records
// the declaration; the ledger evaluator measures it after lowering.

import type { CaptureSession } from './capture/captureSession';
import type { KernelCadApi } from './api';
import type { RequirementRecordMetadata } from '../shared/intent/requirementRecord';
import { invalidArgs } from '../shared/intent/invalidArgs';
import {
  bbox,
  centerOfMass,
  clearance,
  concentric,
  coplanar,
  count,
  distance,
  edges,
  faces,
  innerLoops,
  isValidOperator,
  isRequirementLimit,
  mass,
  predicateSpec,
  volume,
  angle,
  type RequirementSelectionHandle,
} from './requirements/predicates';

const REQUIREMENT_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

export type RequirementApiMethods = Pick<
  KernelCadApi,
  | 'require'
  | 'clearance'
  | 'distance'
  | 'mass'
  | 'volume'
  | 'bbox'
  | 'centerOfMass'
  | 'count'
  | 'innerLoops'
  | 'angle'
  | 'concentric'
  | 'coplanar'
  | 'faces'
  | 'edges'
>;

function invalid(message: string, hint: string): never {
  return invalidArgs({
    api: 'require(name, predicate)',
    gotText: message,
    requires: 'a valid requirement name, predicate and comparison',
    example: "require('bolt-clearance', clearance(a, b).gte(1))",
    hint,
  });
}

export function makeRequirementMethods(session: CaptureSession): RequirementApiMethods {
  return {
    require(name, predicate) {
      if (typeof name !== 'string' || !REQUIREMENT_NAME.test(name)) {
        return invalid(
          `require: name must match ${REQUIREMENT_NAME}; got ${JSON.stringify(name)}.`,
          'invalid-args.require.name — use a short stable identifier such as "bolt-clearance".',
        );
      }
      const spec = predicateSpec(predicate);
      if (spec === undefined || typeof spec.metric !== 'string') {
        return invalid(
          `require('${name}'): expected a predicate such as clearance(a, b).gte(1) or volume(body).between(100, 200).`,
          'invalid-args.require.predicate — wrap the helper call with a comparison, e.g. .gte(), .lte(), .between(), .eq(), .within().',
        );
      }
      if (spec.metric !== 'concentric' && spec.metric !== 'coplanar' && spec.op === undefined) {
        return invalid(
          `require('${name}'): predicate has no comparison. Add .gte(limit), .lte(limit), .between(lo, hi), .eq(n) or .within(bands).`,
          'invalid-args.require.no-limit — a requirement must state the limit it is measured against.',
        );
      }
      if (spec.op !== undefined && !isValidOperator(spec.op)) {
        return invalid(
          `require('${name}'): unknown comparison operator ${JSON.stringify(spec.op)}.`,
          'invalid-args.require.operator — use gte, lte, eq, between or within.',
        );
      }
      if (spec.op !== undefined && spec.op !== 'between' && spec.op !== 'within' && spec.limit !== undefined && !isRequirementLimit(spec.limit)) {
        return invalid(
          `require('${name}'): limit must be a finite number or a finite [lo, hi] band.`,
          'invalid-args.require.limit — pass numeric limits in the metric unit (mm, mm^3, kg, count or degrees).',
        );
      }
      const metadata: RequirementRecordMetadata = { virtual: true, name, predicate: spec };
      session.register({
        kind: 'require',
        params: {},
        inputs: {},
        metadata: metadata as unknown as Record<string, unknown>,
      });
    },
    clearance,
    distance,
    mass,
    volume,
    bbox,
    centerOfMass,
    count,
    innerLoops,
    angle,
    concentric,
    coplanar,
    faces,
    edges,
  };
}

export type { RequirementSelectionHandle };
