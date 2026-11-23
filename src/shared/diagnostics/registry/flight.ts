// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { DiagnosticCodeSpec } from './types';

export const FLIGHT_CODES = {
  // Rocket flight study (shape/arm.flightStudy, run_flight). Same contract as
  // fea.*: a declared minimum that was never checked is not a pass.
  'flight.stability.below-min': {
    hintTemplate:
      'The static margin (CP aft of CG, in body calibers) is below the study\'s minStabilityCal; see the message for CG, CP and the margin. Move mass forward (nose weight), enlarge or move the fins aft, or lengthen the body. A margin under 1 caliber risks an unstable flight.',
    nextAction: {
      kind: 'rewrite-feature',
      guidance: 'add nose weight, enlarge the fins (span or root chord) or move them aft, or lengthen the airframe',
    },
    defaultSeverity: 'error',
    group: 'flight',
    description: 'The flight study\'s Barrowman static margin is below its declared minStabilityCal.',
  },
  'flight.stability.unresolved': {
    hintTemplate:
      'The centre of pressure or the CG could not be computed, so the stability margin is unknown (NOT a pass). Name the nose and fin parts (aero.nose.part, aero.fins.part with count), or declare their dimensions (aero.refDiameterMm, aero.nose.lengthMm, aero.fins.{rootChordMm, tipChordMm, spanMm, sweepMm, leadingEdgeFromNoseMm}).',
    nextAction: { kind: 'fix-arg', field: 'flightStudy.aero' },
    defaultSeverity: 'error',
    group: 'flight',
    description: 'The flight study could not derive the nose, body or fin dimensions it needs for a Barrowman CP, or the CG.',
  },
  'flight.study.part-unresolved': {
    hintTemplate:
      'A part named in the flight study (motor.part, aero.nose.part, aero.fins.part, recovery[].part or separates) is not a part of the assembly. The message lists the parts that exist; use one of those names.',
    nextAction: { kind: 'fix-arg', field: 'flightStudy' },
    defaultSeverity: 'error',
    group: 'flight',
    description: 'A flight study refers to an assembly part that does not exist.',
  },
  'flight.mass.unavailable': {
    hintTemplate:
      'The flight study has no lowered geometry to take mass and CG from. For arm.flightStudy, return arm.model() (or arm.solvedModel()) from the script; otherwise declare dryMassKg and cgFromNoseMm on the study.',
    nextAction: { kind: 'add-return' },
    defaultSeverity: 'error',
    group: 'flight',
    description: 'No lowered shape or assembly scene was found for the flight study, and no dry mass was declared.',
  },
  'flight.mass.density-defaulted': {
    hintTemplate:
      'One or more parts have no material, density or massKg, so their mass assumes water (1000 kg/m^3). Give each part a material (e.g. { material: \'pla\' }), a density, or a weighed massKg; the flight numbers depend on it.',
    nextAction: { kind: 'fix-arg', field: 'part.material' },
    defaultSeverity: 'warn',
    group: 'flight',
    description: 'A part mass in the flight study fell back to the water density default.',
  },
  'flight.rail.exit-speed-low': {
    hintTemplate:
      'The rocket leaves the rail slower than 15 m/s, where the fins may not yet stabilise it. Use a longer rail, a higher-thrust motor, or a lighter vehicle.',
    nextAction: { kind: 'fix-arg', field: 'flightStudy.launch.railM' },
    defaultSeverity: 'warn',
    group: 'flight',
    description: 'Rail-exit speed below the 15 m/s guideline.',
  },
  'flight.sim.no-liftoff': {
    hintTemplate:
      'The motor never produces more thrust than the vehicle weighs, so the rocket does not leave the pad. Use a stronger motor or a lighter vehicle (aim for a liftoff thrust-to-weight of 5 or more).',
    nextAction: { kind: 'fix-arg', field: 'flightStudy.motor' },
    defaultSeverity: 'error',
    group: 'flight',
    description: 'Thrust never exceeded weight; the simulated vehicle stayed on the pad.',
  },
  'flight.sim.timeout': {
    hintTemplate:
      'The simulation reached maxTimeS before the vehicle landed; the landing time and descent rate are not final. Raise maxTimeS, or check the recovery device (a very large canopy or a long descent from altitude).',
    nextAction: { kind: 'fix-arg', field: 'flightStudy.maxTimeS' },
    defaultSeverity: 'warn',
    group: 'flight',
    description: 'The flight simulation stopped at maxTimeS before landing.',
  },
} as const satisfies Record<string, DiagnosticCodeSpec>;
