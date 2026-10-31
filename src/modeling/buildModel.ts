// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ShapeBackend } from '../kernel/backends/backend';
import { initOcct } from '../kernel/backends/occt/occtBackend';
import { createLowerer, resolveKernel } from './backends/kernelRegistry';
import type { KernelId } from '../shared/types/backendTarget';
import { RecomputeEngine } from './compute/recomputeEngine';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';
import type { SelectionRecord } from '../shared/intent/selectionRecord';
import { selectionDriftDiagnostics } from '../kernel/naming/selectionDrift';
import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import type { CaptureSession } from './capture/captureSession';
import type { SoftWarning } from '../shared/runtime/softWarning';
import { runScript, type RunScriptFacadeOptions } from './runtime/runScript';
import { copyDrilledPolarFrames } from '../shared/intent/drilledPolarFrame';
import { computeGraphReuse, type RecordHealth } from './compute/prefixReuse';
import { populateCache } from './paramUpdate';
import { assembleBuiltModel, builtModelFromRun, resolveRootId } from './builtModelFromRun';

export { updateModelParams } from './paramUpdate';
export { populateCache, resolveRootId };
export type { UpdateModelParamsOptions } from './paramUpdate';

export interface BuildModelInput {
  code: string;
  fileName: string;
  /** Absolute directory of the source script. Threaded so `lib.fromSTEP`
   *  resolves relative paths under the calling .kcad.ts file. */
  scriptDir?: string;
  /** Solid-modeling kernel to build on. Omitted = DEFAULT_KERNEL ('occt').
   *  A kernel that is not available in this build throws KernelUnavailableError
   *  before any work is done. */
  kernel?: KernelId;
}

export interface BuildModelFromFileInput {
  file: string;
  /** See BuildModelInput.kernel. */
  kernel?: KernelId;
}

export interface BuiltModel {
  session: CaptureSession;
  records: readonly FeatureRecord[];
  shapes: Map<FeatureId, ShapeBackend>;
  diagnostics: CompilerDiagnostic[];
  health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
  warnings: SoftWarning[];
  /** What every feature's selectors bound to in this build. The baseline for
   *  the next evaluation of the same model: see `selectionDriftDiagnostics`. */
  selections: SelectionRecord[];
  tailId?: FeatureId;
  /**
   * WARNING — last-CREATED record, NOT the script's return value. Mutating
   * transforms (`.translate()` / `.rotate()`) append to an existing record,
   * so `return part.translate(...)` does not move the tail — but a helper
   * shape created after the main body DOES. Use `rootShape` for anything
   * that measures, probes, or exports "the model". Kept for transform /
   * animation consumers that genuinely want the newest record.
   */
  tailShape?: ShapeBackend;
  /** Feature id of the script's `return` value (Shape or Scene). Falls
   *  back to `tailId` when the script returned nothing lowerable. */
  rootId?: FeatureId;
  /** Lowered shape of the script's `return` value. Prefer this over
   *  `tailShape` in export / probe / measurement consumers. */
  rootShape?: ShapeBackend;
  /** The raw value the script `return`ed (Shape, Scene, array of Shapes, or
   *  anything else). Threaded so the agent-parts-discipline check can tell a
   *  multi-body non-assembly return (array of Shapes) apart from an
   *  assembly-built Scene without re-deriving from the lowered geometry. */
  returnValue?: unknown;
  /** The script source text. Threaded so review/analysis passes (e.g. the
   *  unstructured-bodies check) can read returned-variable names via the AST
   *  helpers without re-reading the file. */
  code?: string;
}

export interface ParamUpdateEdit {
  name: string;
  value: number | boolean | string;
}

export interface BuiltModelParamUpdateResult {
  shape: ShapeBackend;
  relowered: string[];
  skipped: string[];
  warnings: SoftWarning[];
  /** Affected features placed from the cached solid instead of lowered. */
  rigidReused: string[];
}

export interface BuiltModelParamUpdate {
  model: BuiltModel;
  result: BuiltModelParamUpdateResult;
}

export async function buildModel(
  input: BuildModelInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
  const kernel = resolveKernel(input.kernel);
  await initOcct();
  const run = await runScript(input, opts);
  return builtModelFromRun(run, session => createLowerer(kernel, session), input.code);
}

/**
 * Incremental code-edit rebuild: dependency-aware reuse (`computeGraphReuse`).
 *
 * `buildModel` re-lowers every record from scratch on a code edit. This
 * re-captures the script (cheap: JS execution) and seeds every record the
 * edit provably did not touch: same id, healthy cached shape in the previous
 * build, identical resolved structural hash, and every input it consumes
 * itself reused. A change anywhere — an appended feature, a dimension in the
 * middle, a param default rewritten in the source — re-lowers the changed
 * records and everything downstream of them, nothing else.
 *
 * When nothing is reusable, or on any unexpected condition, it falls back to a
 * full `buildModel(input)`, so it never renders a stale model. See
 * docs/specs/2026-06-14-incremental-code-rebuild-design.md (kernelCAD-private).
 */
/** Copy triangle meshes whose lowered shapes were reused object-identically.
 *  A fresh session has empty mesh caches, so the next `meshFeaturesPerFeature`
 *  would tessellate the whole prefix again. Identity is the proof the shape
 *  was seeded, not rebuilt. */
export function carryReusableMeshes(prev: BuiltModel, next: BuiltModel): void {
  for (const [id, mesh] of prev.session.cachedFeatureMeshes) {
    if (next.shapes.get(id) === prev.shapes.get(id)) {
      next.session.cachedFeatureMeshes.set(id, mesh);
    }
  }
  for (const [id, parts] of prev.session.cachedAssemblyPartMeshes) {
    if (next.shapes.get(id) === prev.shapes.get(id)) {
      next.session.cachedAssemblyPartMeshes.set(id, parts);
    }
  }
}

/** Full build on the first edit. On a later edit, reuse the previous model
 *  when the new script is a proven append; otherwise `rebuildModelIncremental`
 *  falls back to a full build and no mesh is carried. */
export async function modelForEditedMesh(
  prev: BuiltModel | undefined,
  input: BuildModelInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
  if (!prev) return buildModel(input, opts);
  const next = await rebuildModelIncremental(prev, input, opts);
  carryReusableMeshes(prev, next);
  return next;
}

export async function rebuildModelIncremental(
  prevModel: BuiltModel,
  input: BuildModelInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
  const kernel = resolveKernel(input.kernel);
  await initOcct();

  // 1. Capture the new script. Capture is cheap (JS execution); the expensive
  //    work is lowering, which we want to skip for the unchanged prefix. If the
  //    script throws, fall back — `buildModel` reproduces the same failure path.
  let run;
  try {
    run = await runScript(input, opts);
  } catch {
    return buildModel(input, opts);
  }
  const session = run.session;

  // 2. Find the records the edit provably did not touch.
  const prevHealth: ReadonlyMap<string, RecordHealth> = prevModel.health;
  const decision = computeGraphReuse({
    prevRecords: prevModel.records,
    nextRecords: run.records,
    prevParamTable: prevModel.session.paramTable,
    nextParamTable: session.paramTable,
    hasCachedShape: id => prevModel.session.cachedShapes.has(id),
    prevHealth,
  });

  if (decision.reusableIds.length === 0) {
    // Nothing provably unchanged → full rebuild. The session we just captured is
    // discarded; `buildModel` re-runs the script in a fresh session. Re-running
    // is acceptable: capture is cheap and re-running guarantees the fallback is
    // byte-identical to the normal build path (no half-seeded state leaks).
    return withSelectionDrift(prevModel.selections, await buildModel(input, opts));
  }

  // Seeded holes are not lowered again. The new capture has no cut-frame
  // axis yet; copy it from the records that drilled those holes.
  copyDrilledPolarFrames(prevModel.records, run.records, decision.reusableIds);

  // 3. Seed the engine with those cached shapes; lower only the rest.
  const seedShapes = new Map<FeatureId, ShapeBackend>();
  for (const id of decision.reusableIds) {
    const cached = prevModel.session.cachedShapes.get(id);
    // Defensive: computeGraphReuse already verified presence, but a missing
    // entry here would mean lowering a record whose upstream shape we promised
    // to seed — fall back rather than risk it.
    if (!cached) return withSelectionDrift(prevModel.selections, await buildModel(input, opts));
    seedShapes.set(id, cached);
  }

  const engine = new RecomputeEngine(createLowerer(kernel, session));
  session.setEngine(engine);
  const warningsBefore = session.warnings.length;
  const result = await engine.run(run.records, {
    paramTable: session.paramTable,
    seedShapes,
    seedSelections: prevModel.selections,
    warningSink: warning => session.warnings.push(warning),
    warningPhase: 'build',
    gatedFeatureNames: session.gatedFeatureNames,
  });

  return withSelectionDrift(prevModel.selections, assembleBuiltModel(session, run, result, warningsBefore, input.code));
}

/** `next` with the drift of its selectors from `baseline` appended to its
 *  diagnostics. Mutates nothing in `baseline`. */
export function withSelectionDrift(baseline: readonly SelectionRecord[], next: BuiltModel): BuiltModel {
  next.diagnostics.push(...selectionDriftDiagnostics(baseline, next.selections));
  return next;
}

export async function buildModelFromFile(
  input: BuildModelFromFileInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
  resolveKernel(input.kernel);
  const fileName = resolve(input.file);
  const code = await readFile(fileName, 'utf8');
  const { dirname } = await import('node:path');
  return buildModel(
    { code, fileName, scriptDir: dirname(fileName), ...(input.kernel !== undefined ? { kernel: input.kernel } : {}) },
    opts,
  );
}
