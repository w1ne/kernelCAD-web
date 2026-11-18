// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../shared/diagnostics/registry';
import type { LoopDiagnostic, LoopMobility } from '../../shared/kinematics/loopClosure';

/** One solver mobility cluster, tagged with its assembly and sampled pose. */
export interface MechanismLoopMobility extends LoopMobility {
  readonly assembly: string;
  readonly pose: string;
}

interface LoopSolveEvidence {
  readonly diagnostics: readonly LoopDiagnostic[];
  readonly mobility: readonly LoopMobility[];
}

export function appendLoopEvidence(
  report: LoopSolveEvidence | undefined,
  assembly: string,
  pose: string,
  mobility: MechanismLoopMobility[],
  failures: CompilerDiagnostic[],
  seenDiagnostics: Set<string>,
): void {
  if (report === undefined) return;
  mobility.push(...report.mobility.map((item) => ({ assembly, pose, ...item })));
  for (const diagnostic of report.diagnostics) {
    const key = JSON.stringify([diagnostic.code, pose, diagnostic.loop, diagnostic.joint, diagnostic.pose]);
    if (seenDiagnostics.has(key)) continue;
    seenDiagnostics.add(key);
    failures.push(loopDiagnosticFailure(diagnostic, pose, report.mobility));
  }
}

function loopDiagnosticFailure(
  diagnostic: LoopDiagnostic,
  sample: string,
  mobilityReports: readonly LoopMobility[],
): CompilerDiagnostic {
  const mobility = mobilityReports.find((report) => diagnostic.loop === undefined || report.loops.includes(diagnostic.loop));
  return {
    target: 'export-occt',
    code: diagnostic.code,
    severity: diagnostic.severity === 'warning' ? 'warn' : diagnostic.severity,
    message: diagnostic.message,
    hint: HINT_TEMPLATES[diagnostic.code].template,
    nextAction: HINT_TEMPLATES[diagnostic.code].nextAction,
    details: {
      sample,
      ...(diagnostic.loop !== undefined ? { loop: diagnostic.loop } : {}),
      ...(diagnostic.joint !== undefined ? { joint: diagnostic.joint } : {}),
      ...(diagnostic.pose !== undefined ? { pose: JSON.stringify(diagnostic.pose) } : {}),
      ...(mobility !== undefined ? {
        coordinates: mobility.coordinates,
        rank: mobility.rank,
        mobility: mobility.mobility,
        gruebler: mobility.gruebler,
        redundantConstraints: mobility.redundantConstraints,
        drivenDof: mobility.drivenDof,
        independent: mobility.independent.join(', '),
      } : {}),
    },
  };
}
