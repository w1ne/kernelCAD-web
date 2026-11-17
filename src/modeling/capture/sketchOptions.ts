// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Editable } from '../../shared/runtime/paramRef';
import type { FaceLabelsMap } from '../../shared/intent/featureRecord';
import type { Curve3D } from './curveProxy';

/**
 * 2D-Hermite endpoint shape — analogue of the 3D `HermiteEndpoint` used by
 * Slice C's `hermiteG2`. All three fields are `[Editable<number>, Editable<number>]`
 * tuples so ParamRef-driven points / tangents / curvatures are supported.
 *
 * `point`     — endpoint in mm.
 * `tangent`   — first derivative of the curve at this endpoint (NOT the
 *               unit tangent: magnitude controls how aggressively the
 *               curve heads out of the endpoint; typical magnitude is in
 *               the order of the chord length between the two endpoints).
 * `curvature` — second derivative at this endpoint. Defaults to [0, 0],
 *               which makes the resulting curve G1-only (still degree 5).
 */
export interface HermiteEndpoint2D {
  point: [Editable<number>, Editable<number>];
  tangent: [Editable<number>, Editable<number>];
  curvature?: [Editable<number>, Editable<number>];
}

/**
 * Per-section placement for `Sketch.loft({ planes })`.
 *
 * `plane` / `origin` place the section's sketch plane; `rotationDeg` is an
 * in-plane rotation of this section about the loft's rotation center
 * (default `[0, 0]`, the sketch-local origin in this section's own plane;
 * override with `twistCenter`). When omitted, the section takes the
 * distributed `twistDeg` angle; when present it overrides that angle for
 * this section only.
 */
export interface LoftPlaneSpec {
  plane: 'XY' | 'YZ' | 'XZ';
  origin: [Editable<number>, Editable<number>, Editable<number>];
  rotationDeg?: Editable<number>;
}

/** Options accepted by `Sketch.loft`. */
export interface LoftOptions {
  spacing?: Editable<number>;
  planes?: LoftPlaneSpec[];
  twistDeg?: Editable<number>;
  twistCenter?: [Editable<number>, Editable<number>];
  ruled?: boolean;
  /** With `ruled: true`, matching polyline sections become a triangulated
   *  frustum (cheap to fuse and tessellate). Default is the NURBS loft. */
  faceted?: boolean;
  startPoint?: [Editable<number>, Editable<number>, Editable<number>];
  endPoint?: [Editable<number>, Editable<number>, Editable<number>];
  faceLabels?: FaceLabelsMap;
  rails?: Curve3D[];
  /** Requested continuity across station joins. Default `'G0'`, which keeps
   *  the historical single `ThruSections` result. `'G1'`/`'G2'` build one
   *  multi-span skin so there are no C0 joins to mismatch; `mode` is then
   *  forced to `'single'` with a warning. */
  continuity?: 'G0' | 'G1' | 'G2';
  /** Stations per internal span for the segmented (`mode: 'sewn'`) path.
   *  Must be an integer >= 2. Ignored by `mode: 'single'`. */
  spanSize?: Editable<number>;
  /** `'single'` (default) builds one skin over all stations. `'sewn'` builds
   *  one solid per span and fuses them — fast, but the joins are C0. */
  mode?: 'single' | 'sewn';
}

/** Option keys `Sketch.loft` accepts. Anything else is a likely typo and is
 *  rejected with `feature.invalid-args` instead of being silently dropped. */
export const ALLOWED_LOFT_KEYS = new Set([
  'spacing', 'planes', 'ruled', 'faceted', 'startPoint', 'endPoint', 'faceLabels',
  'rails', 'twistDeg', 'twistCenter', 'continuity', 'spanSize', 'mode',
]);

/** Keys a single `opts.planes[i]` entry accepts. */
export const ALLOWED_LOFT_PLANE_KEYS = new Set(['plane', 'origin', 'rotationDeg']);

/** Option keys `Sketch.extrude` accepts. Anything else is a likely typo and is
 *  rejected with `feature.invalid-args` instead of being silently dropped. */
export const ALLOWED_EXTRUDE_KEYS = new Set(['faceLabels', 'twistAngle', 'taperDeg', 'symmetric']);

/** Option keys `Sketch.sweep` accepts. Unknown keys often hide a typo. */
export const ALLOWED_SWEEP_KEYS = new Set(['frenet', 'transitionMode', 'spine', 'section', 'faceLabels']);
/** Option keys `Sketch.revolve` accepts. */
export const ALLOWED_REVOLVE_KEYS = new Set(['angleDeg', 'faceLabels', 'symmetric']);
