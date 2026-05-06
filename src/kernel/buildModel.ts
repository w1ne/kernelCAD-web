import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ShapeBackend } from '../backends/backend';
import { initOcct } from '../backends/occt/occtBackend';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import { RecomputeEngine } from '../compute/recomputeEngine';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import type { FeatureRecord } from '../intent/featureRecord';
import type { FeatureId } from '../intent/types';
import type { CaptureSession } from '../capture/captureSession';
import type { SoftWarning } from '../runtime/softWarning';
import { runScript } from '../script-runtime/runScript';

export interface BuildModelInput {
  code: string;
  fileName: string;
}

export interface BuildModelFromFileInput {
  file: string;
}

export interface BuiltModel {
  session: CaptureSession;
  records: readonly FeatureRecord[];
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
  warnings: SoftWarning[];
  tailId?: FeatureId;
  tailShape?: ShapeBackend;
}

export async function buildModel(input: BuildModelInput): Promise<BuiltModel> {
  await initOcct();
  const run = await runScript(input);
  const session = run.session;
  const engine = new RecomputeEngine(new OcctLowerer());
  const warningsBefore = session.warnings.length;
  const result = await engine.run(run.records, {
    paramTable: session.paramTable,
    warningSink: warning => session.warnings.push(warning),
    warningPhase: 'build',
    gatedFeatureNames: session.gatedFeatureNames,
  });

  populateCache(session, result.shapes);
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const tailShape = tailId ? result.shapes.get(tailId) : undefined;

  return {
    session,
    records: run.records,
    shapes: result.shapes,
    diagnostics: result.diagnostics,
    health: result.health,
    warnings: session.warnings.slice(warningsBefore),
    tailId,
    tailShape,
  };
}

export async function buildModelFromFile(input: BuildModelFromFileInput): Promise<BuiltModel> {
  const fileName = resolve(input.file);
  const code = await readFile(fileName, 'utf8');
  return buildModel({ code, fileName });
}

export function populateCache(session: CaptureSession, shapes: Map<FeatureId, ShapeBackend>): void {
  for (const [id, shape] of shapes) {
    session.cachedShapes.set(id, shape);
  }
}
