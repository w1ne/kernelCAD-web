// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { CaptureSession } from './capture/captureSession';
import { invalidArgs } from '../shared/intent/invalidArgs';
import type { Vec3 } from '../shared/intent/types';
import { buildTubePath, isTubePathError } from '../shared/tube/tubePath';
import { assertPositiveFinite, mm } from './apiSupport';
import type { KernelCadApi } from './api';

export interface PipeOptions {
  /** Centreline bend radius in mm. Must exceed `radius`. Default: 1.5 × radius. */
  bendRadius?: number;
}

const EXAMPLE = 'pipe([[0, 0, 0], [40, 0, 0], [40, 0, 30]], 3, { bendRadius: 8 })';

function assertPipePoints(points: unknown): Vec3[] {
  if (!Array.isArray(points) || points.length < 2) {
    invalidArgs({
      api: 'pipe(points, radius)',
      path: 'points',
      got: points,
      showType: !Array.isArray(points),
      requires: 'an array of at least two [x, y, z] points of finite numbers',
      example: EXAMPLE,
      featureId: 'pipe',
    });
  }
  const out: Vec3[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (
      !Array.isArray(p) ||
      p.length !== 3 ||
      typeof p[0] !== 'number' || !Number.isFinite(p[0]) ||
      typeof p[1] !== 'number' || !Number.isFinite(p[1]) ||
      typeof p[2] !== 'number' || !Number.isFinite(p[2])
    ) {
      invalidArgs({
        api: 'pipe(points, radius)',
        path: `points[${i}]`,
        got: p,
        requires: 'a [x, y, z] tuple of finite numbers',
        example: EXAMPLE,
        featureId: 'pipe',
      });
    }
    out.push([p[0], p[1], p[2]]);
  }
  return out;
}

/** Reject a non-object opts or an unknown key instead of silently building
 *  with the default 1.5 × radius bend: `pipe(pts, 3, 8)` and
 *  `pipe(pts, 3, { bend_radius: 8 })` used to drop the requested bend. */
function assertPipeOpts(opts: unknown): PipeOptions {
  if (opts === undefined || opts === null) return {};
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({
      api: 'pipe(points, radius, opts?)',
      path: 'opts',
      got: opts,
      showType: true,
      requires: 'an options object such as { bendRadius }; the bend radius is not a positional argument',
      example: EXAMPLE,
      featureId: 'pipe',
    });
  }
  for (const key of Object.keys(opts)) {
    if (key !== 'bendRadius') {
      invalidArgs({
        api: 'pipe(points, radius, opts)',
        path: `opts.${key}`,
        gotText: `an unknown option '${key}'`,
        requires: 'bendRadius, the only pipe option',
        example: EXAMPLE,
        featureId: 'pipe',
      });
    }
  }
  return opts as PipeOptions;
}

/** Capture `pipe(points, radius, opts?)` as a `pipe` feature record. */
export function makePipeMethod(session: CaptureSession): KernelCadApi['pipe'] {
  return (points, radius, rawOpts) => {
    const pts = assertPipePoints(points);
    const opts = assertPipeOpts(rawOpts);
    const r = assertPositiveFinite('pipe', 'radius', radius);
    const bendRadius = opts.bendRadius === undefined
      ? r * 1.5
      : assertPositiveFinite('pipe', 'bendRadius', opts.bendRadius);
    if (bendRadius <= r) {
      invalidArgs({
        api: 'pipe(points, radius, { bendRadius })',
        path: 'opts.bendRadius',
        got: bendRadius,
        requires: `a centreline radius greater than the pipe radius (${r} mm) so the inner bend does not invert`,
        unit: 'mm',
        example: EXAMPLE,
        featureId: 'pipe',
      });
    }
    const path = buildTubePath(pts, bendRadius);
    if (isTubePathError(path)) {
      if (path.kind === 'too-few-points') {
        invalidArgs({
          api: 'pipe(points, radius)',
          path: 'points',
          got: points,
          requires: 'at least two distinct, non-collinear-degenerate end points',
          example: EXAMPLE,
          featureId: 'pipe',
        });
      }
      if (path.kind === 'reversal') {
        invalidArgs({
          api: 'pipe(points, radius)',
          path: `points[${path.corner}]`,
          got: pts[path.corner],
          requires: 'the next corner offset sideways — a pipe cannot fold straight back on itself',
          example: EXAMPLE,
          featureId: 'pipe',
        });
      }
      invalidArgs({
        api: 'pipe(points, radius, { bendRadius })',
        path: `leg ${path.leg}`,
        got: `a leg ${path.missingMm.toFixed(2)} mm too short for the bends at its ends`,
        requires: `the leg at least ${path.missingMm.toFixed(2)} mm longer, or a smaller bendRadius`,
        example: EXAMPLE,
        featureId: 'pipe',
      });
    }
    return session.createShape({
      kind: 'pipe',
      params: { radius: mm(r), bendRadius: mm(bendRadius) },
      inputs: {},
      metadata: { points: pts },
    });
  };
}
