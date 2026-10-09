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
  /** Corner-node triangles of the loaded surfaces. When present the deck
   *  writer spreads the force as a consistent uniform traction (area-weighted,
   *  on the quadratic faces' mid-side nodes); when absent it falls back to an
   *  equal split over `set`. */
  tris?: readonly (readonly [number, number, number])[];
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
  /** Worst nodal stress-error estimate in percent over the high-stress part
   *  of the governing field (von Mises >= half the governing peak), or
   *  undefined when the solver emitted no error block. */
  maxStressErrorPercent?: number;
  /** Trust flags an agent must read before believing the numbers. */
  trust: FeaTrust;
  hotSpots: readonly FeaHotSpot[];
  /** Which nodes the governing values above (maxVonMises*, minSafetyFactor,
   *  hotSpots, maxStressErrorPercent, trust) were taken over.
   *  'away-from-supports': nodes within 0.4 x the local wall thickness of a
   *  fixed-face edge (the support zone) are excluded, because a rigid clamp makes the stress there singular and
   *  mesh-dependent. 'all-nodes': the support zone covered too much of the
   *  part to exclude, so the raw field governs. Absent when the fixed region
   *  has no edge. */
  governingField?: 'away-from-supports' | 'all-nodes';
  /** Solved nodes in the support zone. */
  supportAdjacentNodeCount?: number;
  /** Range of the support-zone radius over the fixed-face edges, mm. */
  supportZoneRadiusMm?: { min: number; max: number };
  /** Raw peak von Mises inside that support zone, MPa, and where it is. A
   *  clamp idealisation value: it grows as the mesh is refined, and real bolt
   *  clamping spreads it. */
  peakAtSupportMPa?: number;
  peakAtSupportAt?: [number, number, number];
  peakAtSupportRegion?: string;
  /** Worst solver error estimate inside the support zone, percent. */
  maxStressErrorAtSupportPercent?: number;
  /** Automatic mesh refinement record (autoRefine.ts). Present when the run
   *  was allowed to refine; the summary's own numbers are from the LAST
   *  (finest) pass listed here. */
  refinement?: FeaRefinement;
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
  /** What the trust rests on when it is not the plain per-mesh check:
   *  'peak-convergence' means the solver's error estimate was still above
   *  its threshold but the governing peak moved less than 5 % between the
   *  last two refinement passes (autoRefine.ts). Absent otherwise. */
  basis?: 'peak-convergence';
}

/** One solve of an auto-refined run. */
export interface FeaRefinementPass {
  meshSizeMm: number;
  elementCount: number;
  /** Governing peak von Mises (away from the supports), MPa. */
  governingPeakMPa: number;
  maxStressErrorPercent?: number;
  /** The per-mesh trust check of this pass on its own. */
  meshTrusted: boolean;
  /** Governing region of the peak (`hotSpots[0].region`). */
  region?: string;
  /** |peak - previous peak| / peak, percent. Absent on the first pass. */
  peakChangePercent?: number;
  /** Mesh + solve wall time of this pass, ms. */
  wallMs: number;
}

/** Why auto-refinement stopped where it did. */
export type FeaRefinementStop =
  /** The last pass passed the per-mesh trust check. */
  | 'trusted'
  /** The governing peak moved < 5 % over the last refinement step. */
  | 'converged'
  /** Untrusted for element quality only (slivers / inverted elements),
   *  which a smaller element size does not reliably fix. */
  | 'quality-limited'
  /** The solver emitted no error estimate to refine against. */
  | 'no-error-estimate'
  /** The next pass would exceed the element budget. */
  | 'element-budget'
  /** The next pass would exceed the wall-time budget. */
  | 'time-budget'
  /** Every allowed pass ran and the result is still untrusted. */
  | 'max-passes'
  /** A refinement pass failed (mesh or solve); the previous pass stands. */
  | 'pass-failed';

export interface FeaRefinement {
  /** Every solve in order, coarsest first; the summary is the last one. */
  passes: readonly FeaRefinementPass[];
  /** The governing peak changed < 5 % over the last refinement step (a
   *  real step: element size ratio <= 0.8), and its region carried that
   *  peak on the coarser mesh too. */
  converged: boolean;
  stoppedBy: FeaRefinementStop;
  /** Element budget the passes were held to (KERNELCAD_FEA_MAX_ELEMENTS). */
  elementBudget: number;
  /** Total wall-time budget for all passes, ms (KERNELCAD_FEA_REFINE_TIME_MS). */
  timeBudgetMs: number;
  /** Why it stopped, in words (budget numbers, the failed pass's error). */
  note?: string;
}
