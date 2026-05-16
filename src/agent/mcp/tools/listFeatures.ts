import type { FeatureKind, Param } from '../../../shared/intent/types';
import { runMcpScript } from '../runMcpScript';

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
   *  exception path: `KernelError` code (e.g. `feature.invalid-args`)
   *  or `cli.script-exception` for non-kernel throws. (This tool walks records
   *  without lowering, so there's no lowering-error path.) */
  errorCode?: string;
}

export async function listFeaturesTool(
  input: ListFeaturesInput,
): Promise<ListFeaturesOutput> {
  const result = await runMcpScript(input);
  if (!result.ok) return { ok: false, features: [], error: result.error, errorCode: result.errorCode };
  const { run } = result;

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
