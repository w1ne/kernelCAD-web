// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/builtModelFromRun.ts
//
// The lowering half of `buildModel`, without the script run. `buildModel`
// runs the script with the node runner (vm + the TypeScript compiler); the
// Studio's browser kernel runs it with `runScriptInBrowser`. Both then lower
// the captured records here, so the BuiltModel a slider edit updates is
// shaped exactly like the server's, and the first `updateModelParams` reuses
// the lowered shapes instead of lowering the whole model again.
//
// Browser-safe: no node imports, and the lowerer is supplied by the caller
// (the registry also reaches the SMLib backend, which the browser lacks).

import type { FeatureLowerer, ShapeBackend } from '../kernel/backends/backend';
import type { FeatureRecord } from '../shared/intent/featureRecord';
import type { FeatureId } from '../shared/intent/types';
import type { CompilerDiagnostic } from '../shared/diagnostics/diagnostic';
import type { CaptureSession } from './capture/captureSession';
import type { BuiltModel } from './buildModel';
import { RecomputeEngine } from './compute/recomputeEngine';
import { Shape } from './capture/proxy';
import { Scene } from './validation/scene';
import { populateCache } from './paramUpdate';

/** What a script run hands to the lowering step. */
export interface ScriptRunForBuild {
  session: CaptureSession;
  records: readonly FeatureRecord[];
  returnValue: unknown;
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

/** Lower a captured script run into a BuiltModel (see the file header). */
export async function builtModelFromRun(
  run: ScriptRunForBuild,
  createLowerer: (session: CaptureSession) => FeatureLowerer,
  code: string,
): Promise<BuiltModel> {
  const session = run.session;
  // Slice 2E: attach a per-session engine so `params.update` reuses it and
  // `onRelower` subscriptions added after the initial build still fire.
  const engine = new RecomputeEngine(createLowerer(session));
  session.setEngine(engine);
  const warningsBefore = session.warnings.length;
  const pending = session.snapshotFullLower(new Map());
  // Reuse the clean full lower the script already ran (the solvedModel gate),
  // for the record prefix that is still valid. Dropped either way: it must not
  // outlive this build.
  const seedShapes = session.reusableLoweredPrefix(session.cleanScriptLower);
  session.cleanScriptLower = undefined;
  const result = await engine.run(run.records, {
    ...(seedShapes.size > 0 ? { seedShapes } : {}),
    paramTable: session.paramTable,
    warningSink: warning => session.warnings.push(warning),
    warningPhase: 'build',
    gatedFeatureNames: session.gatedFeatureNames,
  });
  // Later `Shape.lower()` calls (review passes lower each part) reuse this.
  session.lastFullLower = { ...pending, shapes: result.shapes };

  return assembleBuiltModel(session, run, result, warningsBefore, code);
}

/** Shared post-`engine.run` assembly for `buildModel` /
 *  `rebuildModelIncremental`: populates the session cache and derives the
 *  tail/root shapes onto a `BuiltModel`. Keeping this in one place guarantees
 *  the incremental path produces a `BuiltModel` shaped exactly like the full
 *  build's. */
export function assembleBuiltModel(
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
