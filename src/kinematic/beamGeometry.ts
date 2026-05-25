// src/kinematic/beamGeometry.ts
//
// Closed-form cross-section properties for the Euler-Bernoulli beam path.
// Every authored cross-section is in millimetres; this module SI-converts
// once at entry so downstream math sits in metres without re-conversion.
//
// Conventions:
//   - `cM`              = distance from neutral axis to the extreme fibre
//                         (the location with the largest bending stress)
//                         in metres.
//   - `iM4`             = second moment of area about the neutral axis, m^4.
//   - `sectionModulusM3` = Z = I/c, m^3. Pre-computed so the bending-stress
//                         consumer can avoid the divide.
//   - `lengthM`         = beam free-span length in metres.
//   - `appliesFor`      = 'cantilever' (v1). Future kinds — 'simply-supported',
//                         'fixed-both-ends' — will land alongside their
//                         distinct moment formulas.
//
// I-beam: cross-section is two flanges sandwiching a web; symmetry gives
// c = (webHeight + 2·flangeThickness) / 2, and I is composed via the
// parallel-axis theorem about the i-beam's centroidal axis.

import type { AssemblyCrossSection } from '../modeling/capture/assembly';

const MM_TO_M = 1e-3;

export interface SectionProperties {
  readonly cM: number;
  readonly iM4: number;
  readonly sectionModulusM3: number;
  readonly lengthM: number;
  readonly appliesFor: 'cantilever';
}

/**
 * Map an authored cross-section to its closed-form SI properties.
 *
 * - rectangle: c = h/2, I = w·h^3 / 12, bending assumed about the
 *   width axis (the heightMm dimension is the depth in bending).
 * - circle:    c = r,    I = π·r^4 / 4.
 * - i-beam:    c = (h_web + 2·t_flange) / 2, I = I_web +
 *              2·(I_flange + A_flange·d^2) with d = (h_web + t_flange)/2.
 */
export function sectionProperties(
  cs: AssemblyCrossSection,
): SectionProperties {
  if (cs.kind === 'rectangle') {
    const cMm = cs.heightMm / 2;
    const iMm4 = (cs.widthMm * cs.heightMm ** 3) / 12;
    return {
      cM: cMm * MM_TO_M,
      iM4: iMm4 * MM_TO_M ** 4,
      sectionModulusM3: (iMm4 / cMm) * MM_TO_M ** 3,
      lengthM: cs.lengthMm * MM_TO_M,
      appliesFor: 'cantilever',
    };
  }
  if (cs.kind === 'circle') {
    const cMm = cs.radiusMm;
    const iMm4 = (Math.PI * cs.radiusMm ** 4) / 4;
    return {
      cM: cMm * MM_TO_M,
      iM4: iMm4 * MM_TO_M ** 4,
      sectionModulusM3: (iMm4 / cMm) * MM_TO_M ** 3,
      lengthM: cs.lengthMm * MM_TO_M,
      appliesFor: 'cantilever',
    };
  }
  // i-beam.
  const totalHeightMm = cs.webHeightMm + 2 * cs.flangeThicknessMm;
  const cMm = totalHeightMm / 2;
  const iWebMm4 = (cs.webThicknessMm * cs.webHeightMm ** 3) / 12;
  const iFlangeOwnMm4 = (cs.flangeWidthMm * cs.flangeThicknessMm ** 3) / 12;
  const aFlangeMm2 = cs.flangeWidthMm * cs.flangeThicknessMm;
  const dMm = (cs.webHeightMm + cs.flangeThicknessMm) / 2;
  const iFlangeShiftedMm4 = iFlangeOwnMm4 + aFlangeMm2 * dMm * dMm;
  const iMm4 = iWebMm4 + 2 * iFlangeShiftedMm4;
  return {
    cM: cMm * MM_TO_M,
    iM4: iMm4 * MM_TO_M ** 4,
    sectionModulusM3: (iMm4 / cMm) * MM_TO_M ** 3,
    lengthM: cs.lengthMm * MM_TO_M,
    appliesFor: 'cantilever',
  };
}
