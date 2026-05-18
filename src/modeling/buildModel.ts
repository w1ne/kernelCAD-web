import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ShapeBackend } from '../kernel/backends/backend';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from './backends/occt/occtLowerer';
import { RecomputeEngine } from './compute/recomputeEngine';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import type { CaptureSession } from './capture/captureSession';
import type { SoftWarning } from '../shared/runtime/softWarning';
import { runScript } from './runtime/runScript';
import { KernelError } from '../shared/intent/kernelError';

export interface BuildModelInput {
  code: string;
  fileName: string;
  /** Absolute directory of the source script. Threaded so `lib.fromSTEP`
   *  resolves relative paths under the calling .kcad.ts file. */
  scriptDir?: string;
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

export interface ParamUpdateEdit {
  name: string;
  value: number | boolean;
}

export interface BuiltModelParamUpdateResult {
  shape: ShapeBackend;
  relowered: string[];
  skipped: string[];
  warnings: SoftWarning[];
}

export interface BuiltModelParamUpdate {
  model: BuiltModel;
  result: BuiltModelParamUpdateResult;
}

export async function buildModel(input: BuildModelInput): Promise<BuiltModel> {
  await initOcct();
  const run = await runScript(input);
  const session = run.session;
  // Slice 2E: attach a per-session engine so `params.update` reuses it and
  // `onRelower` subscriptions added after the initial build still fire.
  const engine = new RecomputeEngine(createOcctLowerer(session));
  session.setEngine(engine);
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
  const { dirname } = await import('node:path');
  return buildModel({ code, fileName, scriptDir: dirname(fileName) });
}

export function populateCache(session: CaptureSession, shapes: Map<FeatureId, ShapeBackend>): void {
  for (const [id, shape] of shapes) {
    session.cachedShapes.set(id, shape);
  }
}

export async function updateModelParams(
  model: BuiltModel,
  edits: ParamUpdateEdit[],
): Promise<BuiltModelParamUpdate> {
  const session = model.session;
  validateParamEdits(session, edits);

  const editedNames = new Set<string>();
  for (const edit of edits) {
    session.paramTable.set(edit.name, edit.value);
    editedNames.add(edit.name);
  }

  const { seedShapes, relowered, skipped } = buildSeedShapes(session, model.records, editedNames);
  await initOcct();
  // Slice 2E: reuse the per-session engine attached by `buildModel` so any
  // `onRelower` subscribers registered after the initial build still fire on
  // this update. Fall back to a fresh engine for sessions that never went
  // through `buildModel` (e.g. tests that construct `CaptureSession` directly
  // and drive `updateModelParams`).
  const engine = session.engine ?? new RecomputeEngine(createOcctLowerer(session));
  if (!session.engine) session.setEngine(engine);
  const warningsBefore = session.warnings.length;
  const result = await engine.run(model.records, {
    paramTable: session.paramTable,
    seedShapes,
    warningSink: warning => session.warnings.push(warning),
    warningPhase: 'update',
    gatedFeatureNames: session.gatedFeatureNames,
  });

  populateCache(session, result.shapes);
  const tailId = model.records.length > 0 ? model.records[model.records.length - 1].id : undefined;
  const tailShape = tailId ? result.shapes.get(tailId) : undefined;
  if (!tailShape) {
    throw new KernelError(
      'recompute.lowering.exception',
      'params.update: no shape produced for the chain tail; check upstream diagnostics.',
      tailId,
    );
  }

  const nextModel: BuiltModel = {
    ...model,
    shapes: result.shapes,
    diagnostics: result.diagnostics,
    health: result.health,
    warnings: session.warnings.slice(warningsBefore),
    tailId,
    tailShape,
  };

  // Slice 2E: notify `onRelower` subscribers with the records re-lowered by
  // this update. Studio's WorkbenchContext subscribes server-side via the
  // session engine to live-refresh ParamsTab without a Validate press.
  engine.emitRelower(relowered);

  return {
    model: nextModel,
    result: {
      shape: tailShape,
      relowered,
      skipped,
      warnings: nextModel.warnings,
    },
  };
}

function validateParamEdits(session: CaptureSession, edits: ParamUpdateEdit[]): void {
  for (const edit of edits) {
    const entry = session.paramTable.get(edit.name);
    if (typeof edit.value !== entry.type) {
      throw new KernelError(
        'feature.invalid-args',
        `params.update: param '${edit.name}' is ${entry.type}, got ${typeof edit.value}.`,
        undefined,
        `invalid-args.param.type-mismatch — param '${edit.name}' is ${entry.type}, got ${typeof edit.value}`,
      );
    }
    if (entry.type === 'number' && entry.meta) {
      const v = edit.value as number;
      if (entry.meta.min !== undefined && v < entry.meta.min) {
        throw new KernelError(
          'feature.invalid-args',
          `params.update: param '${edit.name}' value ${v} below min ${entry.meta.min}.`,
          undefined,
          `invalid-args.param.value-out-of-range — param '${edit.name}' value ${v} below min ${entry.meta.min}`,
        );
      }
      if (entry.meta.max !== undefined && v > entry.meta.max) {
        throw new KernelError(
          'feature.invalid-args',
          `params.update: param '${edit.name}' value ${v} above max ${entry.meta.max}.`,
          undefined,
          `invalid-args.param.value-out-of-range — param '${edit.name}' value ${v} above max ${entry.meta.max}`,
        );
      }
    }
  }
}

function buildSeedShapes(
  session: CaptureSession,
  records: readonly FeatureRecord[],
  editedNames: Set<string>,
): { seedShapes: Map<FeatureId, ShapeBackend>; relowered: string[]; skipped: string[] } {
  let firstAffected = -1;
  for (let i = 0; i < records.length; i++) {
    const refs = (records[i].metadata as { paramRefs?: string[] } | undefined)?.paramRefs ?? [];
    if (refs.some(name => editedNames.has(name))) {
      firstAffected = i;
      break;
    }
  }

  const seedShapes = new Map<FeatureId, ShapeBackend>();
  const relowered: string[] = [];
  const skipped: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (firstAffected === -1 || i < firstAffected) {
      skipped.push(record.id);
      const cached = session.cachedShapes.get(record.id);
      if (cached) seedShapes.set(record.id, cached);
    } else {
      relowered.push(record.id);
    }
  }

  return { seedShapes, relowered, skipped };
}
