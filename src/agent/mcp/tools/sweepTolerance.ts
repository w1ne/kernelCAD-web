// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/sweepTolerance.ts
//
// MCP tool: wraps the kc.kinematic.sweepTolerance facade. Re-evaluates a
// script once per cartesian-product combination of declared param()
// values and runs the standard mechanism gates (interference,
// mounting-hole, joint-axis, plus reachability when declared) on each.

import {
  sweepTolerance,
  type SweepGateSpec,
  type SweepParamsDeclaration,
  type SweepToleranceResult,
} from '../../../kinematic';

export interface SweepToleranceInput {
  /** Path to a .kcad.ts script file. Mutually exclusive with `code`. */
  file?: string;
  /** Inline kernelCAD script source. Mutually exclusive with `file`. */
  code?: string;
  /** Assembly name when the script defines more than one. */
  assembly?: string;
  /** partName -> declared param() name -> { values } | { min, max, steps }. */
  params: SweepParamsDeclaration;
  /** Which standard gates to run per combo. `interference`, `mountingHoles`,
   *  `jointAxis` default to true; `reachable` runs only when a target is
   *  declared. */
  gates?: SweepGateSpec;
}

export type SweepToleranceOutput =
  | (SweepToleranceResult & { ok: true })
  | { ok: false; source: 'local'; error: string; errorCode?: string };

/**
 * `sweep_tolerance` MCP tool. Expands `params` into a cartesian product
 * (capped at 64 combos — `kinematic.sweep-tolerance.combo-cap-exceeded`
 * fires and the sweep truncates when exceeded), rewrites the source via
 * the same string-level edit `set_param` uses, and re-evaluates + gates
 * each combo. Returns the pass/fail envelope table plus the first failing
 * combo per gate.
 */
export async function sweepToleranceTool(
  input: SweepToleranceInput,
): Promise<SweepToleranceOutput> {
  if (input.file === undefined && input.code === undefined) {
    return {
      ok: false,
      source: 'local',
      error: 'sweep_tolerance requires either `file` or `code`.',
      errorCode: 'feature.invalid-args',
    };
  }
  if (Object.keys(input.params ?? {}).length === 0) {
    return {
      ok: false,
      source: 'local',
      error: 'sweep_tolerance requires at least one entry in `params`.',
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    const result = await sweepTolerance({
      code: input.code,
      file: input.file,
      assembly: input.assembly,
      params: input.params,
      gates: input.gates,
    });
    return { ...result, ok: true };
  } catch (e) {
    return {
      ok: false,
      source: 'local',
      error: e instanceof Error ? e.message : String(e),
      errorCode: 'feature.invalid-args',
    };
  }
}
