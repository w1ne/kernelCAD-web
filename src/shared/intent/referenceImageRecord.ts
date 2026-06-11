// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/referenceImageRecord.ts
//
// Types for the referenceImage() top-level API. A reference-image feature is
// a capture-only (virtual) node that carries an image path, plane, and display
// metadata. It never produces OCCT geometry — the renderer reads it directly
// from the feature graph.

import type { PlaneSpec, Vec3, FeatureId } from './types';

/**
 * Scale control for a reference image overlay.
 *
 * - `'fit-bbox'`       — the renderer stretches the image to fill the current
 *                        model bounding box on the chosen plane (default).
 * - `number`           — explicit width-of-image in mm; aspect ratio preserved.
 * - `{ width?, height? }` — explicit width and/or height in mm; if only one is
 *                        given the other is computed from the pixel aspect ratio.
 */
export type ReferenceImageScale =
  | 'fit-bbox'
  | number
  | { width?: number; height?: number };

/**
 * Metadata stored on a `referenceImage` FeatureRecord. All fields are
 * required on the captured record; `virtual: true` signals to the recompute
 * pipeline that no OCCT lowering is needed.
 */
export interface ReferenceImageMetadata {
  /** Resolved absolute path to the image file. */
  path: string;
  /** Plane on which the reference image is displayed. */
  plane: PlaneSpec;
  /** World-space anchor point ('origin' or explicit Vec3 in mm). */
  anchor: 'origin' | Vec3;
  /** Scaling strategy — see `ReferenceImageScale`. */
  scale: ReferenceImageScale;
  /** Display opacity in [0, 1]; default 0.5. */
  opacity: number;
  /** Flip the image horizontally (U axis). */
  flipU: boolean;
  /** Flip the image vertically (V axis). */
  flipV: boolean;
  /** Native image width in pixels; 0 when header parsing fails. */
  pixelWidth: number;
  /** Native image height in pixels; 0 when header parsing fails. */
  pixelHeight: number;
  /** Always true — marks this record as a non-geometry (virtual) node. */
  virtual: true;
}

/**
 * Return value of `referenceImage(path, opts)`.
 * Provides the assigned FeatureId and a snapshot of the captured metadata.
 */
export interface ReferenceImageHandle {
  readonly id: FeatureId;
  readonly metadata: ReferenceImageMetadata;
}
