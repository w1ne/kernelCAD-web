// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkMotionLoad.ts
//
// MCP tool: verify({ check: 'motion-load' }). Runs the motion-load study
// (src/kinematic/motionLoad.ts) on a script's assembly: actuator torque vs
// rating, shaft axial / radial / bending loads and the load on each declared
// support, along the animation tracks or across the joint limits.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import {
  checkMotionLoad,
  type MotionLoadExternalLoad,
  type MotionLoadJointResult,
  type MotionLoadOpts,
  type MotionLoadResult,
} from '../../../kinematic/motionLoad';

export interface CheckMotionLoadInput extends EvaluateInput {
  assembly?: string;
  /** 'tracks' (default): along the animationView timeline, with inertia.
   *  'range': quasi-static grid over each driven joint's limits. */
  motion_mode?: 'tracks' | 'range' | 'poses';
  /** Explicit mate poses for motion_mode 'poses' (each a joint name -> value). */
  motion_poses?: ReadonlyArray<Readonly<Record<string, number>>>;
  sample_ms?: number;
  range_samples?: number;
  quasi_static?: boolean;
  gravity?: readonly [number, number, number];
  /** External forces, e.g. pencil contact: [{ part: 'pencil', point: [x,y,z], force: [0,0,0.5] }]. */
  motion_loads?: readonly MotionLoadExternalLoad[];
  /** Per mechanicalJoint name: support parts to use instead of the declared ones. */
  supports?: Readonly<Record<string, readonly string[]>>;
  /** Max points per joint series in the result (default 120; 0 drops series). */
  series_points?: number;
}

export type CheckMotionLoadOutput = MotionLoadResult | { ok: false; source: 'local'; error: string; errorCode?: string };

const DEFAULT_SERIES_POINTS = 120;

export async function checkMotionLoadTool(input: CheckMotionLoadInput): Promise<CheckMotionLoadOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input);
  // A built model with gate errors (DFM, mounting holes, ...) still has the
  // geometry and mates the load study needs; only a failed build stops it.
  if (!model || model.session.assemblies.size === 0) {
    return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
  }
  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = input.assembly !== undefined ? assemblies.get(input.assembly) : assemblies.values().next().value;
  if (!arm) return { ok: false, source: 'local', errorCode: 'feature.invalid-args', error: `motion-load: assembly '${input.assembly}' not found.` };
  const result = await checkMotionLoad(arm, studyOpts(input));
  const points = input.series_points ?? DEFAULT_SERIES_POINTS;
  const gateErrors = evaluation.diagnostics.filter((d) => d.severity === 'error').length;
  const note = `The script has ${gateErrors} other error diagnostic(s) (run evaluate_script); loads were computed on the built geometry.`;
  const messages = gateErrors > 0 ? [...result.messages, note] : result.messages;
  return { ...result, messages, joints: result.joints.map((j) => thinSeries(j, points)) };
}

/** Map the snake_case tool input to the study options (unset stays unset). */
function studyOpts(input: CheckMotionLoadInput): MotionLoadOpts {
  const pairs: Array<[keyof MotionLoadOpts, unknown]> = [
    ['mode', input.motion_mode], ['poses', input.motion_poses], ['sampleMs', input.sample_ms], ['rangeSamples', input.range_samples],
    ['quasiStatic', input.quasi_static], ['gravity', input.gravity], ['loads', input.motion_loads], ['supports', input.supports],
  ];
  return Object.fromEntries(pairs.filter(([, v]) => v !== undefined)) as MotionLoadOpts;
}

/** Keep at most `points` evenly spaced samples, always including the worst. */
export function thinSeries(j: MotionLoadJointResult, points: number): MotionLoadJointResult {
  if (points <= 0) return { ...j, series: [] };
  if (j.series.length <= points) return j;
  const stride = j.series.length / points;
  const kept = new Set<number>();
  for (let i = 0; i < points; i++) kept.add(Math.floor(i * stride));
  kept.add(j.series.length - 1);
  kept.add(j.series.indexOf(j.worst));
  kept.add(j.series.indexOf(j.worstSideLoad));
  return { ...j, series: [...kept].filter((i) => i >= 0).sort((a, b) => a - b).map((i) => j.series[i]) };
}
