// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tapered (drafted) sketch extrude. The straight prism is built first; every
// side face then gets `BRepOffsetAPI_DraftAngle` about the sketch plane
// (z = 0) with pull +Z, so the bottom profile is exact and each side face
// leans by the taper angle. A positive taper narrows the profile toward the
// far end (the walls lean in), the mould-draft convention.
//
// Imports `OcctBackend` as a type only, so the module stays below occtBackend.ts
// in the import graph; the extrude lowerer wraps the returned solid.

import * as replicad from 'replicad';
import { KernelError } from '../../../shared/intent/kernelError';
import { invalidArgs } from '../../../shared/intent/invalidArgs';
import { draftWithHistory } from './draftWithHistory';
import { countFaces, isTopologicallyValid } from './edgeFeatureValidity';
import { describeOcctThrow } from './occtException';
import type { OcctBackend } from './occtBackend';

const HASH_UPPER = 2147483647;
/** Relative volume slack for the frustum plausibility gate. */
const VOLUME_SLACK = 1e-6;
/** Side-face surface types `BRepOffsetAPI_DraftAngle` can lean: a line
 *  segment extrudes to a plane, an arc to a cylinder. A spline or Bézier
 *  segment extrudes to an EXTRUSION_SURFACE, which OCCT does not draft. */
const DRAFTABLE_SIDE_TYPES = new Set(['PLANE', 'CYLINDRE']);
/** Smallest draft OCCT applies: `BRepOffsetAPI_DraftAngle` leaves a face
 *  unchanged below 1e-4 rad (~0.0057°), so a smaller nonzero taper is
 *  rejected up front instead of failing the volume gate. */
const MIN_TAPER_DEG = 0.0058;

/** Validate an optional `taperDeg`: absent means 0; otherwise a finite angle
 *  strictly inside (-90, 90) degrees and no smaller than MIN_TAPER_DEG. */
export function resolveExtrudeTaperDeg(taperDeg: number | undefined, context: string): number {
  const angle = taperDeg ?? 0;
  if (angle !== 0 && Number.isFinite(angle) && Math.abs(angle) < MIN_TAPER_DEG) {
    invalidArgs({
      api: `${context}(depth, { taperDeg })`,
      path: 'opts.taperDeg',
      got: taperDeg,
      requires: `0 for a straight extrude, or a draft angle of at least ${MIN_TAPER_DEG}° in magnitude (the OCCT draft resolution, 1e-4 rad)`,
      unit: 'deg',
      example: 'path()...close().extrude(10, { taperDeg: 0.5 })',
    });
  }
  if (!Number.isFinite(angle) || Math.abs(angle) >= 90) {
    invalidArgs({
      api: `${context}(depth, { taperDeg })`,
      path: 'opts.taperDeg',
      got: taperDeg,
      requires: 'a finite draft angle strictly between -90 and 90 (positive narrows toward the far end, negative widens)',
      unit: 'deg',
      example: 'path()...close().extrude(10, { taperDeg: 3 })',
    });
  }
  return angle;
}

/** Reject a taper the lowerer cannot apply: with a twist, or on a sketch that
 *  has no path commands (face-bound or text sketches extrude off the Z axis
 *  or as many loops). */
export function assertTaperable(taperDeg: number, twistAngle: number, hasPathCommands: boolean): void {
  if (twistAngle === 0 && hasPathCommands) return;
  invalidArgs({
    api: 'Sketch.extrude(depth, { taperDeg })',
    path: 'opts.taperDeg',
    got: taperDeg,
    requires: 'no twistAngle and a path()...close() sketch; for a face-bound sketch extrude straight and call .draft() on the side faces',
    unit: 'deg',
    example: 'path()...close().extrude(10, { taperDeg: 3 })',
  });
}

const CLOSES_HINT =
  'Reduce taperDeg or depth. An inward taper must not close the profile before the far end: depth × tan(taperDeg) must stay below the smallest half-width of the profile.';
const CURVED_SIDE_HINT =
  'Build the profile from lines and arcs (lineTo, threePointsArc, sagittaArc, radiusArc), or loft between the base profile and a scaled top profile. A smaller taperDeg does not help.';

function taperFailed(message: string, hint = CLOSES_HINT): KernelError {
  return new KernelError('feature.extrude.taper-failed', `extrude taper failed: ${message}`, undefined, hint);
}

/**
 * Lean every side face of a straight +Z prism of `depth` by `taperDeg`
 * about the z = 0 plane. Returns the raw drafted solid; the caller wraps it.
 *
 * @throws {KernelError} `feature.extrude.taper-failed` when OCCT cannot draft
 *   the faces, or the result is not one valid solid whose volume and cap match
 *   a frustum of the profile (e.g. an inward taper that closes the profile).
 */
export function taperExtrudedPrism(
  prism: OcctBackend,
  depth: number,
  taperDeg: number,
): replicad.Shape3D {
  const raw = prism.getReplicadShape();
  const tol = Math.max(1e-6, depth * 1e-7);
  // Side faces span the full depth; the two caps are flat at z = 0 / depth.
  const sideFaces = raw.faces.filter((f) => {
    const [[, , zMin], [, , zMax]] = f.boundingBox.bounds;
    return zMax - zMin > tol;
  });
  const sides = sideFaces
    .map((f) => ({ hash: (f.wrapped as unknown as { HashCode(n: number): number }).HashCode(HASH_UPPER).toString(16) }));
  if (sides.length === 0) throw taperFailed('the prism has no side faces to taper.');
  const curvedSides = sideFaces.filter((f) => !DRAFTABLE_SIDE_TYPES.has(f.geomType));

  let drafted: replicad.Shape3D;
  try {
    // Pull +Z with the parting plane at the sketch plane: a positive draft
    // angle leans the walls inward going up (measured, see extrudeTaper.test).
    const res = draftWithHistory(prism, sides, (taperDeg * Math.PI) / 180, [0, 0, 1], {
      point: [0, 0, 0],
      normal: [0, 0, 1],
    });
    drafted = replicad.cast(res.shape as never) as replicad.Shape3D;
  } catch (e) {
    const cause = describeOcctThrow(e);
    if (curvedSides.length === 0) throw taperFailed(cause);
    // OCCT throws a bare pointer here; name the side faces it cannot draft.
    const types = [...new Set(curvedSides.map((f) => f.geomType))].join(', ');
    throw taperFailed(
      `OCCT cannot draft ${curvedSides.length} side face(s) of type ${types}, which spline or Bézier profile segments extrude to (${cause}).`,
      CURVED_SIDE_HINT,
    );
  }

  if (!isTopologicallyValid(drafted.wrapped)) {
    throw taperFailed('the drafted solid is not a valid B-rep (the side faces cross each other).');
  }
  if (countFaces(drafted.wrapped) !== countFaces(raw.wrapped)) {
    throw taperFailed('the drafted solid lost or gained faces (the profile closes before the far end).');
  }
  const [[, , zMin], [, , zMax]] = drafted.boundingBox.bounds;
  if (Math.abs(zMin) > tol || Math.abs(zMax - depth) > tol) {
    throw taperFailed(`the drafted solid spans z ${zMin.toFixed(4)}..${zMax.toFixed(4)}, not 0..${depth}.`);
  }
  const before = replicad.measureVolume(raw);
  const after = replicad.measureVolume(drafted);
  const shrinks = taperDeg > 0;
  const plausible = after > 0 && (shrinks
    ? after < before * (1 - VOLUME_SLACK)
    : after > before * (1 + VOLUME_SLACK));
  if (!plausible) {
    throw taperFailed(
      `volume ${after.toFixed(3)} mm³ does not ${shrinks ? 'shrink' : 'grow'} from the straight prism's ${before.toFixed(3)} mm³.`,
    );
  }
  return drafted;
}
