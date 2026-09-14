// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/frame.ts
//
// Choose the extrusion axis a prismatic part was most plausibly built along,
// and the canonical frame the emitter authors in (axis → +Z, dominant wall
// direction → +X).
//
// Score per candidate axis = area explained as caps (normal ∥ axis) or walls
// (normal ⊥ axis, or a cylinder coaxial with it), with fully-round concave
// cylinders across the axis credited at 0.9 (they become side-drilled holes,
// a slightly less direct reading than a profile), minus a penalty per extra
// band the axis would slice the part into. Ties go to the larger cap area, so
// a plain plate extrudes through its thickness.

import { cross3, dot3, normalize3, type V3 } from './geom';
import type { Segmentation } from './segment';
import type { IndexedMesh } from './meshClean';

/** True when any triangle bordering the region belongs to a wall plane or a
 *  convex (outer) cylinder coaxial with `axis`. */
function touchesWall(seg: Segmentation, mesh: IndexedMesh, tris: number[], axis: V3): boolean {
  for (const t of tris) {
    for (let k = 0; k < 3; k++) {
      const nb = mesh.neighbors[t * 3 + k];
      if (nb < 0) continue;
      const pid = seg.planeOf[nb];
      if (pid >= 0) {
        if (Math.abs(dot3(seg.planes[pid].normal, axis)) <= WALL_SIN) return true;
        continue;
      }
      const cid = seg.cylinderOf[nb];
      if (cid >= 0) {
        const c = seg.cylinders[cid];
        if (!c.concave && Math.abs(dot3(c.axis, axis)) >= CAP_COS) return true;
      } else {
        return true; // freeform neighbour: treat as outline-changing
      }
    }
  }
  return false;
}

export interface AxisCandidateScore {
  axis: V3;
  explainedFraction: number;
  capArea: number;
  bands: number;
  score: number;
}

export interface CanonicalFrame {
  /** Extrusion axis in the input frame (unit). */
  axis: V3;
  /** In-plane X direction in the input frame (unit). */
  e1: V3;
  /** In-plane Y direction = axis × e1. */
  e2: V3;
  /** Winning score record. */
  chosen: AxisCandidateScore;
  /** True when the measured axis was within 0.5° of a world axis and snapped onto it. */
  axisSnapped: boolean;
  /** Measured deviation from the snapped axis, degrees (0 when not snapped). */
  axisSnapDeg: number;
  /** True when the in-plane direction was snapped onto a world axis. */
  inPlaneSnapped: boolean;
}

const CAP_COS = Math.cos((2 * Math.PI) / 180);
const WALL_SIN = Math.sin((2 * Math.PI) / 180);

export function chooseFrame(seg: Segmentation, levelTolMm: number, mesh?: IndexedMesh): CanonicalFrame {
  const candidates: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const byArea = [...seg.planes].sort((a, b) => b.area - a.area).slice(0, 8);
  for (const p of byArea) candidates.push(p.normal);
  for (const c of seg.cylinders) candidates.push(c.axis);
  const unique: V3[] = [];
  for (const c of candidates) {
    const n = normalize3(c);
    if (!unique.some((u) => Math.abs(dot3(u, n)) > Math.cos((1 * Math.PI) / 180))) unique.push(n);
  }

  let best: AxisCandidateScore | null = null;
  for (const axis of unique) {
    const s = scoreAxis(seg, axis, levelTolMm, mesh);
    if (
      best === null ||
      s.score > best.score + 1e-6 ||
      (Math.abs(s.score - best.score) <= 1e-6 && s.capArea > best.capArea * (1 + 1e-6))
    ) {
      best = s;
    }
  }
  const chosen = best!;

  // Snap onto a world axis when within 0.5°.
  let axis = chosen.axis;
  let axisSnapped = false;
  let axisSnapDeg = 0;
  for (const w of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as V3[]) {
    const d = Math.abs(dot3(axis, w));
    if (d > Math.cos((0.5 * Math.PI) / 180)) {
      axisSnapDeg = (Math.acos(Math.min(1, d)) * 180) / Math.PI;
      axisSnapped = axisSnapDeg > 1e-9;
      // Extrusion direction sign is immaterial (bands are sliced both ways),
      // so the snap always lands on the +world axis.
      axis = w;
      break;
    }
  }

  // In-plane direction: area-weighted 4θ average of wall normals.
  const worldX: V3 = [1, 0, 0];
  const worldY: V3 = [0, 1, 0];
  const refRaw = Math.abs(dot3(axis, worldX)) < 0.9 ? worldX : worldY;
  const b1 = normalize3([
    refRaw[0] - axis[0] * dot3(refRaw, axis),
    refRaw[1] - axis[1] * dot3(refRaw, axis),
    refRaw[2] - axis[2] * dot3(refRaw, axis),
  ]);
  const b2 = cross3(axis, b1);
  let c4 = 0;
  let s4 = 0;
  for (const p of seg.planes) {
    if (Math.abs(dot3(p.normal, axis)) > WALL_SIN) continue;
    const th = Math.atan2(dot3(p.normal, b2), dot3(p.normal, b1));
    c4 += p.area * Math.cos(4 * th);
    s4 += p.area * Math.sin(4 * th);
  }
  let theta = c4 === 0 && s4 === 0 ? 0 : Math.atan2(s4, c4) / 4;
  let inPlaneSnapped = false;
  if (Math.abs(theta) < (0.5 * Math.PI) / 180 && theta !== 0) {
    theta = 0;
    inPlaneSnapped = true;
  }
  const e1 = normalize3([
    b1[0] * Math.cos(theta) + b2[0] * Math.sin(theta),
    b1[1] * Math.cos(theta) + b2[1] * Math.sin(theta),
    b1[2] * Math.cos(theta) + b2[2] * Math.sin(theta),
  ]);
  const e2 = cross3(axis, e1);
  return { axis, e1, e2, chosen, axisSnapped, axisSnapDeg, inPlaneSnapped };
}

export function scoreAxis(seg: Segmentation, axis: V3, levelTolMm: number, mesh?: IndexedMesh): AxisCandidateScore {
  let cap = 0;
  let wall = 0;
  let cross = 0;
  const levels: number[] = [];
  for (const p of seg.planes) {
    const d = Math.abs(dot3(p.normal, axis));
    if (d >= CAP_COS) {
      cap += p.area;
      // Only a cap that meets an outer wall changes the body's outline; a
      // counterbore or blind-hole floor (bounded by bores alone) does not
      // split the part into another extrusion band.
      if (!mesh || touchesWall(seg, mesh, p.tris, axis)) levels.push(dot3(p.centroid, axis));
    } else if (d <= WALL_SIN) {
      wall += p.area;
    }
  }
  for (const c of seg.cylinders) {
    const d = Math.abs(dot3(c.axis, axis));
    if (d >= CAP_COS) wall += c.area;
    else if (d <= WALL_SIN && c.concave && c.coverageRad >= (300 * Math.PI) / 180) cross += c.area;
  }
  levels.sort((a, b) => a - b);
  let distinct = 0;
  let last = -Infinity;
  for (const l of levels) {
    if (l - last > levelTolMm) distinct++;
    last = l;
  }
  const bands = Math.max(1, distinct - 1);
  const explainedFraction = seg.totalArea > 0 ? (cap + wall + 0.9 * cross) / seg.totalArea : 0;
  return { axis, explainedFraction, capArea: cap, bands, score: explainedFraction - 0.03 * (bands - 1) };
}

/** Map input-frame points into the canonical frame: q = (p·e1, p·e2, p·axis). */
export function toCanonical(positions: Float64Array, frame: CanonicalFrame): Float64Array {
  const out = new Float64Array(positions.length);
  const { e1, e2, axis } = frame;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    out[i] = x * e1[0] + y * e1[1] + z * e1[2];
    out[i + 1] = x * e2[0] + y * e2[1] + z * e2[2];
    out[i + 2] = x * axis[0] + y * axis[1] + z * axis[2];
  }
  return out;
}
