// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Param-update orchestration, extracted from `buildModel.ts` so `captureSession.ts`
// can reach it without an edge to the build pipeline. `buildModel` statically
// imports `runScript` → `runScriptCore` → `captureSession`, so any
// `captureSession` → `buildModel` edge (dynamic import included) is a cycle.
// `buildModel.ts` re-exports these symbols unchanged.

import type { ShapeBackend } from '../kernel/backends/backend';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { createOcctLowerer } from './backends/occt/occtLowerer';
import { RecomputeEngine } from './compute/recomputeEngine';
import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import type { CaptureSession } from './capture/captureSession';
import type { BuiltModel, BuiltModelParamUpdate, ParamUpdateEdit } from './buildModel';
import type { SoftWarning } from '../shared/runtime/softWarning';
import { KernelError } from '../shared/intent/kernelError';
import { affectedFeatureIds } from './paramAffect';
import { setParamValue } from './edits/setParamValue';
import { invalidArgs } from '../shared/intent/invalidArgs';
import { selectionDriftDiagnostics } from '../kernel/naming/selectionDrift';
import { stampFingerprint } from '../kernel/backends/occt/analysisMemo';
import { featureFingerprints } from './warm/featureFingerprint';
import { releaseReplacedShapes } from './warm/releaseShapes';
import { captureBaseline, failedFeatureIds, planRigidReuse, settleFeatureFailures } from './warm/rigidReuse';
import type { ParamValue } from '../shared/runtime/paramTable';

export function populateCache(session: CaptureSession, shapes: Map<FeatureId, ShapeBackend>): void {
  for (const [id, shape] of shapes) {
    session.cachedShapes.set(id, shape);
  }
}

/** Internal options for `updateModelParams`. Not part of the params.update
 *  public API surface — only server-side batch callers (e.g. the animation
 *  bake sweep) set these. */
export interface UpdateModelParamsOptions {
  /** Suppress the `engine.emitRelower(...)` notification for this solve. The
   *  model still re-solves and the cache is repopulated exactly as normal; only
   *  the host-side relower hub fan-out is skipped. Used by the animation-bake
   *  sweep so its N per-frame pose solves do NOT each trigger an SSE relower
   *  (and a client `/transforms` re-fetch + viewport twitch); the bake emits a
   *  single relower itself after restoring the pre-bake pose. */
  silent?: boolean;
  /**
   * Drag preview. Finish features that do not read the edited parameters
   * pass their input solid through. The release update leaves this unset.
   */
  preview?: boolean;
}

/** Diagnostics and selections of a param update. A drag preview skips finish
 *  features, so its selections are partial: keep the last full set as the
 *  baseline and report nothing. */
function selectionsAfterUpdate(
  model: BuiltModel,
  result: { diagnostics: BuiltModel['diagnostics']; selections: BuiltModel['selections'] },
  preview: boolean,
): Pick<BuiltModel, 'diagnostics' | 'selections'> {
  if (preview) return { diagnostics: result.diagnostics, selections: model.selections };
  return {
    diagnostics: [...result.diagnostics, ...selectionDriftDiagnostics(model.selections, result.selections)],
    selections: result.selections,
  };
}

function savedParamValues(session: CaptureSession, edits: readonly ParamUpdateEdit[]): Array<{ name: string; value: ParamValue }> {
  return edits.map((edit) => ({ name: edit.name, value: session.paramTable.get(edit.name).value }));
}

function restoreParamValues(session: CaptureSession, saved: readonly { name: string; value: ParamValue }[]): void {
  for (const entry of saved) session.paramTable.set(entry.name, entry.value);
}

export async function updateModelParams(
  model: BuiltModel,
  edits: ParamUpdateEdit[],
  options?: UpdateModelParamsOptions,
): Promise<BuiltModelParamUpdate> {
  const session = model.session;
  validateParamEdits(session, edits);
  if (edits.some((edit) => session.coercedParams.has(edit.name))) {
    return updateBySourceRewrite(model, edits);
  }
  // Shapes in the cache still match the table. Captured before the edit so a
  // later failure can put the table back and a rigid placement has a baseline.
  captureBaseline(session, model.records);
  const saved = savedParamValues(session, edits);
  try {
    return await applyParamEdits(model, edits, options);
  } catch (err) {
    restoreParamValues(session, saved);
    throw err;
  }
}

/**
 * A param the script used as a plain number (`w + 4`) is baked into its
 * captured records, so re-lowering against the edited table would leave
 * those features stale. Instead: write the new defaults into the source,
 * re-run the script and rebuild with dependency-aware reuse, so only the
 * features whose inputs changed are lowered again. The model object is
 * refreshed in place (callers hold it) and left untouched on failure.
 */
async function updateBySourceRewrite(model: BuiltModel, edits: ParamUpdateEdit[]): Promise<BuiltModelParamUpdate> {
  const coerced = edits.filter((edit) => model.session.coercedParams.has(edit.name)).map((edit) => edit.name);
  if (model.code === undefined || !model.rebuildFromSource) {
    invalidArgs({
      api: 'params.update(edits)',
      path: 'edits[].name',
      got: coerced.join(', '),
      requires: 'a model built from script source, because these params are used as plain numbers and an edit re-runs the script',
      example: "const model = await buildModel({ code, fileName: 'part.kcad.ts' }); await updateModelParams(model, [{ name: 'w', value: 80 }]);",
      hintSlug: 'invalid-args.param.js-arithmetic',
    });
  }
  let code = model.code;
  for (const edit of edits) {
    const rewritten = setParamValue(code, edit.name, edit.value);
    if (!rewritten.ok || rewritten.new_code === undefined) {
      invalidArgs({
        api: 'params.update(edits)',
        path: 'edits[].name',
        got: edit.name,
        requires: `a param declared with a literal default that the source can be rewritten at (${rewritten.error ?? 'not found'})`,
        example: "const w = param('w', 60);",
        hintSlug: 'invalid-args.param.not-found',
      });
    }
    code = rewritten.new_code;
  }
  const previousShapes = new Map(model.shapes);
  const next = await model.rebuildFromSource(code);
  const failure = next.diagnostics.find((d) => d.severity === 'error');
  if (failure) {
    throw new KernelError(failure.code, `params.update: ${failure.message}`, undefined, failure.hint);
  }
  const shape = next.rootShape ?? next.tailShape;
  if (!shape) {
    invalidArgs({
      api: 'params.update(edits)',
      path: '',
      gotText: 'a rebuilt script with no returned shape',
      requires: 'the script to return a shape or scene',
      example: "return box(param('w', 60), 30, 5);",
      hintSlug: 'invalid-args.param.js-arithmetic',
    });
  }
  const relowered: string[] = [];
  const skipped: string[] = [];
  for (const record of next.records) {
    (next.shapes.get(record.id) === previousShapes.get(record.id) ? skipped : relowered).push(record.id);
  }
  Object.assign(model, next);
  return { model, result: { shape, relowered, skipped, warnings: next.warnings, rigidReused: [] } };
}

async function applyParamEdits(
  model: BuiltModel,
  edits: ParamUpdateEdit[],
  options: UpdateModelParamsOptions | undefined,
): Promise<BuiltModelParamUpdate> {
  const session = model.session;
  const editedNames = new Set<string>();
  for (const edit of edits) {
    session.paramTable.set(edit.name, edit.value);
    editedNames.add(edit.name);
  }

  const { seedShapes, relowered, skipped, rigidReused } = buildSeedShapes(session, model.records, editedNames);
  await initOcct();
  // Slice 2E: reuse the per-session engine attached by `buildModel` so any
  // `onRelower` subscribers registered after the initial build still fire on
  // this update. Some callers bypass `buildModel` and drive `params.update`
  // off a bare `runScript` result (eval corpus harnesses, legacy unit tests).
  // For those paths, lazily attach a fresh engine to the session so
  // subsequent updates reuse it. Studio's path always goes through
  // `buildModel`, so its onRelower subscribers (registered against the
  // session's attached engine) keep firing consistently.
  //
  // `session.engine` is typed as the structural `SessionRecomputeEngineHandle`
  // so `captureSession.ts` stays free of recompute imports per the
  // architecture-boundary guard. The actual instance is a RecomputeEngine.
  let handle = session.engine;
  if (!handle) {
    const fresh = new RecomputeEngine(createOcctLowerer(session));
    session.setEngine(fresh);
    handle = fresh;
  }
  const engine = handle as RecomputeEngine;
  const warningsBefore = session.warnings.length;
  const result = await engine.run(model.records, {
    paramTable: session.paramTable,
    seedShapes,
    seedSelections: model.selections,
    ...(options?.preview ? { previewFinish: true, previewEdited: editedNames } : {}),
    warningSink: (warning: SoftWarning) => session.warnings.push(warning),
    warningPhase: 'update',
    gatedFeatureNames: session.gatedFeatureNames,
  });

  const produced = producedShape(model, result.shapes);
  if (options?.preview !== true) {
    settleFeatureFailures(session, featureErrorIds(result.diagnostics), relowered);
  }
  // The caller's BuiltModel can still point at an older generation than the
  // session cache (animation frames, param sweeps). Both are previous solids.
  // Snapshot before populateCache overwrites the cache entries.
  const replaced = options?.preview === true
    ? undefined
    : [...model.shapes.values(), ...session.cachedShapes.values()];
  populateCache(session, result.shapes);
  // Preview keeps the previous solids: the passthrough shapes alias them,
  // and the release edit is what replaces the baseline. Shapes a host still
  // serves (the local MCP viewer) stay in the keep set via releaseReplacedShapes.
  if (replaced) {
    releaseReplacedShapes(replaced, session.cachedShapes.values());
  }
  stampAnalyses(model.records, session.paramTable, result.shapes, session.getSurfaceRecords());
  // This run lowered (or reused) every record under the edited param table,
  // so it is the session's full lower now. Recording it lets the next
  // `meshFeaturesPerFeature` mesh the re-lowered shapes instead of lowering
  // them a second time. `snapshotFullLower` stamps the current param table
  // and gates, so a later edit invalidates it as before.
  session.lastFullLower = { ...session.snapshotFullLower(new Map()), shapes: result.shapes };
  // Invalidate mesh caches for records that actually re-lowered. Records in
  // `skipped` reused their cached shape and so their cached triangle mesh is
  // still valid; records in `relowered` produced a fresh shape so their
  // cached triangle data is stale. For solvedAssembly records re-lowered by
  // a pose-only edit, the assembly entry stays valid for per-part LOCAL
  // triangle data (only worldTransforms change) — but we keep the simple
  // policy here and let the meshing layer re-decide; the assembly path's
  // cache is keyed by (assemblyId, partName) and the geometry hash is
  // implicitly the upstream part record's lowered shape, which remains
  // cached. So skipping the assembly cache invalidation is correct.
  for (const id of relowered) {
    session.cachedFeatureMeshes.delete(id);
  }

  const nextModel: BuiltModel = {
    ...model,
    shapes: result.shapes,
    ...selectionsAfterUpdate(model, result, options?.preview === true),
    health: result.health,
    warnings: session.warnings.slice(warningsBefore),
    tailId: produced.tailId,
    tailShape: produced.tailShape,
    rootShape: produced.rootShape,
  };

  // Slice 2E: notify `onRelower` subscribers with the records re-lowered by
  // this update. Studio's WorkbenchContext subscribes server-side via the
  // session engine to live-refresh ParamsTab without a Validate press.
  // `silent` callers (animation-bake per-frame sweep) skip this fan-out so a
  // single bake doesn't emit one SSE relower per baked frame.
  if (!options?.silent) {
    engine.emitRelower(relowered);
  }

  return {
    model: nextModel,
    result: {
      shape: produced.shape,
      relowered,
      skipped,
      rigidReused,
      warnings: nextModel.warnings,
    },
  };
}

function producedShape(
  model: BuiltModel,
  shapes: Map<FeatureId, ShapeBackend>,
): { shape: ShapeBackend; tailId?: FeatureId; tailShape?: ShapeBackend; rootShape?: ShapeBackend } {
  const tailId = model.records.length > 0 ? model.records[model.records.length - 1].id : undefined;
  const tailShape = tailId ? shapes.get(tailId) : undefined;
  const rootShape = model.rootId ? shapes.get(model.rootId) : undefined;
  // A virtual tail (`shape.dimension()`, `shape.datum()`, ...) has no shape
  // of its own; the returned root still does. Checked before the cache is
  // replaced so a failure leaves the previous solids in place.
  const shape = tailShape ?? rootShape;
  if (!shape) {
    throw new KernelError(
      'recompute.lowering.exception',
      'params.update: no shape produced for the chain tail; check upstream diagnostics.',
      tailId,
    );
  }
  return { shape, tailId, tailShape, rootShape };
}

function stampAnalyses(
  records: readonly FeatureRecord[],
  paramTable: CaptureSession['paramTable'],
  shapes: ReadonlyMap<string, ShapeBackend>,
  surfaces: ReturnType<CaptureSession['getSurfaceRecords']>,
): void {
  const fingerprints = featureFingerprints(records, paramTable, surfaces);
  for (const [id, fpShape] of shapes) {
    const fp = fingerprints.get(id);
    if (fp) stampFingerprint(fpShape, fp);
  }
}

function validateParamEdits(session: CaptureSession, edits: ParamUpdateEdit[]): void {
  for (const edit of edits) {
    const entry = session.paramTable.get(edit.name);
    // 'choice', 'string' and 'color' params are all JS strings — only 'number' and
    // 'boolean' map 1:1 to their JS typeof. Full validation (choice
    // membership, maxLength, numeric bounds) happens in `paramTable.set`
    // below; this is a fast pre-check so a bad edit throws before any
    // re-lower work starts.
    const expectedJsType = entry.type === 'number' || entry.type === 'boolean' ? entry.type : 'string';
    if (typeof edit.value !== expectedJsType) {
      throw new KernelError(
        'feature.invalid-args',
        `params.update: param '${edit.name}' is ${entry.type}, got ${typeof edit.value}.`,
        undefined,
        `invalid-args.param.type-mismatch — param '${edit.name}' is ${entry.type}, got ${typeof edit.value}`,
      );
    }
    if (entry.type === 'choice' && entry.meta?.choices && !entry.meta.choices.includes(edit.value as string)) {
      throw new KernelError(
        'feature.invalid-args',
        `params.update: param '${edit.name}' value '${edit.value}' is not one of the declared choices: ${entry.meta.choices.join(', ')}.`,
        undefined,
        `invalid-args.param.choice-invalid — param '${edit.name}' value '${edit.value}' is not one of [${entry.meta.choices.join(', ')}]`,
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

function featureErrorIds(diagnostics: readonly { severity: string; featureId?: string }[]): string[] {
  const ids: string[] = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 'error' && diagnostic.featureId) ids.push(diagnostic.featureId);
  }
  return ids;
}

function buildSeedShapes(
  session: CaptureSession,
  records: readonly FeatureRecord[],
  editedNames: Set<string>,
): { seedShapes: Map<FeatureId, ShapeBackend>; relowered: string[]; skipped: string[]; rigidReused: string[] } {
  const affected = affectedFeatureIds(records, editedNames);
  const { seeds: rigid, blocked } = planRigidReuse(session, records, affected);
  const failed = failedFeatureIds(session);
  const seedShapes = new Map<FeatureId, ShapeBackend>();
  const relowered: string[] = [];
  const skipped: string[] = [];
  const rigidReused: string[] = [];

  for (const record of records) {
    // A selector's placed ancestor, or a feature that last lowered with an
    // error, is not seeded. The cached solid is not the baseline.
    if (blocked.has(record.id) || failed.has(record.id)) {
      relowered.push(record.id);
      continue;
    }
    if (affected.has(record.id)) {
      const placed = rigid.get(record.id);
      if (placed) {
        rigidReused.push(record.id);
        seedShapes.set(record.id, placed);
        // A zero motion reuses the same solid, so its mesh is still valid.
        if (placed === session.cachedShapes.get(record.id)) skipped.push(record.id);
        else relowered.push(record.id);
        continue;
      }
      relowered.push(record.id);
      continue;
    }
    skipped.push(record.id);
    const cached = session.cachedShapes.get(record.id);
    if (cached) seedShapes.set(record.id, cached);
  }

  return { seedShapes, relowered, skipped, rigidReused };
}
