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
  type MotionLoadResult,
} from '../../../kinematic/motionLoad';

export interface CheckMotionLoadInput extends EvaluateInput {
  assembly?: string;
  /** 'tracks' (default): along the animationView timeline, with inertia.
   *  'range': quasi-static grid over each driven joint's limits. */
  motion_mode?: 'tracks' | 'range';
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
  if (evaluation.exitCode !== 0 || !model) {
    return { ok: false, source: 'local', error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.', errorCode: evaluation.diagnostics[0]?.code };
  }
  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = input.assembly !== undefined ? assemblies.get(input.assembly) : assemblies.values().next().value;
  if (!arm) {
    return {
      ok: false, source: 'local', errorCode: 'feature.invalid-args',
      error: input.assembly ? `motion-load: assembly '${input.assembly}' not found.` : 'motion-load: no assembly captured by the script.',
    };
  }
  const result = await checkMotionLoad(arm, {
    ...(input.motion_mode !== undefined ? { mode: input.motion_mode } : {}),
    ...(input.sample_ms !== undefined ? { sampleMs: input.sample_ms } : {}),
    ...(input.range_samples !== undefined ? { rangeSamples: input.range_samples } : {}),
    ...(input.quasi_static !== undefined ? { quasiStatic: input.quasi_static } : {}),
    ...(input.gravity !== undefined ? { gravity: input.gravity } : {}),
    ...(input.motion_loads !== undefined ? { loads: input.motion_loads } : {}),
    ...(input.supports !== undefined ? { supports: input.supports } : {}),
  });
  const points = input.series_points ?? DEFAULT_SERIES_POINTS;
  return { ...result, joints: result.joints.map((j) => thinSeries(j, points)) };
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
  return { ...j, series: [...kept].filter((i) => i >= 0).sort((a, b) => a - b).map((i) => j.series[i]) };
}
