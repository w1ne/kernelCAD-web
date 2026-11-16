// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/flight/barrowman.ts
//
// Barrowman subsonic centre of pressure (J. Barrowman, "The Theoretical
// Prediction of the Center of Pressure", NARAM-8, 1966) for a nose cone, a
// constant-diameter body and one trapezoidal fin set, plus a simple zero-lift
// drag estimate for Cd 'auto'. All lengths in metres; positions measured from
// the nose tip toward the tail.

import type { NoseShape } from '../../shared/intent/flightStudyRecord';

export interface NoseGeometry {
  shape: NoseShape;
  lengthM: number;
}

export interface FinGeometry {
  count: number;
  rootChordM: number;
  tipChordM: number;
  /** Semi-span, body surface to tip. */
  spanM: number;
  /** Root LE to tip LE, axial. */
  sweepM: number;
  /** Nose tip to the root leading edge. */
  leadingEdgeM: number;
  thicknessM: number;
}

export interface VehicleAero {
  refDiameterM: number;
  lengthM: number;
  nose: NoseGeometry;
  fins?: FinGeometry;
}

export interface CpComponent {
  name: 'nose' | 'fins';
  /** Normal-force coefficient slope, per radian. */
  cnAlpha: number;
  /** Component CP from the nose tip, m. */
  xM: number;
}

export interface CpResult {
  cnAlpha: number;
  /** Vehicle CP from the nose tip, m. */
  xM: number;
  components: CpComponent[];
}

/** Nose CP as a fraction of its length (Barrowman): cone 2/3, tangent ogive 0.466. */
const NOSE_CP_FRACTION: Record<NoseShape, number> = { cone: 2 / 3, ogive: 0.466 };

export function barrowmanCp(v: VehicleAero): CpResult {
  const components: CpComponent[] = [{ name: 'nose', cnAlpha: 2, xM: NOSE_CP_FRACTION[v.nose.shape] * v.nose.lengthM }];
  const f = v.fins;
  if (f !== undefined && f.count > 0 && f.spanM > 0) {
    const d = v.refDiameterM;
    const R = d / 2;
    const { rootChordM: cr, tipChordM: ct, spanM: s, sweepM: xr } = f;
    // Mid-chord line length.
    const lf = Math.hypot(s, xr + ct / 2 - cr / 2);
    // Barrowman's fin term, derived for 3 and 4 fins (linear in N).
    const cnFins = (4 * f.count * (s / d) ** 2) / (1 + Math.sqrt(1 + ((2 * lf) / (cr + ct)) ** 2));
    const interference = 1 + R / (s + R);
    const xf =
      f.leadingEdgeM +
      ((xr / 3) * (cr + 2 * ct)) / (cr + ct) +
      (1 / 6) * (cr + ct - (cr * ct) / (cr + ct));
    components.push({ name: 'fins', cnAlpha: interference * cnFins, xM: xf });
  }
  const cnAlpha = components.reduce((a, c) => a + c.cnAlpha, 0);
  const xM = components.reduce((a, c) => a + c.cnAlpha * c.xM, 0) / cnAlpha;
  return { cnAlpha, xM, components };
}

export interface CdEstimate {
  cd: number;
  parts: { bodyFriction: number; finFriction: number; base: number };
  reynolds: number;
}

/** Air kinematic viscosity at 15 C, m^2/s. */
const NU_AIR = 1.46e-5;
/** Speed the friction coefficient is evaluated at, m/s (a typical hobby-rocket coast). */
const REFERENCE_SPEED = 50;
/** Subsonic base-drag coefficient of a blunt aft end (OpenRocket: 0.12 + 0.13 M^2). */
const BASE_CD = 0.12;

/**
 * Zero-lift drag estimate on the body cross-section: turbulent skin friction
 * on the body (with a fineness-ratio form factor) and the fins (both sides,
 * thickness form factor), plus base drag. Engineering estimate, not a CFD
 * or wind-tunnel number; declare a measured or OpenRocket Cd when you have one.
 */
export function estimateCd(v: VehicleAero): CdEstimate {
  const d = v.refDiameterM;
  const R = d / 2;
  const aRef = Math.PI * R * R;
  const reynolds = (REFERENCE_SPEED * v.lengthM) / NU_AIR;
  const cf = 0.074 / reynolds ** 0.2;
  const ln = Math.min(v.nose.lengthM, v.lengthM);
  const noseWet = Math.PI * R * Math.hypot(R, ln) * (v.nose.shape === 'ogive' ? 1.1 : 1);
  const bodyWet = Math.PI * d * Math.max(0, v.lengthM - ln);
  const fineness = v.lengthM / d;
  const bodyFriction = (cf * (1 + 1 / (2 * fineness)) * (noseWet + bodyWet)) / aRef;
  let finFriction = 0;
  const f = v.fins;
  if (f !== undefined && f.count > 0) {
    const area = 0.5 * (f.rootChordM + f.tipChordM) * f.spanM;
    const meanChord = 0.5 * (f.rootChordM + f.tipChordM);
    finFriction = (cf * (1 + (2 * f.thicknessM) / meanChord) * 2 * area * f.count) / aRef;
  }
  return { cd: bodyFriction + finFriction + BASE_CD, parts: { bodyFriction, finFriction, base: BASE_CD }, reynolds };
}
