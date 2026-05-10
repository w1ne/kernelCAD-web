import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { runScript } from './runScript';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureKind } from '../intent/types';
import type { ParamTable } from '../runtime/paramTable';

export interface LoadedScript {
  source: string;
  features: { id: string; kind: FeatureKind; record: FeatureRecord }[];
  paramTable: ParamTable;
}

export async function loadScriptFeatures(scriptPath: string): Promise<LoadedScript> {
  const source = readFileSync(scriptPath, 'utf8');
  const fileName = basename(scriptPath);
  const { records, paramTable } = await runScript({ code: source, fileName });
  return {
    source,
    paramTable,
    features: records.map((r) => ({ id: r.id, kind: r.kind, record: r })),
  };
}
