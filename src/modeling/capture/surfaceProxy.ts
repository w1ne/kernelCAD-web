// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SurfaceId, SurfaceTrimData } from '../../shared/intent/surfaceRecord';
import type { CaptureSession } from './captureSession';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';
import { formatScalarForError } from '../../shared/intent/types';

/** Map a Surface cutter to the `byRef` discriminant stored on `SurfaceTrimData`.
 *  Shape / Curve3D cutters are deferred to a later slice; the public API accepts
 *  only `SurfaceProxy` here. The lowerer's featureRef path is left in place
 *  for future use but is unreachable from the public capture API. */
function refOf(by: SurfaceProxy): SurfaceTrimData['byRef'] {
  return { surfaceId: by.id };
}

/**
 * Capture-time proxy for a NURBS surface. NOT a `Shape` — does NOT implement
 * `ShapeBackend`, does NOT enter the `FeatureKind` union. Only two escape
 * paths from a `Surface` into the `Shape` pipeline:
 *  - `.thicken(t)`  → solid via OCCT BRepOffsetAPI_MakeThickSolid
 *  - `.toShape()`   → zero-volume shell (single TopoDS_Face)
 *
 * Drift-sentinel contract: adding a public method here REQUIRES updating
 * `SURFACE_METHODS` in `src/mcp/tools/listApi.ts`. The integration test at
 * `tests/integration/mcp/listApi.driftSentinel.test.ts` fails CI otherwise.
 * This guards agent discoverability — methods not in `list_api` are invisible
 * to MCP clients.
 */
export class SurfaceProxy {
  readonly id: SurfaceId;
  private session: CaptureSession;

  constructor(id: SurfaceId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  /**
   * V slice — internal accessor used by the JS-side surface bridge to read
   * the session's captured SurfaceRecord (degree / knots / controls / weights
   * for `nurbsSurface`-kind surfaces). NOT part of the public agent surface;
   * intentionally underscored to keep `list_api` clean.
   */
  __getRecord(): import('../../shared/intent/surfaceRecord').SurfaceRecord | undefined {
    return this.session.getSurfaceRecord(this.id);
  }

  /**
   * Thicken this surface by `t` mm (offset along the surface normal) and
   * return the resulting closed `Shape`. Lowers via
   * `BRepOffsetAPI_MakeThickSolid.MakeThickSolidBySimple`.
   *
   * @throws KernelError('feature.invalid-args') if `t` is not a positive
   *  finite number (numeric branch only; ParamRefs are not validated at
   *  capture time).
   */
  thicken(t: Editable<number>): Shape {
    if (typeof t === 'number' && !(t > 0 && Number.isFinite(t))) {
      throw new KernelError(
        'feature.invalid-args',
        `Surface.thicken: t must be a positive finite number; got ${formatScalarForError(t)}.`,
        this.id,
        'invalid-args.surfaceThicken.t — pass a positive finite number or ParamRef<number> to .thicken(t).',
      );
    }
    if (typeof t !== 'number' && !isParamRef(t)) {
      throw new KernelError(
        'feature.invalid-args',
        `Surface.thicken: t must be a number or ParamRef<number>; got ${formatScalarForError(t)}.`,
        this.id,
        'invalid-args.surfaceThicken.t — pass a positive finite number or ParamRef<number> to .thicken(t).',
      );
    }
    return this.session.createShape({
      kind: 'surfaceThicken',
      inputs: this._buildInputsWithSectionRefs(),
      params: { t: toParam(t, 'mm') },
    });
  }

  /**
   * Wrap this surface as a zero-volume `Shape` (a single-face TopoDS_Shell).
   * The result behaves like any other `Shape` (.boundingBox/.surfaceArea
   * etc.) except that `.volume()` returns ~0. Use as a profile placeholder
   * for downstream face-aware features.
   */
  toShape(): Shape {
    return this.session.createShape({
      kind: 'surfaceToShape',
      inputs: this._buildInputsWithSectionRefs(),
      params: {},
    });
  }

  /**
   * Trim this surface by `by` (another Surface) and return a new
   * `SurfaceProxy` representing the trimmed result. No geometry is computed
   * at capture time — the OCCT lowerer runs `BRepAlgoAPI_Section` and
   * discards the unwanted half at build time. Shape/Curve3D cutters are
   * deferred to a later slice.
   *
   * @emits feature.surface-trim.no-intersection when the cutter produces no
   *  section curve against this surface.
   * @emits feature.surface-trim.non-planar when the base or cutter is not
   *  near-planar (the planar-only lowerer refuses rather than mis-trim).
   */
  trimTo(by: SurfaceProxy): SurfaceProxy {
    return this.session.addSurfaceTrim(this.id, refOf(by), 'trim');
  }

  /**
   * Split this surface at the intersection with `by` (a Surface), returning a
   * new `SurfaceProxy`. Current behavior: returns ONLY the larger surviving
   * piece and emits `feature.surface-trim.split-deferred`. Full
   * split-into-both-halves is deferred to a later slice. Shape/Curve3D
   * cutters are also deferred.
   *
   * @emits feature.surface-trim.split-deferred always (full split deferred).
   * @emits feature.surface-trim.no-intersection when the cutter produces no
   *  section curve against this surface.
   * @emits feature.surface-trim.non-planar when the base or cutter is not
   *  near-planar (the planar-only lowerer refuses rather than mis-trim).
   */
  split(by: SurfaceProxy): SurfaceProxy {
    return this.session.addSurfaceTrim(this.id, refOf(by), 'split');
  }

  /**
   * Build the `inputs` map for the new surfaceThicken / surfaceToShape
   * FeatureRecord. Always includes the surface ref; for surfaceFromCurves
   * surfaces, ALSO includes a `feature` ref per section so the dep graph
   * forces each section sketch to lower before this record is reached.
   * Without this, surfaceFromCurves would silently fail at lower time
   * because the section Sketches were never consumed (their lowering is
   * driven by downstream demand only).
   */
  private _buildInputsWithSectionRefs(): Record<string, import('../../shared/intent/types').FeatureRef> {
    const inputs: Record<string, import('../../shared/intent/types').FeatureRef> = {
      surface: { kind: 'surface', surfaceId: this.id },
    };
    const surfRec = this.session.getSurfaceRecord(this.id);
    if (surfRec && surfRec.data.kind === 'surfaceFromCurves') {
      for (let i = 0; i < surfRec.data.sectionIds.length; i++) {
        inputs[`section_${i}`] = { kind: 'feature', id: surfRec.data.sectionIds[i] };
      }
    }
    return inputs;
  }
}

/** Type-only alias re-exported for module consumers; matches spec §3.2. */
export type Surface = SurfaceProxy;
