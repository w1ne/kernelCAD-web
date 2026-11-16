// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tapered (drafted) sketch extrude. The straight prism is built first; every
// side face then gets `BRepOffsetAPI_DraftAngle` about the sketch plane
// (z = 0) with pull +Z, so the bottom profile is exact and each side face
// leans by the taper angle. A positive taper narrows the profile toward the
// far end (the walls lean in), the mould-draft convention.
//
// Imports `OcctBackend` as a type only: occtBackend.ts calls this module.

import * as replicad from 'replicad';
import { KernelError } from '../../../shared/intent/kernelError';
import { draftWithHistory } from './draftWithHistory';
import { countFaces, isTopologicallyValid } from './edgeFeatureValidity';
import type { OcctBackend } from './occtBackend';

const HASH_UPPER = 2147483647;
/** Relative volume slack for the frustum plausibility gate. */
const VOLUME_SLACK = 1e-6;

/** Validate an optional `taperDeg`: absent means 0; otherwise a finite angle
 *  strictly inside (-90, 90) degrees. */
export function resolveExtrudeTaperDeg(taperDeg: number | undefined, context: string): number {
  const angle = taperDeg ?? 0;
  if (!Number.isFinite(angle) || Math.abs(angle) >= 90) {
    throw new KernelError(
      'feature.invalid-args',
      `${context}: taperDeg must be a finite angle strictly between -90 and 90 degrees (got ${String(taperDeg)}).`,
      undefined,
      'Pass taperDeg in degrees: a positive value narrows the profile toward the far end, a negative value widens it. Typical mould draft is 0.5 to 5.',
    );
  }
  return angle;
}

function taperFailed(message: string): KernelError {
  return new KernelError(
    'feature.extrude.taper-failed',
    `extrude taper failed: ${message}`,
    undefined,
    'Reduce taperDeg or depth. An inward taper must not close the profile before the far end: depth × tan(taperDeg) must stay below the smallest half-width of the profile.',
  );
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
  const sides = raw.faces
    .filter((f) => {
      const [[, , zMin], [, , zMax]] = f.boundingBox.bounds;
      return zMax - zMin > tol;
    })
    .map((f) => ({ hash: (f.wrapped as unknown as { HashCode(n: number): number }).HashCode(HASH_UPPER).toString(16) }));
  if (sides.length === 0) throw taperFailed('the prism has no side faces to taper.');

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
    throw taperFailed(e instanceof Error ? e.message : String(e));
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
