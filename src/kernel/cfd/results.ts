// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/results.ts
//
// Case directory -> evidence: per-patch flow and pressure, mass balance,
// pressure drop, max velocity, body forces, residual history and the
// convergence verdict.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lastValue, parseDatTable, type SolverLog } from './parsers';
import type { CaseDerived } from './caseSpec';
import { patchesOf } from './foamDicts';
import type { CfdConvergenceVerdict, CfdPatchFlow, CfdResidualSample, CfdSummary, Vec3 } from './types';

/** Text of postProcessing/<fo>/<firstTime>/<file>, or undefined. */
export function readFunctionObject(caseDir: string, fo: string, file: string): string | undefined {
  const dir = join(caseDir, 'postProcessing', fo);
  if (!existsSync(dir)) return undefined;
  const times = readdirSync(dir).filter(t => existsSync(join(dir, t, file))).sort((a, b) => Number(a) - Number(b));
  return times.length > 0 ? readFileSync(join(dir, times[0], file), 'utf8') : undefined;
}

export function patchFlows(caseDir: string, d: CaseDerived): CfdPatchFlow[] {
  const rho = d.spec.fluid.rho;
  return [...patchesOf(d.spec, 'inlet'), ...patchesOf(d.spec, 'outlet')].map(patch => {
    const q = lastValue(readFunctionObject(caseDir, `${patch}_flow`, 'surfaceFieldValue.dat') ?? '') ?? Number.NaN;
    const p = lastValue(readFunctionObject(caseDir, `${patch}_p`, 'surfaceFieldValue.dat') ?? '') ?? Number.NaN;
    return { patch, flowM3s: q, massFlowKgs: q * rho, pressurePa: p * rho };
  });
}

export function massBalance(flows: readonly CfdPatchFlow[]): CfdSummary['massBalance'] {
  const inflow = -flows.filter(f => f.massFlowKgs < 0).reduce((s, f) => s + f.massFlowKgs, 0);
  const outflow = flows.filter(f => f.massFlowKgs > 0).reduce((s, f) => s + f.massFlowKgs, 0);
  const ref = Math.max(Math.abs(inflow), Math.abs(outflow), 1e-30);
  return { inflowKgs: inflow, outflowKgs: outflow, imbalance: Math.abs(inflow - outflow) / ref };
}

/** Internal: inlet-average minus outlet-average static pressure (mass-flow
 *  weighted over the outlets when there are several). */
export function pressureDrop(flows: readonly CfdPatchFlow[]): number | undefined {
  const inlet = flows.find(f => f.patch === 'inlet');
  const outs = flows.filter(f => f.patch.startsWith('outlet'));
  if (inlet === undefined || outs.length === 0) return undefined;
  const w = outs.reduce((s, f) => s + Math.abs(f.massFlowKgs), 0);
  const pOut = w > 0 ? outs.reduce((s, f) => s + f.pressurePa * Math.abs(f.massFlowKgs), 0) / w : outs[0].pressurePa;
  return inlet.pressurePa - pOut;
}

export function maxVelocity(caseDir: string): number {
  return lastValue(readFunctionObject(caseDir, 'maxU', 'fieldMinMax.dat') ?? '', 2) ?? Number.NaN;
}

const dotv = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function bodyForces(caseDir: string, d: CaseDerived): CfdSummary['forces'] | undefined {
  const text = readFunctionObject(caseDir, 'bodyForces', 'force.dat');
  if (text === undefined || d.dragAxis === undefined || d.liftAxis === undefined || d.referenceAreaMm2 === undefined) return undefined;
  const rows = parseDatTable(text);
  const r = rows[rows.length - 1];
  if (r === undefined || r.length < 10) return undefined;
  const totalN: Vec3 = [r[1], r[2], r[3]];
  const q = 0.5 * d.spec.fluid.rho * d.reynolds.speed ** 2 * d.referenceAreaMm2 * 1e-6;
  const dragN = dotv(totalN, d.dragAxis);
  const liftN = dotv(totalN, d.liftAxis);
  return {
    totalN, pressureN: [r[4], r[5], r[6]], viscousN: [r[7], r[8], r[9]],
    dragN, liftN, referenceAreaMm2: d.referenceAreaMm2, cd: dragN / q, cl: liftN / q,
    dragAxis: d.dragAxis, liftAxis: d.liftAxis,
  };
}

/** History of the monitored quantity: inlet pressure (internal) or drag (external). */
export function monitorHistory(caseDir: string, d: CaseDerived): number[] {
  if (d.spec.flow === 'internal') {
    return parseDatTable(readFunctionObject(caseDir, 'inlet_p', 'surfaceFieldValue.dat') ?? '').map(r => r[1]);
  }
  const axis = d.dragAxis ?? [1, 0, 0];
  return parseDatTable(readFunctionObject(caseDir, 'bodyForces', 'force.dat') ?? '').map(r => dotv([r[1], r[2], r[3]], axis));
}

/** Mean and relative band of the last 20% of the history (min 5 samples). */
export function tailStats(history: readonly number[]): { mean: number; band: number } | undefined {
  if (history.length < 5) return undefined;
  const tail = history.slice(-Math.max(5, Math.floor(history.length / 5)));
  const mean = tail.reduce((s, v) => s + v, 0) / tail.length;
  const band = (Math.max(...tail) - Math.min(...tail)) / Math.max(Math.abs(mean), 1e-30);
  return { mean, band };
}

/** Relative change over the last 10% of iterations (min 5). */
export function drift(history: readonly number[]): number | undefined {
  if (history.length < 10) return undefined;
  const back = Math.max(5, Math.floor(history.length / 10));
  const end = history[history.length - 1];
  const before = history[history.length - 1 - back];
  return Math.abs(end - before) / Math.max(Math.abs(end), 1e-30);
}

export interface Verdict {
  verdict: CfdConvergenceVerdict;
  /** What established convergence: the residual target, or steady monitors. */
  criterion?: 'residuals' | 'monitors';
  finalResiduals: Record<string, number>;
  reason: string;
}

export const DRIFT_LIMIT = 0.01;
/** Monitor criterion: the monitored quantity's band over the last 20% of
 *  iterations, the mass imbalance, the residual plateau ceiling, and the
 *  minimum iteration count before a plateau is believed. */
export const MONITOR_BAND_LIMIT = 0.01;
export const MONITOR_MASS_LIMIT = 0.005;
export const MONITOR_RESIDUAL_CEILING = 0.05;
export const MONITOR_MIN_ITERATIONS = 200;

export interface VerdictInput {
  log: SolverLog;
  target: number;
  maxIterations: number;
  /** Relative change over the last 10% of iterations. */
  drift?: number;
  /** (max - min) / |mean| over the last 20% of iterations. */
  band?: number;
  /** Relative mass imbalance; external flow passes 0. */
  massImbalance: number;
}

const pct = (v: number | undefined, d = 2): string => `${((v ?? 0) * 100).toFixed(d)}%`;

/** Residuals stalled but every engineering monitor is steady: the textbook
 *  "monitors converged" criterion, reported as such with the plateau value. */
function monitorsSteady(i: VerdictInput, worst: number, iterations: number): boolean {
  return iterations >= MONITOR_MIN_ITERATIONS && worst <= MONITOR_RESIDUAL_CEILING &&
    i.band !== undefined && i.band <= MONITOR_BAND_LIMIT &&
    (i.drift ?? 1) < DRIFT_LIMIT && i.massImbalance <= MONITOR_MASS_LIMIT;
}

export function convergenceVerdict(i: VerdictInput): Verdict {
  const { log, target } = i;
  const last = log.samples[log.samples.length - 1];
  const finalResiduals = last?.initial ?? {};
  if (log.failure !== undefined) return { verdict: 'diverged', finalResiduals, reason: log.failure };
  if (last === undefined) return { verdict: 'diverged', finalResiduals, reason: 'the solver wrote no iterations' };
  const worst = Math.max(...Object.values(finalResiduals));
  if (worst > 1) return { verdict: 'diverged', finalResiduals, reason: `residuals grew above 1 (worst ${worst.toExponential(2)})` };
  const stable = i.drift === undefined || i.drift < DRIFT_LIMIT;
  if (log.convergedAt !== undefined && stable) {
    return { verdict: 'converged', criterion: 'residuals', finalResiduals, reason: `all initial residuals below ${target} after ${log.convergedAt} iterations` };
  }
  if (worst <= 10 * target && stable) {
    return { verdict: 'converged', criterion: 'residuals', finalResiduals, reason: `residuals within 10x of ${target} (worst ${worst.toExponential(2)}) and the monitored quantity changed ${pct(i.drift)} over the last 10% of iterations` };
  }
  if (monitorsSteady(i, worst, log.samples.length)) {
    return {
      verdict: 'converged',
      criterion: 'monitors',
      finalResiduals,
      reason: `monitors steady: the monitored quantity stayed within a ${pct(i.band)} band over the last 20% of iterations and mass balanced to ${pct(i.massImbalance, 3)}; residuals plateaued at ${worst.toExponential(2)} (above the ${target} target)`,
    };
  }
  const why = !stable
    ? `the monitored quantity still changed ${pct(i.drift, 1)} over the last 10% of iterations`
    : `worst initial residual ${worst.toExponential(2)} > target ${target}${i.band !== undefined ? ` and the monitored quantity moved within a ${pct(i.band, 1)} band` : ''}`;
  return { verdict: 'not-converged', finalResiduals, reason: `stopped at ${last.iteration} of ${i.maxIterations} iterations: ${why}` };
}

/** At most `max` evenly spaced samples, always keeping the last. */
export function decimate(samples: readonly CfdResidualSample[], max = 200): CfdResidualSample[] {
  if (samples.length <= max) return [...samples];
  const step = samples.length / max;
  const out: CfdResidualSample[] = [];
  for (let i = 0; i < max - 1; i++) out.push(samples[Math.floor(i * step)]);
  out.push(samples[samples.length - 1]);
  return out;
}
