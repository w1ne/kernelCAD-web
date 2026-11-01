// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/cfdStudyRecord.ts
//
// Types for the `shape.cfdStudy({...})` API and the `run_cfd` tool. A
// cfdStudy is a capture-only (virtual) node: it never produces geometry. It
// declares an incompressible, steady flow study on ONE solid:
//
//   - internal flow: the fluid fills the part's interior channel(s) (or the
//     solid IS the fluid volume) between named inlet and outlet faces;
//   - external flow: a box of fluid around the part, flowing along one axis.
//
// Unlike `feaStudy` there is no evaluate-time gate: a CFD solve takes
// minutes, so the declaration is a report request run by `run_cfd`.

import type { FeaFaceSelector } from './feaStudyRecord';

/** Faces are named exactly like a structural study's faces. */
export type CfdFaceSelector = FeaFaceSelector;

/** Explicit fluid properties. SI units: kg/m^3 and m^2/s. */
export interface CfdFluidProps {
  /** Density, kg/m^3. Water is 998. */
  rho: number;
  /** Kinematic viscosity, m^2/s. Water at 20 C is 1.0e-6. */
  nu: number;
}

export type CfdFlowKind = 'internal' | 'external';

/** Internal flow: which volume is the fluid. */
export type CfdFluidVolume = 'interior' | 'solid';

/** Axis-aligned flow direction for external flow. */
export type CfdAxisDirection = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

/** Turbulence treatment. 'auto' picks from the Reynolds number. */
export type CfdTurbulenceChoice = 'auto' | 'laminar' | 'kOmegaSST';

/** Mesh density preset; a number is the surface cell size in mm. */
export type CfdResolution = 'coarse' | 'medium' | 'fine';

export interface CfdStudySpec {
  /** 'internal' (pipe, duct, manifold) or 'external' (flow around the part). */
  flow: CfdFlowKind;
  /** 'water' | 'air' or explicit { rho, nu }. Default: water (internal),
   *  air (external). */
  fluid?: string | CfdFluidProps;
  /** Internal flow: 'interior' (default) fills the part's channels, which
   *  must open onto its bounding box; 'solid' treats the solid itself as the
   *  fluid volume. */
  fluidVolume?: CfdFluidVolume;
  /** Internal flow: the inlet face(s), named on the FLUID volume. */
  inlet?: CfdFaceSelector;
  /** Internal flow: the outlet face(s). An array makes one patch per entry,
   *  so the flow split between outlets is reported. */
  outlet?: CfdFaceSelector | readonly CfdFaceSelector[];
  /** Inlet (internal) or free-stream (external) speed, m/s. */
  velocity?: number;
  /** Internal flow alternative to `velocity`: volumetric flow rate, L/min. */
  flowRateLpm?: number;
  /** Outlet static pressure, Pa gauge. Default 0. */
  outletPressurePa?: number;
  /** External flow direction. Default '+X'. */
  direction?: CfdAxisDirection;
  /** Surface cell size in mm, or a preset. Default 'medium'. */
  meshSize?: number | CfdResolution;
  /** SIMPLE iteration cap. Default 400. */
  iterations?: number;
  /** Initial-residual target for convergence. Default 1e-4. */
  residualTarget?: number;
  /** Default 'auto'. */
  turbulence?: CfdTurbulenceChoice;
  /** External flow: reference area for Cd/Cl in mm^2. Default: the part's
   *  projected frontal area. */
  referenceAreaMm2?: number;
  /** Author-facing study name; defaults to `cfd`. */
  name?: string;
}

/** Normalized study stored on the record and consumed by the runner. */
export interface CfdStudyMetadata {
  name: string;
  flow: CfdFlowKind;
  fluid: { name: string; rho: number; nu: number };
  fluidVolume?: CfdFluidVolume;
  inlet?: CfdFaceSelector;
  outlets?: readonly CfdFaceSelector[];
  velocity?: number;
  flowRateLpm?: number;
  outletPressurePa: number;
  direction: CfdAxisDirection;
  meshSize: number | CfdResolution;
  iterations: number;
  residualTarget: number;
  turbulence: CfdTurbulenceChoice;
  referenceAreaMm2?: number;
  virtual: true;
}

export interface CfdStudyHandle {
  readonly id: string;
  readonly metadata: CfdStudyMetadata;
}
