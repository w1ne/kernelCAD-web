// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { BackendTarget, ResolvedInputs, ShapeBackend } from '../../../../kernel/backends/backend';
import type { BuiltSurface } from '../../../../kernel/backends/occt/nurbsSurfaceLowerer';
import type { CompilerDiagnostic } from '../../../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../../../shared/intent/featureRecord';
import type { SurfaceId, SurfaceRecord } from '../../../../shared/intent/surfaceRecord';

/**
 * Everything a per-kind lowerer reaches for while lowering one record.
 *
 * Before the split this was a mix of `this.*` on `OcctLowerer` (the imported
 * geometry map, the surface cache + session hook, `scriptDir`, `target`) and
 * locals closed over inside `lower()` (`inputs`, `allRecords`, the
 * `diagnostics` accumulator). Threading one context object keeps every arm's
 * body readable as a standalone function without widening `OcctLowerer`'s
 * public surface.
 *
 * `diagnostics` is the SAME array `lower()` returns — lowerers append to it,
 * they never replace it.
 */
export interface LowerContext {
  /** Always `'export-occt'`; carried so diagnostics can stay target-agnostic. */
  readonly target: BackendTarget;
  /** Lowered upstream shapes (`byKey`), the record table and resolved surfaces. */
  readonly inputs: ResolvedInputs;
  /** `inputs.records` — the record table used by label/lineage resolution. */
  readonly allRecords: readonly FeatureRecord[] | undefined;
  /** Accumulator returned by `lower()`. Lowerers push; they never reassign. */
  readonly diagnostics: CompilerDiagnostic[];
  /** Geometry parked at capture time (`fromSTEP`, `sdf.materialize`, curve3d edges). */
  readonly importedGeometry: Map<string, ShapeBackend>;
  /** Per-lowerer-instance `SurfaceId` → built surface cache. */
  readonly surfaceCache: Map<SurfaceId, BuiltSurface>;
  /** Session hook that resolves a `SurfaceId` to its record; absent off-session. */
  readonly getSurfaceRecord?: (id: SurfaceId) => SurfaceRecord | undefined;
  /** Absolute directory of the calling `.kcad.ts` (font / asset path resolution). */
  readonly scriptDir?: string;
}

/**
 * What a per-kind lowerer hands back.
 *
 * Most arms produce a shape that still has to go through the record's
 * post-hoc `transforms` list. A handful are terminal: the virtual records
 * (no BREP at all), the `SceneBackend` boundary casts, and every
 * "diagnostic pushed, hand the input shape back unchanged" error path —
 * those historically `return`ed straight out of `lower()`, skipping the
 * transform loop, and must keep doing so.
 */
export interface LowerOutcome {
  /** The lowered backend. `undefined`-shaped for terminal failures. */
  readonly shape: ShapeBackend;
  /** When true, `lower()` returns this verbatim and skips `r.transforms`. */
  readonly done?: boolean;
}

/** Normal result: `lower()` applies `r.transforms` before returning it. */
export function built(shape: ShapeBackend): LowerOutcome {
  return { shape };
}

/** Terminal result: returned verbatim, transform loop skipped. */
export function finished(shape: ShapeBackend): LowerOutcome {
  return { shape, done: true };
}

/**
 * Terminal failure with no geometry. Mirrors the historical
 * `return { shape: undefined as unknown as ShapeBackend, diagnostics }`
 * shape — callers downstream already discriminate on falsy shapes.
 */
export function noShape(): LowerOutcome {
  return { shape: undefined as unknown as ShapeBackend, done: true };
}

/**
 * One feature kind's lowering step.
 *
 * `FeatureRecord` is a single interface keyed by a `kind` union rather than a
 * discriminated union, so there is no per-kind record type to narrow to; every
 * lowerer takes the whole record and reads the params/metadata its kind owns
 * (exactly what the `switch` arms did).
 */
export type KindLowerer = (
  ctx: LowerContext,
  r: FeatureRecord,
) => LowerOutcome | Promise<LowerOutcome>;
