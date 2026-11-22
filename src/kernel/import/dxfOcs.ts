// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// DXF Object Coordinate System for 2D entities. ARC, CIRCLE, LWPOLYLINE and
// POLYLINE store coordinates in the OCS of their extrusion direction
// (group codes 210/220/230, default +Z). For -Z the arbitrary-axis algorithm
// gives OCS X = -WCS X and OCS Y = WCS Y, so the stored profile is a mirror
// image. CAD tools write such entities for mirrored and flipped-view
// geometry. Any other direction puts the entity outside the XY plane.

import type { ImportSegment } from './contourAssembly';
import { DxfParseError, entityVector, type Pair } from './dxfPairs';

/** Sign of OCS X in world X: 1 for extrusion +Z, -1 for -Z. Any other
 *  direction is refused, not projected. */
export function ocsSign(body: readonly Pair[], entity: string, line: number): 1 | -1 {
  const [nx, ny, nz] = entityVector(body, entity, [210, 220, 230], [0, 0, 1]);
  if (Math.abs(nx) > 1e-9 || Math.abs(ny) > 1e-9 || Math.abs(Math.abs(nz) - 1) > 1e-9) {
    throw new DxfParseError(
      'unsupported-entity',
      `${entity} at line ${line}: extrusion direction (${nx}, ${ny}, ${nz}) is not +Z or -Z, ` +
        'so the entity is outside the XY plane; flatten it in the source tool.',
    );
  }
  return nz < 0 ? -1 : 1;
}

/** Mirror OCS segments into world X when the extrusion direction is -Z. A
 *  mirror reverses the turning direction, so each bulge changes sign. */
export function mirrorSegments(segments: ImportSegment[], sign: 1 | -1): ImportSegment[] {
  if (sign === 1) return segments;
  return segments.map(seg => ({
    ...seg,
    x0: -seg.x0,
    x1: -seg.x1,
    ...(seg.bulge === undefined ? {} : { bulge: -seg.bulge }),
  }));
}
