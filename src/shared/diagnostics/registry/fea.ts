// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const FEA_CODES = {
  // Structural FEA gate (9) — the linear-static study declared by
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
  'fea.safety-factor.unverified': {
    hintTemplate:
      'The evaluate-time gate met the declared minSafetyFactor on a mesh whose stress field is not trusted (see error.message for the reasons), so the margin is unverified, not confirmed. The gate solves once and does not refine. Run verify({ check: \'load-capacity\', mode: \'fea\' }), which refines the mesh automatically, then set the study\'s meshSize to the finest trusted pass in its fea.refinement record so every evaluate gates on a trusted mesh.',
    nextAction: { kind: 'call-tool', tool: 'verify', args: { check: 'load-capacity', mode: 'fea' } },
    defaultSeverity: 'warn',
    group: 'fea',
    description:
      'A feaStudy gate passed its declared minSafetyFactor on an untrusted mesh (mesh-limited stress); the pass is reported as unverified rather than green.',
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
  'fea.mesh.refine-stopped': {
    hintTemplate:
      'Automatic mesh refinement stopped before the stress field was trusted, because the next pass did not fit the element budget (KERNELCAD_FEA_MAX_ELEMENTS) or the wall-time budget (KERNELCAD_FEA_REFINE_TIME_MS), or a finer pass failed (memory or time limit). The result is the finest pass that solved, and the message lists every pass with its peak stress and error estimate. Raise those budgets where you control them, run the study with a local CalculiX + gmsh toolchain that has more memory, or treat the peak stress as mesh-limited and keep a larger safety margin; displacement is reliable.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'fea',
    description:
      'Bounded FEA auto-refinement ran out of element or wall-time budget, or a finer pass failed, before the stress field was trusted; the finest solved pass is reported with its refinement record.',
  },
  'fea.mesh.too-large': {
    hintTemplate:
      'The mesh is too fine for the solver budget: it exceeded the in-loop element ceiling, the gmsh or CalculiX time limit, or CalculiX was killed (memory limit, exit 255). RAISE feaStudy.meshSize (try roughly 2x the current value) and re-run; do not shrink it.',
    nextAction: { kind: 'fix-arg', field: 'feaStudy.meshSize' },
    defaultSeverity: 'error',
    group: 'fea',
    description:
      'The FEA run was aborted because the mesh was too large or too slow for the solver (element ceiling, mesh/solve timeout, or the solver process was killed); a coarser meshSize is needed.',
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
  'fea.stress.support-singularity': {
    hintTemplate:
      'The highest raw stress sits in the support zone next to the edge of a fixed face (within 0.4 x the local wall thickness). A fixed face is clamped rigidly, which makes the stress at its edge singular: that value keeps climbing as the mesh is refined, and real bolt or washer clamping spreads it, so it is not a prediction. The safety factor uses the field away from the supports (summary.maxVonMisesMPa); the clamp-edge value is kept as summary.peakAtSupportMPa. If the support region itself is the concern, model the bolt head or washer contact as a load face and fix the far side instead.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'fea',
    description:
      'The raw FEA peak lies at a fixed-face (clamp) edge, where the rigid-support idealisation makes stress mesh-dependent; it was reported separately and excluded from the governing safety factor, or, when the support zone covers most of the part, could not be excluded.',
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
