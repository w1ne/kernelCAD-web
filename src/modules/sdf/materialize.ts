// src/modules/sdf/materialize.ts
//
// Capture-time orchestrator for `sdf.materialize(field, opts?)`.
//
// 1. Validate `opts.resolution` ∈ [10, 200] integer.
// 2. Sentinel-sample the field at AABB centre — if NaN/Infinity, throw
//    `feature.sdf.field-undefined`.
// 3. Run marching-cubes on the field's AABB at the given resolution.
// 4. Sew the triangle mesh into a closed solid via OcctBackend.fromTriangleMesh.
//    Failures surface as `feature.kernel-failed`.
// 5. Park the backend on session.importedGeometry keyed by the new shape id.
// 6. Return the Shape (kind 'sdfMaterialize') for downstream booleans/fillets/exports.

import type { CaptureSession } from '../../capture/captureSession';
import type { Shape } from '../../capture/proxy';
import { OcctBackend, initOcct } from '../../backends/occt/occtBackend';
import { KernelError } from '../../intent/kernelError';
import type { Vec3 } from '../../intent/types';
import type { SdfField } from './index';
import { runMarchingCubes } from './marchingCubes';

export interface MaterializeOpts {
  /** Voxel-grid resolution per axis. Integer in [10, 200]. Default 30.
   *  Deviation from plan: plan called for 50 default but OCCT per-triangle
   *  sewing scales superlinearly with triangle count — res=50 on sphere(10)
   *  takes ~170s while res=30 takes ~20s. Default lowered to 30 in slice 1
   *  to keep typical capture times under 30 s; agents can bump explicitly
   *  for finer surface quality. */
  resolution?: number;
}

export interface MaterializeContext {
  session: CaptureSession;
}

function clampResolution(value: number): number {
  if (!Number.isInteger(value) || value < 10 || value > 200) {
    throw new KernelError(
      'feature.sdf.materialize-resolution-out-of-range',
      `sdf.materialize: resolution must be an integer in [10, 200]; got ${value}.`,
      undefined,
      'sdf.materialize-resolution-out-of-range — resolution must be an integer in [10, 200]. Use 30-60 for typical brackets; 80-120 for fine smooth-blends.',
    );
  }
  return value;
}

function aabbCentre(aabb: { min: Vec3; max: Vec3 }): Vec3 {
  return [
    (aabb.min[0] + aabb.max[0]) / 2,
    (aabb.min[1] + aabb.max[1]) / 2,
    (aabb.min[2] + aabb.max[2]) / 2,
  ];
}

export function materialize(
  ctx: MaterializeContext,
  field: SdfField,
  opts?: MaterializeOpts,
): Shape {
  const resolution = clampResolution(opts?.resolution ?? 30);

  // Sentinel sample — fail fast on degenerate fields before the full sweep.
  const centre = aabbCentre(field.aabb);
  const sentinel = field(centre);
  if (!Number.isFinite(sentinel)) {
    throw new KernelError(
      'feature.sdf.field-undefined',
      `sdf.materialize: field returned non-finite (${sentinel}) at AABB centre [${centre.join(', ')}].`,
      undefined,
      'sdf.field-undefined — the SDF returned NaN/Infinity. Check smoothBlend k > 0 and that custom fields avoid divide-by-zero. Use evaluate_sdf to probe a point near the failure.',
    );
  }

  // initOcct must be awaited before fromTriangleMesh. materialize is documented
  // sync; the typical script flow is: import side already awaited initOcct via
  // an earlier `lib.fromSTEP` or via session bootstrap. If OCCT isn't ready,
  // fromTriangleMesh throws synchronously with a clear "call initOcct() first"
  // message — that's the same contract as `box`/`cylinder`/`sphere` factories.
  const { vertices, indices } = runMarchingCubes(field, resolution);

  let backend: OcctBackend;
  try {
    backend = OcctBackend.fromTriangleMesh(vertices, indices);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new KernelError(
      'feature.kernel-failed',
      `sdf.materialize: OCCT failed to build a solid from the marching-cubes mesh: ${msg}`,
      undefined,
      'kernel-failed.sdf.materialize.sew — drop resolution by 25%, or simplify the field composition.',
    );
  }

  const shape = ctx.session.createShape({
    kind: 'sdfMaterialize',
    params: {
      resolution: { expression: String(resolution), unit: 'unitless', evaluated: resolution },
    },
    inputs: {},
    metadata: {
      aabb: field.aabb,
      sdfKind: field.kind,
    },
  });
  ctx.session.importedGeometry.set(shape.id, backend);
  return shape;
}

// Re-export initOcct so the materialize barrel can await it from callers who
// need explicit guarantees (CaptureSession bootstrap doesn't auto-init).
export { initOcct };
