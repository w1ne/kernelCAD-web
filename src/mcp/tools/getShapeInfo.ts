// src/mcp/tools/getShapeInfo.ts
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct } from '../../backends/occt/occtBackend';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FeatureKind } from '../../intent/types';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

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
   *  `feature.path.duplicate-label`) or `cli.script.exception` for non-kernel
   *  throws; (2) lowering-error path → the first error diagnostic's `code`
   *  (e.g. `feature.edge-feature.no-edges-match`). */
  errorCode?: string;
}

export async function getShapeInfoTool(
  input: GetShapeInfoInput,
): Promise<GetShapeInfoOutput> {
  await initOcct();

  let code: string;
  let fileName: string;

  if (input.code !== undefined) {
    code = input.code;
    fileName = input.file ?? '<inline>';
  } else if (input.file !== undefined) {
    const filePath = resolve(input.file);
    fileName = filePath;
    try {
      code = await readFile(filePath, 'utf8');
    } catch (e) {
      return { ok: false, error: `Cannot read file: ${e instanceof Error ? e.message : String(e)}` };
    }
  } else {
    return { ok: false, error: 'Must provide either { file } or { code }.' };
  }

  let run;
  try {
    run = await runScript({ code, fileName });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e);
    return { ok: false, error: diag.message, errorCode: diag.code };
  }

  if (run.records.length === 0) {
    return { ok: false, error: 'Script produced no features.' };
  }

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const targetRecord = run.records.find(r => r.id === targetId);
  if (!targetRecord) {
    return { ok: false, error: `feature_id '${targetId}' not found in script's features.` };
  }

  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(run.records);
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
