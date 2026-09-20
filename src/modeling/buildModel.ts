// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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
import { runScript, type RunScriptFacadeOptions } from './runtime/runScript';
import { Shape } from './capture/proxy';
import { Scene } from './validation/scene';
import { computePrefixReuse, type RecordHealth } from './compute/prefixReuse';
import { populateCache } from './paramUpdate';

export { updateModelParams } from './paramUpdate';
export { populateCache };
export type { UpdateModelParamsOptions } from './paramUpdate';

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
}

export interface BuiltModelParamUpdate {
  model: BuiltModel;
  result: BuiltModelParamUpdateResult;
}

export async function buildModel(
  input: BuildModelInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
  await initOcct();
  const run = await runScript(input, opts);
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

  return assembleBuiltModel(session, run, result, warningsBefore, input.code);
}

/**
 * Incremental code-edit rebuild — Slice 1 (append-only prefix reuse).
 *
 * `buildModel` re-lowers every record from scratch on a code edit. When an
 * agent APPENDS a feature to the end of the script, the unchanged prefix is
 * re-lowered needlessly. This function reuses the previous build's cached
 * prefix shapes ONLY when it can prove the new record list is a pure
 * append/strict-prefix-superset of the previous one (same ids, same resolved
 * structural hash for the entire shared prefix, every prefix record healthy +
 * cached). In that case it seeds the engine with the cached prefix shapes and
 * lowers only the appended tail.
 *
 * In EVERY other case — an edit/insert/delete anywhere in the prefix, any hash
 * mismatch, a missing cached shape, a non-healthy prefix record, or any
 * unexpected condition — it falls back to a full `buildModel(input)`. Its
 * output is shape-identical to `buildModel` for the append case and is
 * literally `buildModel`'s output otherwise, so it never renders a stale or
 * wrong model. See docs/specs/2026-06-14-incremental-code-rebuild-design.md.
 *
 * Slice 1 ships this alongside `buildModel`; existing callers are untouched.
 */
export async function rebuildModelIncremental(
  prevModel: BuiltModel,
  input: BuildModelInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
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

  // 2. Decide whether the entire previous record list is a healthy, cached
  //    prefix of the new one (pure append).
  const prevHealth: ReadonlyMap<string, RecordHealth> = prevModel.health;
  const decision = computePrefixReuse({
    prevRecords: prevModel.records,
    nextRecords: run.records,
    prevParamTable: prevModel.session.paramTable,
    nextParamTable: session.paramTable,
    hasCachedShape: id => prevModel.session.cachedShapes.has(id),
    prevHealth,
  });

  if (!decision.reusable) {
    // Not a provable append → full rebuild. The session we just captured is
    // discarded; `buildModel` re-runs the script in a fresh session. Re-running
    // is acceptable: capture is cheap and re-running guarantees the fallback is
    // byte-identical to the normal build path (no half-seeded state leaks).
    return buildModel(input, opts);
  }

  // 3. Seed the engine with the previous build's cached prefix shapes and lower
  //    only the appended tail.
  const seedShapes = new Map<FeatureId, ShapeBackend>();
  for (const id of decision.reusableIds) {
    const cached = prevModel.session.cachedShapes.get(id);
    // Defensive: computePrefixReuse already verified presence, but a missing
    // entry here would mean lowering a record whose upstream shape we promised
    // to seed — fall back rather than risk it.
    if (!cached) return buildModel(input, opts);
    seedShapes.set(id, cached);
  }

  const engine = new RecomputeEngine(createOcctLowerer(session));
  session.setEngine(engine);
  const warningsBefore = session.warnings.length;
  const result = await engine.run(run.records, {
    paramTable: session.paramTable,
    seedShapes,
    warningSink: warning => session.warnings.push(warning),
    warningPhase: 'build',
    gatedFeatureNames: session.gatedFeatureNames,
  });

  return assembleBuiltModel(session, run, result, warningsBefore, input.code);
}

/** Shared post-`engine.run` assembly for `buildModel` /
 *  `rebuildModelIncremental`: populates the session cache and derives the
 *  tail/root shapes onto a `BuiltModel`. Keeping this in one place guarantees
 *  the incremental path produces a `BuiltModel` shaped exactly like the full
 *  build's. */
function assembleBuiltModel(
  session: CaptureSession,
  run: { records: readonly FeatureRecord[]; returnValue: unknown },
  result: {
    shapes: Map<FeatureId, ShapeBackend>;
    diagnostics: CompilerDiagnostic[];
    health: Map<FeatureId, 'healthy' | 'warning' | 'error'>;
  },
  warningsBefore: number,
  code: string,
): BuiltModel {
  populateCache(session, result.shapes);
  const tailId = run.records.length > 0 ? run.records[run.records.length - 1].id : undefined;
  const tailShape = tailId ? result.shapes.get(tailId) : undefined;
  const rootId = resolveRootId(run.returnValue, tailId);
  const rootShape = rootId ? result.shapes.get(rootId) : undefined;

  return {
    session,
    records: run.records,
    shapes: result.shapes,
    diagnostics: result.diagnostics,
    health: result.health,
    warnings: session.warnings.slice(warningsBefore),
    tailId,
    tailShape,
    rootId,
    rootShape,
    returnValue: run.returnValue,
    code,
  };
}

export async function buildModelFromFile(
  input: BuildModelFromFileInput,
  opts?: RunScriptFacadeOptions,
): Promise<BuiltModel> {
  const fileName = resolve(input.file);
  const code = await readFile(fileName, 'utf8');
  const { dirname } = await import('node:path');
  return buildModel({ code, fileName, scriptDir: dirname(fileName) }, opts);
}

/**
 * Resolve the FeatureId of the value the script `return`ed.
 * Shape → its feature id; Scene → the upstream solvedAssembly /
 * assemblyModel record id; anything else (Region, plain data, no
 * return) → fall back to the chain tail.
 */
export function resolveRootId(
  returnValue: unknown,
  tailId: FeatureId | undefined,
): FeatureId | undefined {
  if (returnValue instanceof Shape) return returnValue.id;
  if (returnValue instanceof Scene) return returnValue.__sourceFeatureId() ?? tailId;
  return tailId;
}
