// src/mcp/tools/getShapeInfo.ts
import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import type { FeatureKind } from '../../../shared/intent/types';
import { runMcpScript } from '../runMcpScript';
import { defineMCPTool } from '../defineMCPTool';

export interface GetShapeInfoInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export interface ShapeInfo {
  id: string;
  kind: FeatureKind;
  volume: number;
  surfaceArea: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export interface GetShapeInfoOutput {
  ok: boolean;
  shape?: ShapeInfo;
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code (e.g.
   *  `feature.invalid-args`) or `cli.script-exception` for non-kernel
   *  throws; (2) lowering-error path → the first error diagnostic's `code`
   *  (e.g. `feature.selection.no-match`). */
  errorCode?: string;
}

export async function getShapeInfoTool(
  input: GetShapeInfoInput,
): Promise<GetShapeInfoOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;

  if (run.records.length === 0) {
    return { ok: false, error: 'Script produced no features.' };
  }

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const targetRecord = run.records.find(r => r.id === targetId);
  if (!targetRecord) {
    return { ok: false, error: `feature_id '${targetId}' not found in script's features.` };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const result = await engine.run(run.records, { paramTable: run.paramTable });
  const shape = result.shapes.get(targetId);
  if (!shape) {
    const fatal = result.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' did not lower successfully: ${fatal.message}`
        : `Feature '${targetId}' was not lowered.`,
      errorCode: fatal?.code,
    };
  }

  const bb = shape.boundingBox();

  return {
    ok: true,
    shape: {
      id: targetId,
      kind: targetRecord.kind,
      volume: shape.volume(),
      surfaceArea: shape.surfaceArea(),
      bbox: { min: bb.min, max: bb.max },
    },
  };
}

export const getShapeInfoMcpTool = defineMCPTool<GetShapeInfoInput>({
  name: 'get_shape_info',
  description:
    'Run + recompute a script, return volume/surfaceArea/bbox for one feature (default: last). ' +
    'Pass { file?, code?, feature_id? }.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
      code: { type: 'string', description: 'Inline kernelCAD script source.' },
      feature_id: {
        type: 'string',
        description: 'Feature id to inspect. Defaults to the last captured feature.',
      },
    },
  },
  handler: getShapeInfoTool,
});
