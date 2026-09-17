// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const FEA_CODES = {
  // Structural FEA gate (5) — the linear-static study declared by
  // `shape.feaStudy({...})`. Same contract as the dfm.* gates: the
  // declaration lives in the model, the solver run is the enforcement, and a
  // missing toolchain is reported rather than silently passed.
  'fea.safety-factor.below-min': {
    hintTemplate:
      'The solved minimum safety factor is below the study\'s declared minSafetyFactor (see error.message for the value, the governing region, and the peak von Mises stress). Add material where the hot spot is, switch to a stronger grade, spread the load over more area, or lower minSafetyFactor if the declared margin was conservative.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance:
        'thicken or rib the geometry at the reported hot-spot region, choose a stronger material grade, or spread the load over more face area',
    },
    defaultSeverity: 'error',
    group: 'fea',
    description:
      'A feaStudy declaring minSafetyFactor solved to a minimum safety factor below that floor: the peak von Mises stress is too close to (or past) the material yield.',
  },
  'fea.mesh.quality-low': {
    hintTemplate:
      'The tetrahedral mesh contains poorly shaped or inverted elements, or CalculiX\'s own nodal stress-error estimate is high, so the stress field should not be trusted as reported (displacement is far less sensitive). Re-run with a smaller meshSize, or simplify slivers and near-zero-width features in the geometry.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'feaStudy.meshSize', factor: 0.5 },
    defaultSeverity: 'warn',
    group: 'fea',
    description:
      'Element-quality statistics (minSICN) or the solver\'s nodal stress-error estimator indicate the FEA stress field is mesh-limited rather than geometry-limited.',
  },
  'fea.solver.unavailable': {
    hintTemplate:
      'The FEA toolchain is not installed on this machine, so no structural evidence could be produced (the result is NOT a pass). Install CalculiX and gmsh — `sudo apt-get install -y calculix-ccx` plus `python3 -m venv .fea-venv && .fea-venv/bin/pip install gmsh==4.15.2` — or point KERNELCAD_CCX / KERNELCAD_FEA_PYTHON at existing installs.',
    nextAction: { kind: 'check-cli-args' },
    defaultSeverity: 'error',
    group: 'fea',
    description:
      'run_fea or a declared feaStudy gate could not run because the external CalculiX (ccx) solver or the gmsh Python module was not found.',
  },
  'fea.study.fixed-unresolved': {
    hintTemplate:
      'The study\'s `fixed` selector matched no face on the built shape, or the matched face did not bind to a meshed surface, so the part would be unconstrained. Call list_faces to see the available faces and refs, then pass a selector that matches one.',
    nextAction: { kind: 'fix-arg', field: 'feaStudy.fixed' },
    defaultSeverity: 'error',
    group: 'fea',
    description:
      'A feaStudy `fixed` face selector resolved to no face (or to a face with no corresponding meshed surface); solving would leave the model unconstrained.',
  },
  'fea.study.load-unresolved': {
    hintTemplate:
      'A study load\'s `faces` selector matched no face on the built shape, or the matched face did not bind to a meshed surface, so the declared force would be applied nowhere and the study would report a false pass. Call list_faces to see the available faces and refs, then pass a selector that matches one.',
    nextAction: { kind: 'fix-arg', field: 'feaStudy.loads[].faces' },
    defaultSeverity: 'error',
    group: 'fea',
    description:
      'A feaStudy load face selector resolved to no face (or to a face with no corresponding meshed surface); the declared force would land on no node.',
  },
} as const satisfies Record<`fea.${string}`, DiagnosticCodeSpec>;
