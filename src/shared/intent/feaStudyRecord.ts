// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/feaStudyRecord.ts
//
// Types for the `shape.feaStudy({...})` API. A feaStudy is a capture-only
// (virtual) node — it never produces OCCT geometry. It declares a linear
// static structural study on ONE solid: where the part is held, what pushes
// on it, what it is made of, and (optionally) the safety factor the design
// must clear.
//
// Same enforcement contract as `dfmSpec`: the record is a DECLARATION, the
// solver run is the enforcement, and a declared `minSafetyFactor` makes a
// violation fail `evaluate_script`. Malformed declarations throw at capture
// rather than stashing diagnostics — a silently-disabled structural gate is
// worse than a build failure.

import type { FaceQuery } from './queryTypes';
import type { MotionPartLoadSample } from './motionLoadRecord';
import type { FeatureId } from './types';

/** How a study names faces. Either a `FaceQuery` (the same selector object
 *  `list_faces` / `.shell()` / `.hole()` take) or a string: a `@kc[...]`
 *  topology ref as returned by `list_faces`, a bare face label ('bottom'),
 *  which must match exactly one face, or an `@kcq[...]` Query, which binds
 *  every face it selects. */
export type FeaFaceSelector = FaceQuery | string;

/** Explicit material properties, for a grade outside the named table.
 *  Units are the kernelCAD solver units: mm / N / MPa. */
export interface FeaMaterialProps {
  /** Young's modulus, MPa (N/mm^2). Steel is 200000. */
  E: number;
  /** Poisson's ratio, dimensionless. Must be in (-1, 0.5). */
  nu: number;
  /** Tensile yield strength, MPa. The safety factor is yield / vonMises. */
  yield: number;
}

export interface FeaLoadSpec {
  /** Faces the force is applied to. The force is distributed over every
   *  mesh node on those faces. */
  faces: FeaFaceSelector;
  /** Total force vector [Fx, Fy, Fz] in newtons, applied to `faces` as a
   *  whole (NOT per node). */
  force: readonly [number, number, number];
  /** Remote wrench application point in the shape's frame, mm. When present
   *  the load is a wrench about this point, distributed over `faces` as a
   *  statically equivalent nodal load. */
  pointMm?: readonly [number, number, number];
  /** Moment about `pointMm`, shape frame, N·mm. Requires `pointMm`. */
  momentNmm?: readonly [number, number, number];
  /** Author-facing label echoed in diagnostics and the result summary. */
  name?: string;
  /** Provenance when the load was derived from a motion-load study. */
  fromMotion?: MotionPartLoadSample;
}

/** Load a structural study from a completed motion-load result. The load is
 *  the worst sampled joint wrench acting on `part` (or a named pose when the
 *  motion study was sampled there), never a hand-typed force. */
export interface FeaLoadsFromMotionSpec {
  /** The result of `kinematic.motionLoad(assembly, opts)` (or
   *  `checkMotionLoad`). Only `partLoads` is read. */
  motion: { readonly partLoads?: readonly MotionPartLoadSample[] };
  /** Assembly part the study's shape is. */
  part: string;
  /** Restrict to one joint; default: the worst proxy for `part`. */
  joint?: string;
  /** Restrict to a named pose (mate name -> degrees). The motion result must
   *  contain that sample; run motionLoad with `poses` to sample it. */
  pose?: Readonly<Record<string, number>>;
  /** Faces that distribute the remote wrench. Default: a query containing
   *  the joint origin. */
  faces?: FeaFaceSelector;
}

export interface FeaStudySpec {
  /** A named material (`mild-steel`, `aluminum-6061`, `pla`, `petg`, `abs`,
   *  `nylon`) or explicit `{ E, nu, yield }`. */
  material: string | FeaMaterialProps;
  /** Faces held fully fixed (all three translations zeroed). */
  fixed: FeaFaceSelector;
  /** One or more applied loads. Either `loads` or `loadsFrom` is required —
   *  a study with no load reports nothing. */
  loads?: readonly FeaLoadSpec[];
  /** Derive the load from a motion-load result instead of hand-typing it.
   *  Mutually exclusive with `loads`. */
  loadsFrom?: FeaLoadsFromMotionSpec;
  /** Target element size in mm. Omitted: derived from the bounding box. */
  meshSize?: number;
  /** Makes the study an ENFORCEMENT gate. When the solved minimum safety
   *  factor falls below this, `fea.safety-factor.below-min` fires at error
   *  severity and the evaluation fails. Omit for a report-only study. */
  minSafetyFactor?: number;
  /** Author-facing study name; defaults to `study`. */
  name?: string;
}

/** Normalized load stored on the record. */
export interface FeaLoadMetadata {
  faces: FeaFaceSelector;
  force: [number, number, number];
  name: string;
  /** Remote wrench application point in the shape's frame, mm. */
  pointMm?: [number, number, number];
  /** Moment about `pointMm`, shape frame, N·mm. */
  momentNmm?: [number, number, number];
  /** Provenance when the load came from a motion-load study. */
  fromMotion?: MotionPartLoadSample;
}

export interface FeaStudyMetadata {
  name: string;
  /** Either the requested material NAME (resolved against the FEA material
   *  table at run time, so a table edit flows through) or explicit props. */
  material: string | FeaMaterialProps;
  fixed: FeaFaceSelector;
  loads: readonly FeaLoadMetadata[];
  meshSize?: number;
  minSafetyFactor?: number;
  virtual: true;
}

export interface FeaStudyHandle {
  readonly id: FeatureId;
  readonly metadata: FeaStudyMetadata;
}

/** Structural type guard for `FeaMaterialProps` — used by the capture-time
 *  validator and by the runner's material resolver. */
export function isFeaMaterialProps(v: unknown): v is FeaMaterialProps {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.E === 'number' && typeof o.nu === 'number' && typeof o.yield === 'number';
}
