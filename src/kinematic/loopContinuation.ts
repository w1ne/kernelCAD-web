// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/loopContinuation.ts
//
// Continuation along a pose sequence for mate assemblies with closed loops.
// Every pose is solved seeded from the previous solved pose, and the branch
// state is handed on, so a sweep follows the assembly mode it started in.
// The first `kinematic.loop.branch-flip` / `kinematic.loop.lockup` /
// over-driven finding stops the sweep: the caller samples no pose after it.
//
// Assemblies without an articulated loop pass straight through (one plain
// `solveMates` per pose, no stop).

import type { Assembly } from '../modeling/capture/assembly';
import { solveMates, type SolveResult } from '../modeling/mates/solver';
import type { LoopBranchState, LoopDiagnostic } from '../shared/kinematics/loopClosure';
import { DIAGNOSTIC_REGISTRY } from '../shared/diagnostics/registry';
import type { NumericPoses as FullPoses } from '../modeling/capture/forwardKinematics';
import type { KinematicDiagnostic, NumericPoses } from './types';

export interface ContinuationStep {
  readonly result: SolveResult;
  /** Set when this pose ends the sweep (the pose is not usable). */
  readonly stop?: KinematicDiagnostic;
}

export class LoopContinuation {
  private seed: FullPoses | undefined;
  private previous: LoopBranchState | undefined;
  private readonly notes = new Map<string, KinematicDiagnostic>();

  private readonly arm: Assembly;

  constructor(arm: Assembly) {
    this.arm = arm;
  }

  /** Solve one pose of the sweep. */
  async step(poses: FullPoses): Promise<ContinuationStep> {
    const result = await solveMates(this.arm, poses, { seed: this.seed, previous: this.previous });
    const loop = result.loop;
    if (loop === undefined) return { result };
    for (const d of loop.diagnostics) {
      if (d.severity === 'error' || d.code === 'kinematic.loop.branch-flip') continue;
      const key = `${d.code}|${d.loop ?? ''}`;
      if (!this.notes.has(key)) this.notes.set(key, toKinematicDiagnostic(d));
    }
    if (loop.status !== 'solved') {
      const finding = loop.diagnostics.find((d) => d.severity === 'error' || d.code === 'kinematic.loop.branch-flip');
      return { result, stop: finding === undefined ? undefined : toKinematicDiagnostic(finding) };
    }
    this.seed = loop.coordinates as FullPoses;
    this.previous = loop.state;
    return { result };
  }

  /** Non-stopping loop findings seen so far (mobility, ambiguous start),
   *  once per code and loop. */
  advisories(): KinematicDiagnostic[] {
    return [...this.notes.values()];
  }

  /** Start a new sweep from the as-built pose (e.g. the next swept joint). */
  reset(): void {
    this.seed = undefined;
    this.previous = undefined;
  }
}

/** Map a loop-solver finding onto the kinematic diagnostic envelope. */
export function toKinematicDiagnostic(d: LoopDiagnostic): KinematicDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[d.code];
  return {
    code: d.code,
    severity: d.severity === 'warning' ? 'warn' : d.severity,
    message: d.message,
    hint: entry.hintTemplate,
    nextAction: entry.nextAction,
    source: 'local',
    ...(d.joint !== undefined ? { element: d.joint } : {}),
    ...(d.pose !== undefined ? { poseContext: { ...d.pose } as NumericPoses } : {}),
  };
}
