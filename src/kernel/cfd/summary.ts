// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/summary.ts
//
// Assemble the CfdSummary and its diagnostics from a solved case.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import type { CfdStudyMetadata } from '../../shared/intent/cfdStudyRecord';
import type { CaseDerived } from './caseSpec';
import { parseSolverLog, type SolverLog } from './parsers';
import { bodyForces, convergenceVerdict, decimate, drift, massBalance, maxVelocity, monitorHistory, patchFlows, pressureDrop, tailStats } from './results';
import type { CfdToolchain } from './toolchain';
import type { CfdMeshReport, CfdSummary } from './types';

export const CFD_DISCLAIMER =
  'Engineering estimate from a steady incompressible OpenFOAM solve on a snapped hex mesh; not a certification or a substitute for test.';

/** Mass imbalance above this is flagged. */
export const MASS_IMBALANCE_LIMIT = 0.01;

export interface SummaryInput {
  caseDir: string;
  derived: CaseDerived;
  meta: CfdStudyMetadata;
  tc: CfdToolchain;
  mesh: CfdMeshReport;
  meshMs: number;
  solveMs: number;
  hash: string;
  note: string;
}

const d = (code: DiagnosticCode, severity: CompilerDiagnostic['severity'], message: string, hint: string): CompilerDiagnostic =>
  ({ target: 'export-occt', code, severity, message, hint });

function readSolverLog(caseDir: string): SolverLog {
  const p = join(caseDir, 'log.simpleFoam');
  return parseSolverLog(existsSync(p) ? readFileSync(p, 'utf8') : '');
}

function verdictDiagnostics(s: CfdSummary, out: CompilerDiagnostic[]): void {
  const c = s.convergence;
  if (c.verdict === 'diverged') {
    out.push(d('cfd.solve.diverged', 'error', `run_cfd: the solve diverged: ${c.reason}.`, 'Check SI units, refine the mesh, or force turbulence: \'laminar\' at low Re.'));
  } else if (c.verdict === 'not-converged') {
    out.push(d('cfd.solve.not-converged', 'warn',
      `run_cfd: not converged — ${c.reason}. The pressure drop / forces are provisional` +
        (c.monitor !== undefined ? `; over the last 20% of iterations the ${c.monitor.quantity} averaged ${c.monitor.mean.toPrecision(4)} with a ${(c.monitor.band * 100).toFixed(1)}% band.` : '.'),
      `Raise iterations above ${s.iterations}, or loosen residualTarget (${c.residualTarget}) if the monitored quantity is already stable.`));
  }
  if (Number.isFinite(s.massBalance.imbalance) && s.massBalance.imbalance > MASS_IMBALANCE_LIMIT && s.flow === 'internal') {
    out.push(d('cfd.mass-balance.off', 'warn',
      `run_cfd: inflow ${s.massBalance.inflowKgs.toExponential(3)} kg/s vs outflow ${s.massBalance.outflowKgs.toExponential(3)} kg/s (${(s.massBalance.imbalance * 100).toFixed(2)}% imbalance).`,
      'Run more iterations or a finer mesh before using the pressure drop.'));
  }
}

function meshDiagnostics(mesh: CfdMeshReport, out: CompilerDiagnostic[]): void {
  if (mesh.ok) return;
  out.push(d('cfd.mesh.quality-low', 'warn',
    `run_cfd: checkMesh failed ${mesh.failedChecks} check(s) (max non-orthogonality ${mesh.maxNonOrthogonality?.toFixed(1) ?? '?'} deg, max skewness ${mesh.maxSkewness?.toFixed(2) ?? '?'}).`,
    'Treat the numbers with caution; a smaller meshSize usually clears it.'));
}

/** Drift, tail band and the monitored quantity in reporting units. */
function monitorOf(caseDir: string, derived: CaseDerived, meta: CfdStudyMetadata): { drift?: number; tail?: { mean: number; band: number }; monitor?: { quantity: string; mean: number; band: number } } {
  const history = monitorHistory(caseDir, derived);
  const d = drift(history);
  const tail = tailStats(history);
  if (tail === undefined) return d !== undefined ? { drift: d } : {};
  const monitor = meta.flow === 'internal'
    ? { quantity: 'inlet static pressure (Pa gauge)', mean: tail.mean * meta.fluid.rho, band: tail.band }
    : { quantity: 'drag (N)', mean: tail.mean, band: tail.band };
  return { ...(d !== undefined ? { drift: d } : {}), tail, monitor };
}

function openfoamInfo(tc: CfdToolchain, log: SolverLog): CfdSummary['openfoam'] {
  const version = log.version ?? tc.version;
  return { mode: tc.mode ?? 'native', ...(version !== undefined ? { version } : {}), ...(tc.image !== undefined ? { image: tc.image } : {}) };
}

export function assembleSummary(i: SummaryInput): { summary: CfdSummary; diagnostics: CompilerDiagnostic[] } {
  const { derived, meta, caseDir } = i;
  const log = readSolverLog(caseDir);
  const { drift: monitorDrift, tail, monitor } = monitorOf(caseDir, derived, meta);
  const flows = patchFlows(caseDir, derived);
  const v = convergenceVerdict({
    log, target: meta.residualTarget, maxIterations: meta.iterations,
    ...(monitorDrift !== undefined ? { drift: monitorDrift } : {}),
    ...(tail !== undefined ? { band: tail.band } : {}),
    massImbalance: meta.flow === 'internal' ? massBalance(flows).imbalance : 0,
  });
  const forces = meta.flow === 'external' ? bodyForces(caseDir, derived) : undefined;
  const dp = meta.flow === 'internal' ? pressureDrop(flows) : undefined;
  const summary: CfdSummary = {
    study: meta.name,
    flow: meta.flow,
    solver: 'openfoam-simpleFoam',
    openfoam: openfoamInfo(i.tc, log),
    fluid: { ...meta.fluid, mu: meta.fluid.rho * meta.fluid.nu },
    reynolds: derived.reynolds,
    turbulence: { model: derived.regime.model, chosen: derived.regime.chosen, reason: derived.regime.reason },
    mesh: { ...i.mesh, surfaceCellMm: derived.surfaceCellMm, backgroundCellMm: derived.backgroundCellMm },
    iterations: log.samples.length,
    convergence: {
      verdict: v.verdict, ...(v.criterion !== undefined ? { criterion: v.criterion } : {}),
      residualTarget: meta.residualTarget, finalResiduals: v.finalResiduals,
      ...(monitorDrift !== undefined ? { monitorDrift } : {}),
      ...(monitor !== undefined ? { monitor } : {}),
      reason: v.reason,
    },
    residualHistory: decimate(log.samples),
    ...(dp !== undefined ? { pressureDropPa: dp } : {}),
    patches: flows,
    massBalance: massBalance(flows),
    maxVelocity: maxVelocity(caseDir),
    ...(forces !== undefined ? { forces } : {}),
    solveMs: i.solveMs,
    meshMs: i.meshMs,
    disclaimer: `${CFD_DISCLAIMER} Domain: ${i.note}.`,
    inputHash: i.hash,
  };
  const diagnostics: CompilerDiagnostic[] = [];
  meshDiagnostics(i.mesh, diagnostics);
  verdictDiagnostics(summary, diagnostics);
  if (derived.regime.caveat !== undefined) {
    diagnostics.push(d('cfd.flow.regime-caveat', 'info', `run_cfd: ${derived.regime.caveat}`, 'Read the numbers as an estimate with the stated uncertainty.'));
  }
  return { summary, diagnostics };
}
