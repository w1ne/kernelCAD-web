// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/types.ts
//
// Data shapes exchanged between the four stages of the FEA runner:
// gmsh mesher -> .inp writer -> CalculiX -> .frd/.dat parsers -> summary.
//
// Units throughout: mm, N, MPa. That triple is self-consistent for CalculiX
// (which is unit-agnostic), matches kernelCAD's mm geometry, and is why the
// material table stores MPa rather than Pa.

import type { FeaMaterialProps } from '../../shared/intent/feaStudyRecord';

/** One 10-node quadratic tetrahedron, node ids in GMSH local order. */
export interface FeaTet10 {
  id: number;
  /** Exactly 10 node ids, gmsh element-type-11 ordering. */
  nodes: readonly number[];
}

/** Element-quality statistics reported by gmsh, used for trust flags. */
export interface FeaMeshQuality {
  /** Minimum signed inverse condition number over all tets. <= 0 means an
   *  inverted element; below ~0.1 the stress field is not trustworthy. */
  minSICN: number;
  meanSICN: number;
  /** Count of tets below the low-quality threshold. */
  lowQualityCount: number;
  /** Threshold `lowQualityCount` was measured against. */
  lowQualityThreshold: number;
}

/** A geometric surface of the meshed solid, as gmsh sees it. `ref` is filled
 *  in when the surface matched a kernelCAD face (centroid + area), which is
 *  what turns a node-level stress peak into a named region. */
export interface FeaSurface {
  tag: number;
  centroid: [number, number, number];
  area: number;
  nodes: readonly number[];
  /** Corner-node triples of the surface mesh — the skin the heatmap renders. */
  tris: readonly (readonly [number, number, number])[];
  ref?: string;
}

export interface FeaMesh {
  /** node id -> [x, y, z] in mm. */
  nodes: ReadonlyMap<number, readonly [number, number, number]>;
  elements: readonly FeaTet10[];
  surfaces: readonly FeaSurface[];
  quality: FeaMeshQuality;
  /** Target element size actually used, mm. */
  meshSize: number;
}

/** A named node set written into the .inp — the resolved boundary conditions. */
export interface FeaNodeSet {
  name: string;
  nodes: readonly number[];
}

/** One applied load after face resolution: the total force spread over the
 *  node set. */
export interface FeaResolvedLoad {
  name: string;
  set: FeaNodeSet;
  /** Total force on the set, N. */
  force: readonly [number, number, number];
}

export interface FeaJobSpec {
  mesh: FeaMesh;
  material: FeaMaterialProps;
  fixed: FeaNodeSet;
  loads: readonly FeaResolvedLoad[];
}

/** Per-node solved fields. Arrays are parallel to `nodeIds`. */
export interface FeaFieldResult {
  nodeIds: readonly number[];
  /** [ux, uy, uz] mm per node. */
  displacement: readonly (readonly [number, number, number])[];
  /** Von Mises stress, MPa, per node. */
  vonMises: readonly number[];
  /** CalculiX's own nodal stress-error estimator, percent, per node.
   *  Empty when the solver did not emit an ERROR block. */
  stressErrorPercent: readonly number[];
}

/** Totals parsed out of the .dat file. */
export interface FeaDatResult {
  /** Total reaction force on the fixed set, N. Compared against the applied
   *  load as an equilibrium check — the cheapest proof the model solved the
   *  problem that was posed. */
  totalReactionForce?: readonly [number, number, number];
}

/** One high-stress region of the part. */
export interface FeaHotSpot {
  /** `@kc[...]` face ref when the surface matched a kernelCAD face,
   *  otherwise `surface#<gmsh tag>`. */
  region: string;
  maxVonMisesMPa: number;
  /** Node the peak was measured at, and where it sits in mm. */
  nodeId: number;
  at: [number, number, number];
  safetyFactor: number;
}

export interface FeaSummary {
  study: string;
  material: { name: string } & FeaMaterialProps;
  maxVonMisesMPa: number;
  maxVonMisesAt: [number, number, number];
  maxDisplacementMm: number;
  maxDisplacementAt: [number, number, number];
  minSafetyFactor: number;
  minSafetyFactorRequired?: number;
  nodeCount: number;
  elementCount: number;
  meshSizeMm: number;
  quality: FeaMeshQuality;
  /** Worst nodal stress-error estimate in percent, or undefined when the
   *  solver emitted no error block. */
  maxStressErrorPercent?: number;
  /** Trust flags an agent must read before believing the numbers. */
  trust: FeaTrust;
  hotSpots: readonly FeaHotSpot[];
  appliedForceN: [number, number, number];
  reactionForceN?: [number, number, number];
  /** Relative equilibrium residual |R + F| / |F|. Near 0 is healthy. */
  equilibriumResidual?: number;
  solveMs: number;
  meshMs: number;
}

export interface FeaTrust {
  /** false when mesh quality or the solver's own error estimate says the
   *  stress field should not be believed as-is. */
  meshTrusted: boolean;
  reasons: readonly string[];
}
