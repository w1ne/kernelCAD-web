// src/mcp/tools/listFeatures.ts
import { runScript } from '../../script-runtime/runScript';
import { initOcct } from '../../backends/occt/occtBackend';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FeatureKind, Param } from '../../intent/types';

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
  features: FeatureSummary[];
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
    code = await readFile(filePath, 'utf8');
  } else {
    return { features: [] };
  }

  let run;
  try {
    run = await runScript({ code, fileName });
  } catch {
    return { features: [] };
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
