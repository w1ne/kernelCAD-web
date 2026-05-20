// src/shared/intent/cameraTargetRecord.ts
//
// Types for the setCameraTarget() / setCameraDistance() top-level APIs. A
// camera-target feature is a capture-only (virtual) node that overrides the
// renderer's bbox-centroid auto-fit: instead of aiming the camera at the
// geometric centroid, the renderer aims at the explicit (x, y, z) point.
// Optional `distance` overrides the framing distance computed from the bbox
// projection.
//
// Use case: builds with tall asymmetric features (pocket-watch with
// pendant + bail above origin, scope with eyepiece offset, lamp with tall
// shaft) push the bbox centroid up-and-right at iso pose, jamming the
// hero subject against the viewport edge. setCameraTarget(0, 0, 15) re-aims
// at the visual centre of interest.
//
// Default behavior (script never calls this) preserves the existing
// bbox-centroid + projected-extent fit, so legacy scripts render
// pixel-identically.

import type { FeatureId } from './types';

/**
 * Author-surface spec for setCameraTarget(). The renderer treats the
 * supplied point as the new camera look-at target and recomputes framing
 * distance from the bbox extents projected against that target. Optional
 * `distance` overrides the auto-computed framing distance entirely (mm
 * from target along the pose direction).
 */
export interface CameraTargetSpec {
  x: number;
  y: number;
  z: number;
  /** Optional override for the framing distance in mm. When omitted, the
   *  renderer projects bbox corners against the new target and fits the
   *  screen-aligned extents to the camera FOV (matching the default
   *  setRenderPose behavior, just at a non-origin target). */
  distance?: number;
}

/**
 * Metadata stored on a `cameraTarget` FeatureRecord. Always `virtual: true`.
 * `distance` is `undefined` when the script did not pass an override.
 */
export interface CameraTargetMetadata {
  target: [number, number, number];
  distance?: number;
  virtual: true;
}

export interface CameraTargetHandle {
  readonly id: FeatureId;
  readonly metadata: CameraTargetMetadata;
}
