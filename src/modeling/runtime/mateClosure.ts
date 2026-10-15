// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/mateClosure.ts
//
// Is every mate satisfied at every pose of the sweep? Tree mates are placed
// by the FK walk itself, so only loop-closing mates can come apart. The mate
// solver already measures their connector gap (`SolveResult.loopResiduals`);
// this turns it into verdict failures that name the mate:
//
//   - at rest, a loop that does not close reuses the solver codes:
//     `assembly.mate.over-constrained` (fastened-only loop) or
//     `assembly.solver.did-not-converge` (a loop with moving joints);
//   - at a swept pose, a loop mate that closed at rest but comes apart is
//     `mechanism.mate-unsatisfied`: that joint cannot move this way.

import type { CompilerDiagnostic, DiagnosticCode } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { SolveStatus } from '../mates/solver';

/** Connector gap (mm) above which a mate is not satisfied. */
export const MATE_RESIDUAL_TOL_MM = 0.01;

export interface ClosureSample {
  /** 'rest', or `<mate>:<value>` for a swept pose. */
  readonly name: string;
  readonly status: SolveStatus;
  readonly loopResiduals?: ReadonlyArray<{ readonly mate: string; readonly mm: number }>;
}

type ClosureCode = Extract<DiagnosticCode, 'assembly.mate.over-constrained' | 'assembly.solver.did-not-converge' | 'mechanism.mate-unsatisfied'>;

function failure(code: ClosureCode, mateName: string, message: string): CompilerDiagnostic & { mateName: string } {
  const spec = HINT_TEMPLATES[code];
  return { target: 'export-occt', code, severity: 'error', message, hint: spec.template, nextAction: spec.nextAction, mateName };
}

function mm(n: number): string {
  return n >= 0.1 ? n.toFixed(2) : n.toPrecision(2);
}

function describePose(name: string): string {
  const i = name.lastIndexOf(':');
  if (i < 0) return `at pose '${name}'`;
  return `when joint '${name.slice(0, i)}' is at ${name.slice(i + 1)}`;
}

/** Loop-mate satisfaction across the solved samples. */
export function checkMateClosure(samples: readonly ClosureSample[]): CompilerDiagnostic[] {
  const out: CompilerDiagnostic[] = [];
  const rest = samples.find((s) => s.name === 'rest');
  const openAtRest = new Set<string>();
  for (const r of rest?.loopResiduals ?? []) {
    if (r.mm <= MATE_RESIDUAL_TOL_MM) continue;
    openAtRest.add(r.mate);
    out.push(rest!.status === 'over-constrained'
      ? failure('assembly.mate.over-constrained', r.mate,
        `Mate '${r.mate}' contradicts the other mates in its closed loop: at the rest pose its connectors are ${mm(r.mm)} mm apart.`)
      : failure('assembly.solver.did-not-converge', r.mate,
        `The closed loop through mate '${r.mate}' does not close at the rest pose: its connectors are ${mm(r.mm)} mm apart.`));
  }
  const reported = new Set<string>();
  for (const s of samples) {
    if (s === rest) continue;
    for (const r of s.loopResiduals ?? []) {
      if (r.mm <= MATE_RESIDUAL_TOL_MM || openAtRest.has(r.mate) || reported.has(r.mate)) continue;
      reported.add(r.mate);
      out.push(failure('mechanism.mate-unsatisfied', r.mate,
        `Mate '${r.mate}' is not satisfied ${describePose(s.name)}: its connectors are ${mm(r.mm)} mm apart, so that joint cannot move this way.`));
    }
  }
  return out;
}
