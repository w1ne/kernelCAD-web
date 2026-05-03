import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { runScript } from '../../src/script-runtime/runScript';
import type { FeatureRecord } from '../../src/intent/featureRecord';
import type { FeatureKind } from '../../src/intent/types';

export interface LoadedScript {
  source: string;
  features: { id: string; kind: FeatureKind; record: FeatureRecord }[];
}

export async function loadScriptFeatures(scriptPath: string): Promise<LoadedScript> {
  const source = readFileSync(scriptPath, 'utf8');
  const fileName = basename(scriptPath);
  const { records } = await runScript({ code: source, fileName });
  return {
    source,
    features: records.map((r) => ({ id: r.id, kind: r.kind, record: r })),
  };
}
