// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/motionLoadRecord.ts
//
// The part-level hand-off from a motion-load study to a structural study.
//
// `checkMotionLoad` computes a joint wrench at every sampled pose. This type
// carries the worst one per part (and the side it acts on) in the part's
// source-shape frame, which is the frame a `feaStudy` lowers. It is stored in
// shared/ so the FEA declaration can name the result without importing the
// kinematic layer (shared -> kernel -> modeling -> kinematic is one-way).

export type MotionLoadVector = readonly [number, number, number];

/** Which body the joint wrench acts on: the downstream subtree (the moving
 *  side the actuator drives) or the parent/support (the reaction). */
export type MotionLoadSide = 'parent' | 'downstream';

/** How samples were ranked for this part. `von-mises-section` is the
 *  bending stress implied by the joint moment and the declared cross-section
 *  (MPa); `joint-moment` is the moment magnitude alone (N·mm) when the part
 *  has no declared section. The proxy chooses the pose; it is not the FEA
 *  safety factor. */
export interface MotionLoadProxy {
  readonly kind: 'von-mises-section' | 'joint-moment';
  readonly value: number;
  readonly unit: 'MPa' | 'N*mm';
}

/** The worst sampled wrench on one part at one joint, in the part frame. */
export interface MotionPartLoadSample {
  readonly part: string;
  readonly joint: string;
  readonly mate: string;
  readonly actuator: string;
  readonly side: MotionLoadSide;
  /** Index into the joint's `series`. */
  readonly sampleIndex: number;
  readonly tMs?: number;
  /** Mate-pose values at this sample. */
  readonly pose: Readonly<Record<string, number>>;
  /** Joint origin in the part's source-shape frame, mm. */
  readonly pointMm: MotionLoadVector;
  /** Force on the part, source-shape frame, N. */
  readonly forceN: MotionLoadVector;
  /** Moment about `pointMm`, source-shape frame, N·mm. */
  readonly momentNmm: MotionLoadVector;
  readonly proxy: MotionLoadProxy;
}
