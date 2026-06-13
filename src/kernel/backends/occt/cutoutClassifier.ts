// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/backends/occt/cutoutClassifier.ts
//
// Slice-2 cutout-feature face classifier. Used only by cutoutLowerer.ts.
// Replaces the slice-1 shared `createdFaceTracker.ts` (deleted) — moving
// cutout logic next to its lowerer per spec §C.1. Behaviorally identical
// to slice-1's classifyCutoutFace.

import type { Face } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';

export type CutoutRefName = 'wall' | 'floor' | 'wall-back';

export interface CutoutFrame {
  entryPoint: Vec3;
  axisIntoBody: Vec3;
  effectiveDepth: number;
  through: boolean;
  /** Approximate profile bbox in face-local 2D for sanity-checking side
   *  faces. Slice-1 uses world-space distance from axis as the discriminator,
   *  which works for the simple eval-corpus tasks. */
  profileBoundingBoxRadius: number;
}

const DISTANCE_TOL = 1e-3;

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function distanceAlongAxis(pt: Vec3, entryPoint: Vec3, axisIntoBody: Vec3): number {
  return dot(sub(pt, entryPoint), axisIntoBody);
}

/** Classify a single new face produced by a cutout boolean cut. */
export function classifyCutoutFace(face: Face, frame: CutoutFrame): CutoutRefName | null {
  const surfaceType = face.geomType as string;
  const c = face.center;
  const center: Vec3 = [c.x, c.y, c.z];
  const axis = normalize(frame.axisIntoBody);

  if (surfaceType === 'PLANE' || surfaceType === 'CYLINDRE') {
    const along = distanceAlongAxis(center, frame.entryPoint, axis);

    // floor: planar perpendicular face at floor depth (blind only).
    if (
      surfaceType === 'PLANE' &&
      !frame.through &&
      Math.abs(along - frame.effectiveDepth) < DISTANCE_TOL
    ) {
      return 'floor';
    }

    // wall-back: planar perpendicular face at the back-face plane (through).
    if (
      surfaceType === 'PLANE' &&
      frame.through &&
      along > frame.effectiveDepth * 0.95
    ) {
      return 'wall-back';
    }

    // wall: any prismatic side face between entry and floor/back along axis.
    if (along > DISTANCE_TOL && along < frame.effectiveDepth - DISTANCE_TOL) {
      return 'wall';
    }
  }

  return null;
}
