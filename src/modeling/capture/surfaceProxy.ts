// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SurfaceId, SurfaceTrimData } from '../../shared/intent/surfaceRecord';
import type { FeatureId } from '../../shared/intent/types';
import type { SurfaceRecordCarrier } from '../../kernel/geometry/curveCarriers';
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';
import { KernelError } from '../../shared/intent/kernelError';
import { toParam } from '../../shared/runtime/editableHelpers';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';
import { formatScalarForError } from '../../shared/intent/types';

/** Map a cutter to the `byRef` discriminant stored on `SurfaceTrimData`.
 *  A Surface is referenced by id; a BRep body (Shape) is referenced as a
 *  feature so the dep graph lowers it before the trim resolves. */
function featureIdOfRef(ref: { kind: string; id?: string; featureId?: string; surfaceId?: string }): string | undefined {
  if (ref.kind === 'feature') return ref.id;
  if (ref.kind === 'face' || ref.kind === 'edge' || ref.kind === 'vertex') return ref.featureId;
  return undefined;
}

/** Feature ids named by a surface record: loft sections, Coons curves, trim cutters. */
export function namedSurfaceFeatureIds(session: CaptureSession, surfaceId: string, seen = new Set<string>()): string[] {
  if (seen.has(surfaceId)) return [];
  seen.add(surfaceId);
  const rec = session.getSurfaceRecord(surfaceId);
  if (!rec) return [];
  const data = rec.data;
  if (data.kind === 'surfaceFromCurves') return [...data.sectionIds];
  if (data.kind === 'coonsPatch') return [...data.curveIds];
  if (data.kind !== 'surfaceTrim') return [];
  const ids = namedSurfaceFeatureIds(session, data.surfaceId, seen);
  if ('featureRef' in data.byRef) {
    const id = featureIdOfRef(data.byRef.featureRef);
    if (id) ids.push(id);
  } else {
    ids.push(...namedSurfaceFeatureIds(session, data.byRef.surfaceId, seen));
  }
  return ids;
}

function refOf(by: SurfaceProxy | Shape): SurfaceTrimData['byRef'] {
  return by instanceof SurfaceProxy
    ? { surfaceId: by.id }
    : { featureRef: { kind: 'feature', id: by.id } };
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
export class SurfaceProxy implements SurfaceRecordCarrier {
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
   * imprints the section curve at build time. Shape/Curve3D cutters are
   * deferred.
   *
   * @emits feature.surface-trim.no-intersection when the cutter produces no
   *  section curve against this surface.
   * @emits feature.kernel-failed when OCCT cannot imprint a clean section
   *  curve into a valid face piece.
   */
  trimTo(by: SurfaceProxy | Shape): SurfaceProxy {
    return this.session.addSurfaceTrim(this.id, refOf(by), 'trim');
  }

  /**
   * Split this surface at the intersection with `by` (a Surface), returning
   * both resulting surface halves. Shape/Curve3D cutters are deferred.
   *
   * @emits feature.surface-trim.no-intersection when the cutter produces no
   *  section curve against this surface.
   * @emits feature.kernel-failed when OCCT cannot imprint a clean section
   *  curve into two valid face pieces.
   */
  split(by: SurfaceProxy | Shape): [SurfaceProxy, SurfaceProxy] {
    return [
      this.session.addSurfaceTrim(this.id, refOf(by), 'split', 0),
      this.session.addSurfaceTrim(this.id, refOf(by), 'split', 1),
    ];
  }

  /**
   * Internal: feature ids this surface's trim chain reads from `byRef`.
   * Consumers (thicken / toShape / sew) copy these into their own inputs so
   * the recompute dep graph lowers a BRep body cutter before the trim resolves.
   */
  __trimDependencyIds(): FeatureId[] {
    const out: FeatureId[] = [];
    const seen = new Set<string>();
    const visit = (sid: string): void => {
      if (seen.has(sid)) return;
      seen.add(sid);
      const rec = this.session.getSurfaceRecord(sid);
      if (!rec || rec.data.kind !== 'surfaceTrim') return;
      visit(rec.data.surfaceId);
      const byRef = rec.data.byRef;
      if ('featureRef' in byRef) {
        const ref = byRef.featureRef;
        out.push(ref.kind === 'feature' ? ref.id : ref.kind === 'surface' ? ref.surfaceId : ref.featureId);
      } else {
        visit(byRef.surfaceId);
      }
    };
    visit(this.id);
    return out;
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
    for (const fid of this.__trimDependencyIds()) {
      inputs[fid] = { kind: 'feature', id: fid };
    }
    const surfRec = this.session.getSurfaceRecord(this.id);
    if (surfRec && surfRec.data.kind === 'surfaceFromCurves') {
      for (let i = 0; i < surfRec.data.sectionIds.length; i++) {
        inputs[`section_${i}`] = { kind: 'feature', id: surfRec.data.sectionIds[i] };
      }
    }
    // Coons curves (and sections nested under a trim) live only on the
    // surface record. Copy them so a param edit of a boundary curve
    // re-lowers this solid.
    for (const fid of namedSurfaceFeatureIds(this.session, this.id)) {
      inputs[`src_${fid}`] = { kind: 'feature', id: fid };
    }
    return inputs;
  }
}

/** Type-only alias re-exported for module consumers; matches spec §3.2. */
export type Surface = SurfaceProxy;
