// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/lattice/latticeReportText.ts
//
// One-line human summary of a lattice build report (diagnostic message).

import type { LatticeReport } from '../../kernel/lattice/buildLattice';

const f = (v: number, d = 2): string => v.toFixed(d);

export function latticeReportMessage(r: LatticeReport): string {
  const what = r.variant === 'sheet' && r.designWallMm
    ? `wall ${f(r.designWallMm.min)}${r.designWallMm.max > r.designWallMm.min + 1e-6 ? `-${f(r.designWallMm.max)}` : ''} mm`
    : `density ${f(r.designFraction.min * 100, 0)}${r.designFraction.max > r.designFraction.min + 1e-6 ? `-${f(r.designFraction.max * 100, 0)}` : ''} %`;
  const wall = r.measuredWallMm ? `; measured wall p5 ${f(r.measuredWallMm.p5Mm)} mm (min ${f(r.measuredWallMm.minMm)})` : '';
  const skin = r.measuredSkinMm ? `, skin p5 ${f(r.measuredSkinMm.p5Mm)} mm` : '';
  const around = r.cellsAround !== undefined ? `, ${r.cellsAround} cells around` : '';
  return `lattice: ${r.type} ${r.variant}, cell ${f(r.cellMm, 1)} mm${around}, ${what}, skin ${f(r.skinMm)} mm${wall}${skin}; `
    + `volume ${f(r.volumeMm3, 0)} mm3 = ${f(r.solidFraction * 100, 1)} % of the solid body; `
    + `${r.triangles} triangles (${r.watertight && r.consistentOrientation ? 'watertight, consistently oriented' : 'NOT watertight'}); `
    + `grid ${f(r.gridStepMm, 3)} mm${r.resolutionClamped ? ' (coarsened to fit the grid budget)' : ''}; ${r.timingsMs.totalMs} ms. `
    + 'Mesh solid: STL / 3MF / OBJ export; no booleans, fillets or STEP after .lattice().';
}
