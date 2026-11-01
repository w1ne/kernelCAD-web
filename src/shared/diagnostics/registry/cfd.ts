// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const CFD_CODES = {
  // Steady incompressible CFD (run_cfd / shape.cfdStudy), solved by an
  // external OpenFOAM. Same contract as fea.*: a missing solver, a failed
  // mesh or an unconverged solve is reported, never passed silently.
  'cfd.solver.unavailable': {
    hintTemplate:
      'OpenFOAM is not installed on this machine, so no flow evidence was produced (the result is NOT a pass). Install it natively (`sudo apt-get install -y openfoam2406-default` after adding the dl.openfoam.com repository) or pull the slim image `docker pull opencfd/openfoam-run:2406`, or point KERNELCAD_OPENFOAM / KERNELCAD_OPENFOAM_IMAGE at an existing install, then re-run.',
    nextAction: { kind: 'check-cli-args' },
    defaultSeverity: 'error',
    group: 'cfd',
    description:
      'run_cfd could not run because no OpenFOAM install (native utilities, an openfoamNNNN wrapper, or a local opencfd Docker image) was found.',
  },
  'cfd.study.patch-unresolved': {
    hintTemplate:
      'The inlet or outlet selector matched no face of the FLUID volume (for interior flow that is the channel, not the part wall), or two patches claimed the same face. The message lists the fluid faces with their centres and areas; pick a FaceQuery such as { atX: 0 } that names the opening.',
    nextAction: { kind: 'fix-arg', field: 'cfdStudy.inlet' },
    defaultSeverity: 'error',
    group: 'cfd',
    description: 'A cfdStudy inlet/outlet selector resolved to no face of the fluid volume, or to a face already claimed by another patch.',
  },
  'cfd.domain.no-fluid': {
    hintTemplate:
      "Interior flow found no channel: the bounding box minus the part left only exterior regions. Make the channel ends open flush onto the part's bounding box (pipe ends, manifold ports), or model the fluid volume itself and pass fluidVolume: 'solid'.",
    nextAction: { kind: 'fix-arg', field: 'cfdStudy.fluidVolume' },
    defaultSeverity: 'error',
    group: 'cfd',
    description: 'Internal-flow fluid extraction found no enclosed channel in the part.',
  },
  'cfd.mesh.failed': {
    hintTemplate:
      'The CFD mesh could not be built (blockMesh / snappyHexMesh failed, produced no cells, the fluid leaked into the background box, or no point inside the fluid had clearance from the walls). The message names the stage and its log; usually lower meshSize so the narrowest channel spans several cells, or check that the fluid volume is closed.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'cfdStudy.meshSize', factor: 0.7 },
    defaultSeverity: 'error',
    group: 'cfd',
    description: 'Meshing the fluid domain for OpenFOAM failed or produced an unusable mesh.',
  },
  'cfd.mesh.quality-low': {
    hintTemplate:
      'checkMesh reported failed quality checks (see the message for non-orthogonality / skewness). The solve ran, but treat the numbers with caution; a smaller meshSize or simpler geometry near sharp edges usually clears it.',
    nextAction: { kind: 'retry-with-smaller-param', param: 'cfdStudy.meshSize', factor: 0.7 },
    defaultSeverity: 'warn',
    group: 'cfd',
    description: 'OpenFOAM checkMesh flagged the snapped mesh with failed quality checks.',
  },
  'cfd.solve.not-converged': {
    hintTemplate:
      'The steady solve stopped before converging (residuals above the target, or the pressure drop / drag still drifting). The numbers are provisional, not evidence. Raise iterations, or loosen residualTarget if the monitored quantity is already stable.',
    nextAction: { kind: 'fix-arg', field: 'cfdStudy.iterations' },
    defaultSeverity: 'warn',
    group: 'cfd',
    description: 'simpleFoam reached its iteration cap without meeting the residual target or with the monitored quantity still changing.',
  },
  'cfd.solve.diverged': {
    hintTemplate:
      'The solve diverged (NaN, floating point exception or residuals above 1), so there is no result. Check the inlet speed and fluid properties are in SI units (m/s, kg/m^3, m^2/s), use a finer meshSize, or force turbulence: \'laminar\' for a low-Reynolds case.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'error',
    group: 'cfd',
    description: 'The OpenFOAM simpleFoam run diverged or crashed.',
  },
  'cfd.solve.timeout': {
    hintTemplate:
      'A CFD stage exceeded its wall-clock budget and was killed. Use a coarser meshSize or fewer iterations, or raise mesh_timeout_ms / solve_timeout_ms. A killed run is not cached, so re-calling with the same inputs starts it again.',
    nextAction: { kind: 'fix-arg', field: 'cfdStudy.meshSize' },
    defaultSeverity: 'error',
    group: 'cfd',
    description: 'blockMesh, snappyHexMesh or simpleFoam ran past its time limit.',
  },
  'cfd.flow.regime-caveat': {
    hintTemplate:
      'The Reynolds number puts this flow where the chosen model is approximate (transitional pipe flow, an unsteady bluff-body wake, steady RANS drag, or a turbulence choice that contradicts Re). Read the numbers as an estimate with the stated uncertainty.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'info',
    group: 'cfd',
    description: 'The flow regime implied by the Reynolds number limits the accuracy of the steady solve.',
  },
  'cfd.mass-balance.off': {
    hintTemplate:
      'Inflow and outflow mass rates differ by more than 1%, so the solution is not mass-conserved yet. Run more iterations or a finer mesh before using the pressure drop.',
    nextAction: { kind: 'inspect-message' },
    defaultSeverity: 'warn',
    group: 'cfd',
    description: 'The solved mass flow through inlets and outlets does not balance within 1%.',
  },
} as const satisfies Record<`cfd.${string}`, DiagnosticCodeSpec>;
