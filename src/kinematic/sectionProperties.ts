// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kinematic/sectionProperties.ts
//
// Coarse section properties for the motion -> FEA pose proxy. They are used
// ONLY to rank sampled poses ("which pose bends this part hardest"), never as
// a structural verdict: the FEA solve produces the safety factor.

import type { AssemblyCrossSection } from '../modeling/capture/assemblyTypes';

/** Smaller elastic section modulus of a declared cross-section, mm^3.
 *  Bending about the weaker axis is the conservative choice for a ranking
 *  proxy. */
export function sectionModulusMm3(section: AssemblyCrossSection): number {
  switch (section.kind) {
    case 'rectangle': {
      const w = section.widthMm;
      const h = section.heightMm;
      return Math.max(1e-9, Math.min((w * h * h) / 6, (h * w * w) / 6));
    }
    case 'circle':
      return Math.max(1e-9, (Math.PI * section.radiusMm ** 3) / 4);
    case 'i-beam': {
      const h = section.webHeightMm + 2 * section.flangeThicknessMm;
      const outer = (section.flangeWidthMm * h ** 3) / 6;
      const inner = ((section.flangeWidthMm - section.webThicknessMm) * section.webHeightMm ** 3) / 6;
      return Math.max(1e-9, (outer - inner) / h);
    }
  }
}
