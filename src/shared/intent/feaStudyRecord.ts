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
import type { FeatureId } from './types';

/** How a study names faces. Either a `FaceQuery` (the same selector object
 *  `list_faces` / `.shell()` / `.hole()` take) or a `@kc[...]` topology-ref
 *  string as returned by `list_faces`. One vocabulary, no third syntax. */
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
  /** Author-facing label echoed in diagnostics and the result summary. */
  name?: string;
}

export interface FeaStudySpec {
  /** A named material (`mild-steel`, `aluminum-6061`, `pla`, `petg`, `abs`,
   *  `nylon`) or explicit `{ E, nu, yield }`. */
  material: string | FeaMaterialProps;
  /** Faces held fully fixed (all three translations zeroed). */
  fixed: FeaFaceSelector;
  /** One or more applied loads. At least one is required — a study with no
   *  load reports nothing. */
  loads: readonly FeaLoadSpec[];
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
