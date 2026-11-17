// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/checkExportHealth.ts
//
// MCP tool: check_export_health. Separate from verify({ check: 'physics' }).
// Exports MJCF and URDF, compiles the MJCF, and reports rest contacts,
// visual collision bits, and inertia provenance at qpos0.

import { evaluateAndBuildScript, type EvaluateInput } from '../../cli/commands/evaluate';
import type { Assembly } from '../../../modeling/capture/assembly';
import { checkExportHealth, type ExportHealthReport } from '../../../modeling/runtime/exportHealth';
import { loadMujocoSession } from '../../../modeling/runtime/mujocoSession';

export interface CheckExportHealthInput extends EvaluateInput {
  /** Assembly name when the script defines more than one. */
  assembly?: string;
}

export type CheckExportHealthOutput =
  | (ExportHealthReport & { source: 'local' })
  | { ok: false; source: 'local'; error: string; errorCode?: string; summary: string };

/**
 * Export the captured assembly and check the compiled model at qpos0.
 * `ok` is true only when there is no unexpected real rest contact, no visual
 * geom with collision bits, no visual mesh used as a collision solid,
 * and every inertia row matches the CAD solid within the stated tolerance.
 * A compiled contact whose exact CAD overlap is at or below 0.01 mm³ is a
 * collision-geometry artefact and does not fail the check. A compiled qpos0
 * outside its joint range also fails the check.
 */
export async function checkExportHealthTool(input: CheckExportHealthInput): Promise<CheckExportHealthOutput> {
  const { evaluation, model } = await evaluateAndBuildScript(input);
  if (!model || model.session.assemblies.size === 0) {
    return {
      ok: false,
      source: 'local',
      summary: 'Export health did not run.',
      error: evaluation.diagnostics[0]?.message ?? 'Script evaluation failed.',
      errorCode: evaluation.diagnostics[0]?.code,
    };
  }
  const assemblies = model.session.assemblies as Map<string, Assembly>;
  const arm = input.assembly !== undefined ? assemblies.get(input.assembly) : assemblies.values().next().value;
  if (!arm) {
    return {
      ok: false,
      source: 'local',
      summary: 'Export health did not run.',
      error: input.assembly
        ? `export health: assembly '${input.assembly}' not found.`
        : 'export health: no assembly captured by the script.',
      errorCode: 'feature.invalid-args',
    };
  }
  try {
    const report = await checkExportHealth(arm, { sessionFactory: loadMujocoSession });
    return { source: 'local', ...report };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      source: 'local',
      summary: 'Export health failed before the compiled model could be read.',
      error: message,
    };
  }
}
