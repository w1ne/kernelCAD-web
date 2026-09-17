// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../../../kernel/backends/backend';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureKind } from '../../../shared/intent/types';
import type { LowerContext } from './lowerers/context';
import { LOWERERS } from './lowerers/index';
import { applyVariableEdgeFeature } from './lowerers/edgeFeatures';
import { normalizeAxis } from './lowerers/helpers';
import { finishLowering } from './lowerers/transforms';

// `normalizeAxis` and `applyVariableEdgeFeature` moved into lowerers/;
// re-exported here so the public import path stays
// `backends/occt/occtLowerer`.
export { normalizeAxis };
export { applyVariableEdgeFeature };

/** v0.5: build a lowerer pre-wired with a session's imported STEP geometry.
 *  Use from any code that ran `runScript` and then needs to lower the
 *  resulting records — without this, `importedStep` records error out
 *  because the lowerer's `importedGeometry` map is empty. */
export function createOcctLowerer(
  session?: {
    importedGeometry: Map<string, ShapeBackend>;
    scriptDir?: string;
    /** W1.3: surface-record lookup. Optional for callers that don't ship NURBS. */
    getSurfaceRecord?: (
      id: import('../../../shared/intent/surfaceRecord').SurfaceId,
    ) => import('../../../shared/intent/surfaceRecord').SurfaceRecord | undefined;
  },
): OcctLowerer {
  const lowerer = new OcctLowerer();
  if (session) {
    lowerer.importedGeometry = session.importedGeometry;
    lowerer.scriptDir = session.scriptDir;
    if (session.getSurfaceRecord) {
      lowerer.getSurfaceRecord = session.getSurfaceRecord.bind(session);
    }
  }
  return lowerer;
}

/**
 * Lowers `FeatureRecord`s to `OcctBackend` shapes.
 *
 * Owns dispatch from the intent IR (`box`, `cylinder`, `sphere`, `extrude`,
 * `revolve`, `boolean`) to OCCT primitives, then applies any post-hoc
 * `record.transforms` in order. Boolean ops walk `inputs.byKey`: `base` is
 * the LHS, all keys starting with `cutter_` (lexicographically sorted) are
 * the operand sequence applied in left-to-right order.
 *
 * Operations not supported in v0.1 produce a single error `CompilerDiagnostic`
 * rather than throwing, so callers can collect diagnostics for a whole tree.
 */
export class OcctLowerer implements FeatureLowerer {
  readonly target: BackendTarget = 'export-occt';
  /** Derived from the dispatch table so the advertised set and the table
   *  cannot drift: a kind is supported exactly when `LOWERERS` has an entry
   *  for it. */
  readonly supports: ReadonlySet<FeatureKind> = new Set<FeatureKind>(
    Object.keys(LOWERERS) as FeatureKind[],
  );

  /** v0.5: pre-lowered geometry for `importedStep` records, populated by
   *  `lib.fromSTEP(path)` at script-run time. Keyed by feature id; threaded
   *  in by the script-runtime caller after the script returns. */
  importedGeometry: Map<string, ShapeBackend> = new Map();

  /** W1.3: per-lowerer-instance cache mapping `SurfaceId` to the resolved
   *  surface (either a single Replicad Face for `nurbsSurface`, or a
   *  multi-face shell for `surfaceFromCurves`). Populated lazily on first
   *  surface ref consumption per surface id; reused across `surfaceThicken`
   *  / `surfaceToShape` records that point at the same surface. */
  surfaceCache: Map<
    import('../../../shared/intent/surfaceRecord').SurfaceId,
    import('../../../kernel/backends/occt/nurbsSurfaceLowerer').BuiltSurface
  > = new Map();

  /** W1.3: optional session hook to look up a SurfaceRecord by id at lower
   *  time. Provided by `createOcctLowerer(session)`; undefined if the lowerer
   *  was instantiated without a session (legacy / unit-test code paths). */
  getSurfaceRecord?: (
    id: import('../../../shared/intent/surfaceRecord').SurfaceId,
  ) => import('../../../shared/intent/surfaceRecord').SurfaceRecord | undefined;

  /** v0.6: absolute directory of the calling `.kcad.ts` script. Used by the
   *  text lowerer to resolve relative `fontPath(...)` arguments. */
  scriptDir?: string;

  /** Bundle everything the per-kind lowering steps read (instance state +
   *  this call's inputs) into one context object. The `diagnostics` array is
   *  the accumulator `lower()` returns. */
  private contextFor(inputs: ResolvedInputs): LowerContext {
    return {
      target: this.target,
      inputs,
      // Record table for label-resolution path; threaded through pickEdges/pickFace.
      allRecords: inputs.records,
      diagnostics: [],
      importedGeometry: this.importedGeometry,
      surfaceCache: this.surfaceCache,
      getSurfaceRecord: this.getSurfaceRecord,
      scriptDir: this.scriptDir,
    };
  }

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const ctx = this.contextFor(inputs);
    const lowerKind = LOWERERS[r.kind];
    if (lowerKind === undefined) {
      return {
        shape: undefined as unknown as ShapeBackend,
        diagnostics: [
          {
            target: ctx.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `Feature kind '${r.kind}' is not supported.`,
            hint: 'Use a documented feature kind.',
          },
        ],
      };
    }
    return finishLowering(ctx, r, await lowerKind(ctx, r));
  }
}
