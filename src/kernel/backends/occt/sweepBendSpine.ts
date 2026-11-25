// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Exact line-and-arc spine for `Sketch.sweep(rail, { bendRadius })`. Kept out
// of occtBackend.ts so the file-size ratchet stays below its limit.
import * as replicad from 'replicad';
import { buildTubePath, isTubePathError } from '../../../shared/tube/tubePath';

/** Replace each polyline corner with a tangent arc and return the spine wire. */
export function buildSweepBendSpine(
  rail: [number, number, number][],
  bendRadius: number,
): replicad.Wire {
  const path = buildTubePath(rail, bendRadius);
  if (isTubePathError(path)) {
    throw new Error(`OcctBackend.sweepFromSketch: bendRadius cannot be applied to this rail (${path.kind}).`);
  }
  const edges = path.segments.map((s) =>
    s.kind === 'line' ? replicad.makeLine(s.a, s.b) : replicad.makeThreePointArc(s.start, s.mid, s.end));
  return replicad.assembleWire(edges);
}
