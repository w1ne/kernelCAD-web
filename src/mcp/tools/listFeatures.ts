// src/mcp/tools/listFeatures.ts
import { runScript } from '../../script-runtime/runScript';
import { initOcct } from '../../backends/occt/occtBackend';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FeatureKind, Param } from '../../intent/types';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ListFeaturesInput {
  file?: string;
  code?: string;
}

export interface FeatureSummary {
  id: string;
  kind: FeatureKind;
  params: Record<string, { evaluated: number; expression: string; unit: string }>;
  inputs: Record<string, unknown>;
  transformCount: number;
  suppressed: boolean;
}

export interface ListFeaturesOutput {
  /** Optional success flag. Set to `false` on error paths so callers can
   *  branch on shape uniformly with the rest of the MCP surface. The success
   *  return omits `ok` for backwards compatibility (treat undefined as ok). */
  ok?: boolean;
  features: FeatureSummary[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on the script-runtime
   *  exception path: `KernelError` code (e.g. `feature.path.duplicate-label`)
   *  or `cli.script.exception` for non-kernel throws. (This tool walks records
   *  without lowering, so there's no lowering-error path.) */
  errorCode?: string;
}

export async function listFeaturesTool(
  input: ListFeaturesInput,
): Promise<ListFeaturesOutput> {
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
      return {
        ok: false,
        features: [],
        error: `Cannot read file: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  } else {
    return { ok: false, features: [], error: 'Must provide either { file } or { code }.' };
  }

  let run;
  try {
    run = await runScript({ code, fileName });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e);
    return { ok: false, features: [], error: diag.message, errorCode: diag.code };
  }

  const features: FeatureSummary[] = run.records.map(r => ({
    id: r.id,
    kind: r.kind,
    params: Object.fromEntries(
      Object.entries(r.params).map(([k, p]: [string, Param]) => [
        k,
        { evaluated: p.evaluated, expression: p.expression, unit: p.unit },
      ]),
    ),
    inputs: r.inputs,
    transformCount: r.transforms.length,
    suppressed: r.suppressed,
  }));

  return { features };
}
