// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/studySpec.ts
//
// One validator for a CFD study, shared by `shape.cfdStudy({...})` (capture
// time) and the inline fields of `run_cfd` / `kernelcad cfd run`. Malformed
// fields throw the shared invalid-args KernelError, naming the field, what
// was received, and one correct call.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type {
  CfdAxisDirection,
  CfdFaceSelector,
  CfdStudyMetadata,
  CfdStudySpec,
} from '../../shared/intent/cfdStudyRecord';

export const CFD_STUDY_EXAMPLE =
  "cfdStudy({ flow: 'internal', fluid: 'water', inlet: { atX: 0 }, outlet: { atX: 200 }, velocity: 0.002 })";

/** Named fluids, SI. Water and air at 20 C, 1 atm. */
export const CFD_FLUIDS: Readonly<Record<string, { rho: number; nu: number }>> = {
  water: { rho: 998.2, nu: 1.004e-6 },
  air: { rho: 1.205, nu: 1.511e-5 },
};

export const CFD_FLUID_NAMES = Object.keys(CFD_FLUIDS);

const DIRECTIONS: readonly CfdAxisDirection[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
const RESOLUTIONS = ['coarse', 'medium', 'fine'] as const;
const TURBULENCE = ['auto', 'laminar', 'kOmegaSST'] as const;

const DEFAULT_ITERATIONS = 400;
const DEFAULT_RESIDUAL = 1e-4;
/** Iteration ceiling: beyond this a steady solve that has not converged
 *  is not going to, and the run would only burn the caller's time budget. */
export const MAX_CFD_ITERATIONS = 5000;

type Bad = (path: string, got: unknown, requires: string, unit?: string) => never;

function checker(api: string): Bad {
  return (path, got, requires, unit) =>
    invalidArgs({ api, path, got, requires, example: CFD_STUDY_EXAMPLE, ...(unit !== undefined ? { unit } : {}) });
}

/** A FaceQuery object or a ref / label string. */
export function isCfdSelector(v: unknown): v is CfdFaceSelector {
  if (typeof v === 'string') return v.length > 0;
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
}

const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

function resolveFluid(fluid: unknown, flow: string, bad: Bad): CfdStudyMetadata['fluid'] {
  if (fluid === undefined) {
    const name = flow === 'external' ? 'air' : 'water';
    return { name, ...CFD_FLUIDS[name] };
  }
  if (typeof fluid === 'string') {
    const preset = CFD_FLUIDS[fluid.toLowerCase()];
    if (preset === undefined) bad('fluid', fluid, `one of ${CFD_FLUID_NAMES.join(', ')} or { rho, nu }`);
    return { name: fluid.toLowerCase(), ...preset };
  }
  const o = (typeof fluid === 'object' && fluid !== null ? fluid : {}) as Record<string, unknown>;
  if (!positive(o.rho)) bad('fluid.rho', o.rho, 'a positive density', 'kg/m^3');
  if (!positive(o.nu)) bad('fluid.nu', o.nu, 'a positive kinematic viscosity', 'm^2/s');
  return { name: 'custom', rho: o.rho as number, nu: o.nu as number };
}

function resolveOutlets(outlet: unknown, bad: Bad): CfdFaceSelector[] {
  const list = Array.isArray(outlet) ? outlet : [outlet];
  if (list.length === 0) bad('outlet', outlet, 'a face selector or a non-empty array of them');
  list.forEach((o, i) => {
    if (!isCfdSelector(o)) bad(Array.isArray(outlet) ? `outlet[${i}]` : 'outlet', o, "a FaceQuery like { atX: 200 } or a face ref");
  });
  return list as CfdFaceSelector[];
}

function validateInternal(spec: CfdStudySpec, bad: Bad): Partial<CfdStudyMetadata> {
  if (spec.fluidVolume !== undefined && spec.fluidVolume !== 'interior' && spec.fluidVolume !== 'solid') {
    bad('fluidVolume', spec.fluidVolume, "'interior' or 'solid'");
  }
  if (!isCfdSelector(spec.inlet)) bad('inlet', spec.inlet, 'a FaceQuery like { atX: 0 } or a face ref (internal flow)');
  const outlets = resolveOutlets(spec.outlet, bad);
  const hasV = spec.velocity !== undefined;
  const hasQ = spec.flowRateLpm !== undefined;
  if (hasV === hasQ) bad('velocity', spec.velocity, 'exactly one of velocity (m/s) or flowRateLpm (L/min)');
  if (hasV && !positive(spec.velocity)) bad('velocity', spec.velocity, 'a positive speed', 'm/s');
  if (hasQ && !positive(spec.flowRateLpm)) bad('flowRateLpm', spec.flowRateLpm, 'a positive flow rate', 'L/min');
  return {
    fluidVolume: spec.fluidVolume ?? 'interior',
    inlet: spec.inlet as CfdFaceSelector,
    outlets,
    ...(hasV ? { velocity: spec.velocity } : { flowRateLpm: spec.flowRateLpm }),
  };
}

function validateExternal(spec: CfdStudySpec, bad: Bad): Partial<CfdStudyMetadata> {
  if (!positive(spec.velocity)) bad('velocity', spec.velocity, 'a positive free-stream speed', 'm/s');
  if (spec.flowRateLpm !== undefined) bad('flowRateLpm', spec.flowRateLpm, 'absent for external flow (use velocity)');
  if (spec.referenceAreaMm2 !== undefined && !positive(spec.referenceAreaMm2)) {
    bad('referenceAreaMm2', spec.referenceAreaMm2, 'a positive area', 'mm²');
  }
  return {
    velocity: spec.velocity,
    ...(spec.referenceAreaMm2 !== undefined ? { referenceAreaMm2: spec.referenceAreaMm2 } : {}),
  };
}

function validateNumerics(spec: CfdStudySpec, bad: Bad): void {
  const m = spec.meshSize;
  if (m !== undefined && !positive(m) && !(RESOLUTIONS as readonly unknown[]).includes(m)) {
    bad('meshSize', m, "a positive cell size in mm or 'coarse' | 'medium' | 'fine'");
  }
  const it = spec.iterations;
  if (it !== undefined && !(Number.isInteger(it) && it >= 10 && it <= MAX_CFD_ITERATIONS)) {
    bad('iterations', it, `an integer in [10, ${MAX_CFD_ITERATIONS}]`, 'count');
  }
  const r = spec.residualTarget;
  if (r !== undefined && !(positive(r) && r < 1)) bad('residualTarget', r, 'a number in (0, 1), e.g. 1e-4');
}

function validateOptions(spec: CfdStudySpec, bad: Bad): void {
  if (spec.turbulence !== undefined && !(TURBULENCE as readonly unknown[]).includes(spec.turbulence)) {
    bad('turbulence', spec.turbulence, "'auto', 'laminar' or 'kOmegaSST'");
  }
  if (spec.direction !== undefined && !DIRECTIONS.includes(spec.direction)) {
    bad('direction', spec.direction, DIRECTIONS.join(' | '));
  }
  if (spec.outletPressurePa !== undefined && !Number.isFinite(spec.outletPressurePa)) {
    bad('outletPressurePa', spec.outletPressurePa, 'a finite gauge pressure', 'Pa');
  }
  if (spec.name !== undefined && (typeof spec.name !== 'string' || spec.name.length === 0)) {
    bad('name', spec.name, 'a non-empty string');
  }
}

/**
 * Validate and normalize a CFD study. Throws the shared invalid-args
 * KernelError on the first malformed field. `api` names the surface in the
 * message ('cfdStudy(spec)' or 'run_cfd').
 */
export function normalizeCfdStudy(spec: CfdStudySpec, api = 'cfdStudy(spec)'): CfdStudyMetadata {
  const bad = checker(api);
  if (spec === null || typeof spec !== 'object') bad('', spec, 'an object');
  if (spec.flow !== 'internal' && spec.flow !== 'external') bad('flow', spec.flow, "'internal' or 'external'");
  const fluid = resolveFluid(spec.fluid, spec.flow, bad);
  const flowFields = spec.flow === 'internal' ? validateInternal(spec, bad) : validateExternal(spec, bad);
  validateNumerics(spec, bad);
  validateOptions(spec, bad);
  return {
    virtual: true,
    name: spec.name ?? 'cfd',
    flow: spec.flow,
    fluid,
    ...flowFields,
    outletPressurePa: spec.outletPressurePa ?? 0,
    direction: spec.direction ?? '+X',
    meshSize: spec.meshSize ?? 'medium',
    iterations: spec.iterations ?? DEFAULT_ITERATIONS,
    residualTarget: spec.residualTarget ?? DEFAULT_RESIDUAL,
    turbulence: spec.turbulence ?? 'auto',
  };
}
