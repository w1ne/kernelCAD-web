// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/backendExtrudeProfiles.ts
//
// Primitive-profile extrude builders behind the `OcctBackend.extrudeRect` /
// `extrudeCircle` / `extrudePolygon` / `extrudeRoundedRect` public statics,
// plus the shared `twistAngle` resolution and `Sketch → Shape3D` lift used by
// `OcctBackend.extrudeFromSketch` too. Split out of `occtBackend.ts` to keep
// that module inside the max-lines ratchet; the static methods there are thin
// delegates so the public API and behavior are unchanged.
//
// These helpers deliberately return raw `replicad.Shape3D` values instead of
// `OcctBackend` instances: the module must not import `occtBackend.ts`
// (occtBackend imports this module), so the caller wraps the result.

import * as replicad from 'replicad';
import { KernelError } from '../../../shared/intent/kernelError';
import { isOcctInitialized } from './backendInit';

type ReplicadShape3D = replicad.Shape3D;

/** Resolve the optional `twistAngle` of an extrude call: absent means 0, a
 *  non-finite resolved value throws a typed `feature.invalid-args` (the same
 *  contract `extrudeFromSketch` has). */
export function resolveExtrudeTwistAngle(twistAngle: number | undefined, context: string): number {
  const angle = twistAngle ?? 0;
  if (!Number.isFinite(angle)) {
    throw new KernelError(
      'feature.invalid-args',
      `${context}: twistAngle must be a finite number.`,
      undefined,
      'twistAngle must resolve to a finite number — check the param expression and any division in it.',
    );
  }
  return angle;
}

/** Lift a `replicad.Sketch` into a solid with an optional total twist. A zero
 *  angle takes the exact legacy straight-extrude call; a non-zero angle routes
 *  through replicad's twist extrude (profile rotates about the sketch origin
 *  through the sweep). */
export function extrudeLiftedShape(
  sketch: unknown,
  depth: number,
  angle: number,
): ReplicadShape3D {
  const single = sketch as { extrude: (d: number, opts?: { twistAngle?: number }) => ReplicadShape3D };
  return angle === 0 ? single.extrude(depth) : single.extrude(depth, { twistAngle: angle });
}

/**
 * Extrude a centered axis-aligned rectangular profile (width × height) on
 * the XY plane up to `height` along Z. The resulting solid is centered
 * about the origin in X/Y and spans `Z = 0..height`.
 *
 * @param opts.twistAngle total twist in degrees applied from bottom to top,
 *   rotating the profile about the profile origin (the sketch Z axis) as it
 *   sweeps. 0 / omitted takes the exact legacy straight-extrude path.
 */
export function extrudeRectShape(
  w: number,
  h: number,
  height: number,
  opts: { twistAngle?: number } = {},
): ReplicadShape3D {
  if (!isOcctInitialized()) throw new Error('OCCT not initialized — call initOcct() first');
  const angle = resolveExtrudeTwistAngle(opts.twistAngle, 'extrudeRect');
  const sketch = replicad.drawRectangle(w, h).sketchOnPlane('XY');
  return extrudeLiftedShape(sketch, height, angle);
}

/**
 * Extrude a circle of radius `r` (centered at origin on the XY plane) up to
 * `height` along Z.
 *
 * @param opts.twistAngle total twist in degrees applied from bottom to top,
 *   rotating the profile about the profile origin (the sketch Z axis) as it
 *   sweeps. A circle centered on the twist axis is rotationally symmetric,
 *   so the twist has little geometric effect (volume is preserved), though
 *   the sweep may still reshape the lateral surface slightly. 0 / omitted
 *   takes the exact legacy straight-extrude path.
 */
export function extrudeCircleShape(
  r: number,
  height: number,
  opts: { twistAngle?: number } = {},
): ReplicadShape3D {
  if (!isOcctInitialized()) throw new Error('OCCT not initialized — call initOcct() first');
  const angle = resolveExtrudeTwistAngle(opts.twistAngle, 'extrudeCircle');
  const sketch = replicad.drawCircle(r).sketchOnPlane('XY');
  return extrudeLiftedShape(sketch, height, angle);
}

/**
 * Extrude a closed polygon along +Z by `depth`.
 *
 * `points` is an array of `[x, y]` tuples in millimetres. Winding is normalized
 * — CW input is silently reversed to CCW before extrusion. The polygon must
 * have at least 3 distinct points; depth must be positive.
 *
 * @param opts.twistAngle total twist in degrees applied from bottom to top,
 *   rotating the profile about the profile origin (the sketch Z axis) as it
 *   sweeps. 0 / omitted takes the exact legacy straight-extrude path.
 *
 * @throws {Error} If fewer than 3 points or non-positive depth.
 * @throws {Error} If OCCT fails to construct or extrude (e.g. self-intersection).
 */
export function extrudePolygonShape(
  points: [number, number][],
  depth: number,
  opts: { twistAngle?: number } = {},
): ReplicadShape3D {
  if (!isOcctInitialized()) throw new Error('OCCT not initialized — call initOcct() first');
  if (points.length < 3) {
    throw new Error(`OcctBackend.extrudePolygon: need at least 3 points (got ${points.length})`);
  }
  if (depth <= 0) {
    throw new Error(`OcctBackend.extrudePolygon: depth must be positive (got ${depth})`);
  }
  const angle = resolveExtrudeTwistAngle(opts.twistAngle, 'extrudePolygon');

  const ccw = ensureCCW(points);

  // Build a 2D drawing using replicad's DrawingPen API:
  // draw(start).lineTo(p1)...lineTo(pn-1).close() returns a Drawing;
  // sketchOnPlane('XY') promotes it to a Sketch; extrude lifts it to a
  // 3D solid.
  let pen = replicad.draw(ccw[0]);
  for (let i = 1; i < ccw.length; i++) {
    pen = pen.lineTo(ccw[i]) as typeof pen;
  }
  const drawing = pen.close();
  const sketch = drawing.sketchOnPlane('XY');
  return extrudeLiftedShape(sketch, depth, angle);
}

/**
 * Extrude a rectangle with rounded corners along +Z by `depth`.
 *
 * `radius` is auto-clamped to `min(width/2, height/2)` so over-sized radii
 * don't trigger an OCCT error. Zero radius is treated as a sharp rectangle.
 *
 * @param opts.twistAngle total twist in degrees applied from bottom to top,
 *   rotating the profile about the profile origin (the sketch Z axis) as it
 *   sweeps. 0 / omitted takes the exact legacy straight-extrude path.
 *
 * @throws {Error} If `depth <= 0`.
 */
export function extrudeRoundedRectShape(
  width: number,
  height: number,
  radius: number,
  depth: number,
  opts: { twistAngle?: number } = {},
): ReplicadShape3D {
  if (depth <= 0) {
    throw new Error(`OcctBackend.extrudeRoundedRect: depth must be positive (got ${depth})`);
  }
  const angle = resolveExtrudeTwistAngle(opts.twistAngle, 'extrudeRoundedRect');
  // Replicad's drawRoundedRectangle requires r < min(width/2, height/2) when
  // building symmetric arcs — at the exact maximum the hLine segment becomes
  // zero-length and the tangentArc call fails. Cap at 99.99 % of the limit.
  const maxR = Math.min(width / 2, height / 2);
  const clamped = Math.min(Math.max(0, radius), maxR * 0.9999);
  const drawing = replicad.drawRoundedRectangle(width, height, clamped);
  const sketch = drawing.sketchOnPlane('XY');
  return extrudeLiftedShape(sketch, depth, angle);
}

/**
 * Ensure polygon points are in counter-clockwise winding order.
 * Uses the shoelace formula: positive signed area => CCW, negative => CW.
 * CW input is silently reversed.
 */
function ensureCCW(points: [number, number][]): [number, number][] {
  // Shoelace area: positive => CCW, negative => CW
  let area2 = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area2 += x1 * y2 - x2 * y1;
  }
  return area2 < 0 ? (points.slice().reverse() as [number, number][]) : points;
}
