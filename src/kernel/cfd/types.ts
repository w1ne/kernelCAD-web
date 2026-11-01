// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/cfd/types.ts
//
// Data exchanged between the stages of the CFD runner:
//   geometry (fluid volume + named patches, STL)  ->  case spec  ->
//   OpenFOAM dictionaries  ->  blockMesh / snappyHexMesh / checkMesh /
//   simpleFoam  ->  log + postProcessing parsers  ->  summary.
//
// Units: the CASE is SI (m, m/s, Pa, kg/s, N); kernelCAD geometry is mm and
// is scaled by 1e-3 when the STL is written. The summary reports SI values,
// with the mm-flavoured fields named so (`...Mm`).

export type Vec3 = [number, number, number];

export type CfdTurbulenceModel = 'laminar' | 'kOmegaSST';

/** A patch the case is built with and the BC it gets. */
export interface FoamPatch {
  name: string;
  role: 'inlet' | 'outlet' | 'wall' | 'slip' | 'background';
}

/** Everything the dictionary writers need. Pure data; no geometry kernel. */
export interface FoamCaseSpec {
  flow: 'internal' | 'external';
  /** Background blockMesh box (m) and cell counts. */
  block: { min: Vec3; max: Vec3; cells: [number, number, number] };
  /** blockMesh face patches: xmin, xmax, ymin, ymax, zmin, zmax. */
  blockPatches: readonly [FoamPatch, FoamPatch, FoamPatch, FoamPatch, FoamPatch, FoamPatch];
  /** STL regions written into constant/triSurface/geometry.stl. */
  stlPatches: readonly FoamPatch[];
  /** A point inside the fluid (m) that snappyHexMesh keeps. */
  locationInMesh: Vec3;
  /** snappyHexMesh surface refinement level relative to the block cells. */
  surfaceLevel: number;
  /** Optional refinement box (m) at `level` (external wake region). */
  refineBox?: { min: Vec3; max: Vec3; level: number };
  fluid: { rho: number; nu: number };
  turbulence: CfdTurbulenceModel;
  /** Inlet condition: a speed normal to the inlet patch, a volumetric flow
   *  rate, or (external) a free-stream vector. */
  inlet:
    | { kind: 'normalSpeed'; speed: number }
    | { kind: 'flowRate'; m3s: number }
    | { kind: 'freestream'; U: Vec3 };
  /** Outlet kinematic pressure, p / rho (m^2/s^2). */
  outletKinematicP: number;
  /** Turbulence inlet values (only used with kOmegaSST). */
  turbulenceInlet: { k: number; omega: number };
  iterations: number;
  residualTarget: number;
  cores: number;
  /** External flow: the body patch force monitor. */
  forces?: { patch: string; rhoInf: number; CofR: Vec3 };
  /** Mid-plane cut for the preview, point + normal (m). */
  plane: { point: Vec3; normal: Vec3 };
}

export interface CfdResidualSample {
  iteration: number;
  /** Initial residual per solved field this iteration. */
  initial: Record<string, number>;
}

export interface CfdMeshReport {
  cells: number;
  faces: number;
  points: number;
  /** `Mesh OK.` from checkMesh. */
  ok: boolean;
  failedChecks: number;
  maxNonOrthogonality?: number;
  maxSkewness?: number;
  maxAspectRatio?: number;
  /** Patch name -> face count after snapping. */
  patchFaces: Record<string, number>;
}

export type CfdConvergenceVerdict = 'converged' | 'not-converged' | 'diverged';

export interface CfdPatchFlow {
  patch: string;
  /** Volumetric flow through the patch, m^3/s (positive = leaving the domain). */
  flowM3s: number;
  massFlowKgs: number;
  /** Area-averaged static pressure, Pa gauge. */
  pressurePa: number;
}

export interface CfdSummary {
  study: string;
  flow: 'internal' | 'external';
  solver: 'openfoam-simpleFoam';
  openfoam: { mode: 'native' | 'docker'; version?: string; image?: string };
  fluid: { name: string; rho: number; nu: number; mu: number };
  /** Reynolds number and the length it is based on. */
  reynolds: { value: number; lengthMm: number; speed: number; basis: string };
  turbulence: { model: CfdTurbulenceModel; chosen: 'auto' | 'user'; reason: string };
  mesh: CfdMeshReport & { surfaceCellMm: number; backgroundCellMm: number };
  iterations: number;
  convergence: {
    verdict: CfdConvergenceVerdict;
    /** 'residuals': the residual target was met. 'monitors': residuals
     *  plateaued above it, but the monitored quantity and the mass balance
     *  were steady (the reason states the plateau value). */
    criterion?: 'residuals' | 'monitors';
    residualTarget: number;
    finalResiduals: Record<string, number>;
    /** Relative change of the monitored quantity over the last 10% of iterations. */
    monitorDrift?: number;
    /** The monitored quantity over the last 20% of iterations: inlet static
     *  pressure (internal, Pa gauge) or drag (external, N). `band` is
     *  (max - min) / |mean|: the honest error bar of an unconverged run. */
    monitor?: { quantity: string; mean: number; band: number };
    reason: string;
  };
  /** Residual history, decimated to at most 200 samples. */
  residualHistory: CfdResidualSample[];
  /** Internal flow. */
  pressureDropPa?: number;
  patches: CfdPatchFlow[];
  massBalance: { inflowKgs: number; outflowKgs: number; imbalance: number };
  maxVelocity: number;
  /** External flow. */
  forces?: {
    totalN: Vec3;
    pressureN: Vec3;
    viscousN: Vec3;
    dragN: number;
    liftN: number;
    referenceAreaMm2: number;
    cd: number;
    cl: number;
    dragAxis: Vec3;
    liftAxis: Vec3;
  };
  solveMs: number;
  meshMs: number;
  /** Not a certification: a steady RANS/laminar estimate on a snapped hex mesh. */
  disclaimer: string;
  inputHash: string;
}
