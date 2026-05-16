import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { runScript } from './runScript';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureKind } from '../intent/types';
import type { ParamTable } from '../runtime/paramTable';
import type { CaptureSession } from '../capture/captureSession';

export interface LoadedScript {
  source: string;
  features: { id: string; kind: FeatureKind; record: FeatureRecord }[];
  paramTable: ParamTable;
  /** v0.5: the underlying capture session, so callers can wire its
   *  `importedGeometry` map into a lowerer for `lib.fromSTEP` records. */
  session: CaptureSession;
}

export async function loadScriptFeatures(scriptPath: string): Promise<LoadedScript> {
  // W2.3: capture-time scripts may call sdf.materialize / OcctBackend
  // factories which require initOcct(). runMcpScript already inits OCCT; the
  // direct loadScriptFeatures path (captureDemo, eval runner) must mirror that
  // contract or sdf.materialize throws "OCCT not initialized" at capture time.
  await initOcct();
  const source = readFileSync(scriptPath, 'utf8');
  const fileName = basename(scriptPath);
  const scriptDir = dirname(resolve(scriptPath));
  const { records, paramTable, session } = await runScript({ code: source, fileName, scriptDir });
  return {
    source,
    paramTable,
    session,
    features: records.map((r) => ({ id: r.id, kind: r.kind, record: r })),
  };
}
