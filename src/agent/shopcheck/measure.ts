// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/shopcheck/measure.ts
//
// Convert a flatten_pattern Region + get_bend_table output into a typed
// MeasurementBundle the rule engine can score against. Every measurement
// carries an @kc[...] ref so findings round-trip through resolve_topo_ref
// back to the source feature.

import { formatTopoRef } from '../../kernel/naming';
import type { Region, Vec2 } from '../../shared/intent/region';
import type {
  MeasurementBundle, HoleMeasurement, SlotMeasurement, BendMeasurement,
} from './types';

interface BendTableLike {
  thickness: number;
  kFactor: number;
  bends: ReadonlyArray<{
    ordinal: number; featureId: string;
    angle: number; radius: number; bendAllowance: number;
    axisOrigin: [number, number, number]; axisDirection: [number, number, number];
  }>;
}

/** Convert a Region (+bend table) to a measurement bundle the rule engine
 *  can evaluate against. Slots vs holes are discriminated by aspect ratio
 *  of the bounding box (>= 2 → slot). Diameter is approximated by the
 *  smallest bbox side; this is exact for polygons that inscribe a circle
 *  and conservative for any other polygonal hole. */
export function measure(
  region: Region,
  bendTable: BendTableLike,
  ownerPart: string,
): MeasurementBundle {
  const partRef = formatTopoRef({ owner: ownerPart, kind: 'part', segments: [] });

  const holes: HoleMeasurement[] = [];
  const slots: SlotMeasurement[] = [];
  region.holes.forEach(hole => {
    const bbox = polylineBbox(hole);
    const w = bbox.max[0] - bbox.min[0];
    const h = bbox.max[1] - bbox.min[1];
    const minSide = Math.min(w, h);
    const maxSide = Math.max(w, h);
    const aspect = minSide > 0 ? maxSide / minSide : Infinity;
    const center: Vec2 = [(bbox.min[0] + bbox.max[0]) / 2, (bbox.min[1] + bbox.max[1]) / 2];
    if (aspect >= 2) {
      const ordinal = slots.length;
      slots.push({
        width: minSide,
        length: maxSide,
        center,
        ordinal,
        ref: formatTopoRef({ owner: ownerPart, kind: 'face', segments: ['top', 'slot', String(ordinal)] }),
      });
    } else {
      const ordinal = holes.length;
      holes.push({
        diameter: minSide,
        center,
        ordinal,
        ref: formatTopoRef({ owner: ownerPart, kind: 'face', segments: ['top', 'hole', String(ordinal)] }),
      });
    }
  });

  // TopoKind does not yet include 'bend' (F-foundation tracks adding it);
  // fall back to 'face' + segments ['bend', '<ordinal>'] for now. The
  // F-surface follow-up will replace this with kind: 'bend'.
  const bends: BendMeasurement[] = region.bendLines.map(bl => ({
    ordinal: bl.ordinal,
    angle: bl.angle,
    radius: bl.radius,
    length: distance(bl.start, bl.end),
    axisLocation: midpoint(bl.start, bl.end),
    ref: formatTopoRef({ owner: ownerPart, kind: 'face', segments: ['bend', String(bl.ordinal)] }),
  }));

  const aabb = polylineBbox(region.outer);

  // bendTable parameters flow through VendorContext (thickness) rather
  // than the measurement bundle, so the engine has authority on the
  // canonical thickness for rule thresholds. Touch the arg to keep the
  // signature stable; subsequent slices may bring in per-bend allowance
  // numbers from bendTable.bends here.
  void bendTable;

  return { holes, slots, webs: [], flanges: [], bends, aabb, partRef };
}

function polylineBbox(pts: ReadonlyArray<Vec2>): { min: Vec2; max: Vec2 } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { min: [minX, minY], max: [maxX, maxY] };
}
function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}
function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
