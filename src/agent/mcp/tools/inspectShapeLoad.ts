// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Shared "run script + lower one OcctBackend shape" prelude for inspect
// subjects that read geometry (continuity, curvature, overlay).
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { resolveRootId } from '../../../modeling/buildModel';
import { runMcpScript } from '../runMcpScript';
import type { RunScriptResult } from '../../../modeling/runtime/runScript';
import type { RecomputeResult } from '../../../modeling/compute/recomputeEngine';

export interface InspectShapeInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export type LoadedInspectShape =
  | { ok: true; shape: OcctBackend; owner: string; run: RunScriptResult; recompute: RecomputeResult }
  | { ok: false; error: string; errorCode?: string };

export async function loadInspectOcctShape(input: InspectShapeInput): Promise<LoadedInspectShape> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;
  if (run.records.length === 0) {
    return { ok: false, error: 'Script returned no features.' };
  }
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const tailId = run.records[run.records.length - 1].id;
  const targetId = input.feature_id ?? resolveRootId(run.returnValue, tailId) ?? tailId;
  const shape = r.shapes.get(targetId);
  if (!shape) {
    const fatal = r.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' has no lowered shape: ${fatal.message}`
        : `Feature '${targetId}' has no lowered shape.`,
      errorCode: fatal?.code,
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }
  return { ok: true, shape, owner: targetId, run, recompute: r };
}
