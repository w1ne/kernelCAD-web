// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/runCfdArgs.ts
//
// The study `run_cfd` runs: a script's declared `cfdStudy`, the fields on the
// call (snake_case or camelCase), or the declared study with the call's
// fields overriding it. Every path goes through the one validator,
// `normalizeCfdStudy`, so a bad field reads the same everywhere.

import { normalizeCfdStudy } from '../../../kernel/cfd/studySpec';
import type { CfdStudyMetadata, CfdStudySpec } from '../../../shared/intent/cfdStudyRecord';
import { isKernelError } from '../../../shared/intent/kernelError';

export const RUN_CFD_EXAMPLE =
  "run_cfd({ code: 'return cylinder(200, 7).rotate([0, 1, 0], 90).subtract(cylinder(200, 5).rotate([0, 1, 0], 90));', " +
  "flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002 })";

type Raw = Record<string, unknown>;

/** Study field -> accepted call spellings. */
const FIELDS: ReadonlyArray<[keyof CfdStudySpec, readonly string[]]> = [
  ['flow', ['flow']],
  ['fluid', ['fluid']],
  ['fluidVolume', ['fluid_volume', 'fluidVolume']],
  ['inlet', ['inlet']],
  ['outlet', ['outlet', 'outlets']],
  ['velocity', ['velocity', 'inlet_velocity', 'inletVelocity']],
  ['flowRateLpm', ['flow_rate_lpm', 'flowRateLpm']],
  ['outletPressurePa', ['outlet_pressure_pa', 'outletPressurePa']],
  ['direction', ['direction']],
  ['meshSize', ['mesh_size', 'meshSize', 'resolution']],
  ['iterations', ['iterations']],
  ['residualTarget', ['residual_target', 'residualTarget']],
  ['turbulence', ['turbulence']],
  ['referenceAreaMm2', ['reference_area_mm2', 'referenceAreaMm2']],
];

/** Study fields present on the call. */
export function inlineCfdFields(input: Raw): Partial<CfdStudySpec> {
  const src = typeof input.study === 'object' && input.study !== null ? (input.study as Raw) : input;
  const out: Record<string, unknown> = {};
  for (const [field, keys] of FIELDS) {
    for (const k of keys) {
      if (src[k] !== undefined) { out[field] = src[k]; break; }
    }
  }
  return out as Partial<CfdStudySpec>;
}

/** Metadata back to a spec, so call fields can override a declared study. */
export function specFromMetadata(m: CfdStudyMetadata): CfdStudySpec {
  return {
    name: m.name,
    flow: m.flow,
    fluid: m.fluid.name === 'custom' ? { rho: m.fluid.rho, nu: m.fluid.nu } : m.fluid.name,
    ...(m.fluidVolume !== undefined ? { fluidVolume: m.fluidVolume } : {}),
    ...(m.inlet !== undefined ? { inlet: m.inlet } : {}),
    ...(m.outlets !== undefined ? { outlet: m.outlets.length === 1 ? m.outlets[0] : m.outlets } : {}),
    ...(m.velocity !== undefined ? { velocity: m.velocity } : {}),
    ...(m.flowRateLpm !== undefined ? { flowRateLpm: m.flowRateLpm } : {}),
    outletPressurePa: m.outletPressurePa,
    direction: m.direction,
    meshSize: m.meshSize,
    iterations: m.iterations,
    residualTarget: m.residualTarget,
    turbulence: m.turbulence,
    ...(m.referenceAreaMm2 !== undefined ? { referenceAreaMm2: m.referenceAreaMm2 } : {}),
  };
}

export type CfdStudyArgs =
  | { kind: 'ok'; metadata: CfdStudyMetadata }
  | { kind: 'error'; error: string; errorCode: string };

/** Validate `base` (declared, may be undefined) overridden by the call fields. */
export function resolveCfdArgs(base: CfdStudyMetadata | undefined, fields: Partial<CfdStudySpec>): CfdStudyArgs {
  const merged = { ...(base !== undefined ? specFromMetadata(base) : {}), ...fields } as CfdStudySpec;
  // A switch of flow kind drops the other kind's fields from the declaration.
  if (base !== undefined && fields.flow !== undefined && fields.flow !== base.flow) {
    if (fields.flow === 'external') { delete merged.inlet; delete merged.outlet; delete merged.fluidVolume; delete merged.flowRateLpm; }
  }
  if (fields.flowRateLpm !== undefined && fields.velocity === undefined) delete merged.velocity;
  if (fields.velocity !== undefined && fields.flowRateLpm === undefined) delete merged.flowRateLpm;
  try {
    return { kind: 'ok', metadata: normalizeCfdStudy(merged, 'run_cfd') };
  } catch (e) {
    const message = isKernelError(e) || e instanceof Error ? e.message : String(e);
    return { kind: 'error', error: `${message} Full call example: ${RUN_CFD_EXAMPLE}.`, errorCode: 'feature.invalid-args' };
  }
}
