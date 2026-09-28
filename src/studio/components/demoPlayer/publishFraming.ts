// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/components/demoPlayer/publishFraming.ts
//
// Auto-framing for the 'publish' render preset — pure math over the model's
// world-space vertices (no scene, no renderer; unit-tested directly).
//
// Pose frames fit the SILHOUETTE, not the bounds box: the camera target is
// moved until the projected vertices are centred in the frame, then the
// distance is fitted so the worst vertex lands on the margin line. A bbox
// fit leaves the empty corners of the box (behind a round seat, above a
// short part next to a tall one) as dead space and pushes the product off
// centre — wrong for a product shot.
//
// Orbit frames (turntables) fit the polygonal cylinder the model sweeps as
// it turns, from one fixed azimuth: the distance is identical for every
// frame (no zoom pumping) and frames the model at every azimuth.

import { fitDistanceForPoints } from './cameraFit';
import { poseCameraDir, type PublishFrameRequest } from '../../../shared/render/publishPreset';

export type Vec3 = [number, number, number];

export interface Framing {
  /** Camera look-at point (world). */
  target: Vec3;
  /** Unit vector from target toward the camera. */
  camDir: Vec3;
  distance: number;
}

export interface FramingLens {
  fovYDeg: number;
  aspect: number;
  margin: number;
}

/** Sides of the polygonal cylinder a turntable sweeps. */
export const ORBIT_FIT_STEPS = 72;
/** Silhouette-centring passes (converges in 2-3). */
const CENTRE_PASSES = 3;

const WORLD_UP: Vec3 = [0, 0, 1];

function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [1, 0, 0];
}

export function boundsCentre(points: readonly Vec3[]): Vec3 {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
  }
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

/** World-space shift of the target that centres the projected silhouette
 *  (tangent-space bbox of the points) for a camera at target + camDir·d. */
function silhouetteShift(points: readonly Vec3[], target: Vec3, camDir: Vec3, distance: number): Vec3 {
  const right = normalize(cross(WORLD_UP, camDir));
  const up = normalize(cross(camDir, right));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    const rel = sub(p, target);
    const depth = distance - dot(rel, camDir);
    const x = dot(rel, right) / depth;
    const y = dot(rel, up) / depth;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = ((minX + maxX) / 2) * distance;
  const cy = ((minY + maxY) / 2) * distance;
  return [right[0] * cx + up[0] * cy, right[1] * cx + up[1] * cy, right[2] * cx + up[2] * cy];
}

/** Centred silhouette fit for one camera direction. */
export function framePose(points: readonly Vec3[], camDir: Vec3, lens: FramingLens): Framing {
  const fit = (target: Vec3) => fitDistanceForPoints({
    points, target, camDir, fovYDeg: lens.fovYDeg, canvasAspect: lens.aspect, margin: lens.margin,
  });
  let target = boundsCentre(points);
  for (let pass = 0; pass < CENTRE_PASSES; pass++) {
    const shift = silhouetteShift(points, target, camDir, fit(target));
    target = [target[0] + shift[0], target[1] + shift[1], target[2] + shift[2]];
  }
  // Final fit at the settled target: containment with margin is exact.
  return { target, camDir, distance: fit(target) };
}

/** Polygonal cylinder around the vertical axis through `axis` that contains
 *  every rotation of `points` about that axis. The polygon circumscribes
 *  the swept circle (radius / cos(π/n)). */
export function orbitCylinder(points: readonly Vec3[], axis: Vec3): Vec3[] {
  let radius = 0;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of points) {
    radius = Math.max(radius, Math.hypot(p[0] - axis[0], p[1] - axis[1]));
    minZ = Math.min(minZ, p[2]);
    maxZ = Math.max(maxZ, p[2]);
  }
  const r = radius / Math.cos(Math.PI / ORBIT_FIT_STEPS);
  const out: Vec3[] = [];
  for (let i = 0; i < ORBIT_FIT_STEPS; i++) {
    const a = (2 * Math.PI * i) / ORBIT_FIT_STEPS;
    const x = axis[0] + r * Math.cos(a);
    const y = axis[1] + r * Math.sin(a);
    out.push([x, y, minZ], [x, y, maxZ]);
  }
  return out;
}

/** Orbit fit: the swept cylinder framed once at azimuth 0, then that whole
 *  camera setup turned about the vertical axis to `azDeg`. The cylinder is
 *  rotation-invariant, so every frame is an exact rotation of a frame that
 *  contains it: same distance (no zoom pumping), always in frame. */
export function frameOrbit(points: readonly Vec3[], azDeg: number, elDeg: number, lens: FramingLens): Framing {
  const centre = boundsCentre(points);
  const fixed = framePose(orbitCylinder(points, centre), poseCameraDir(0, elDeg), lens);
  const a = (azDeg * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const off = sub(fixed.target, centre);
  const target: Vec3 = [centre[0] + off[0] * cos - off[1] * sin, centre[1] + off[0] * sin + off[1] * cos, fixed.target[2]];
  return { target, camDir: poseCameraDir(azDeg, elDeg), distance: fixed.distance };
}

/** Frame an az/el publish request over the model's world-space points. */
export function frameForRequest(points: readonly Vec3[], req: PublishFrameRequest, lens: FramingLens): Framing {
  const azDeg = req.azDeg ?? 0;
  const elDeg = req.elDeg ?? 0;
  return req.fit === 'orbit'
    ? frameOrbit(points, azDeg, elDeg, lens)
    : framePose(points, poseCameraDir(azDeg, elDeg), lens);
}
